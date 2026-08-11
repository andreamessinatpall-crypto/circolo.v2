import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import SchermataCaricamento from '@/components/SchermataCaricamento'
import { classiErrore } from '@/components/stili'
import { CircoloContext } from './CircoloContext'
import { applicaTemaCircolo } from './temaCircolo'
import type { Circolo, RuoloCircolo } from '@/features/piattaforma/tipi'

// Risolve lo slug nell'URL (/c/:slug/...) nel circolo corrente E il ruolo
// del socio in QUEL circolo (soci_circoli, non il vecchio is_admin globale
// su `soci` — un socio può essere gestore in un circolo e socio semplice in
// un altro), esponendo entrambi in context a tutto l'albero sotto AppShell.
// Applica anche il tema colore del circolo (vedi temaCircolo.ts).
export default function CircoloProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>()
  const { profilo } = useAuth()

  const { data: circolo, isLoading: caricoCircolo, error: erroreCircolo } = useQuery({
    queryKey: ['circolo', slug],
    queryFn: async (): Promise<Circolo | null> => {
      const { data, error } = await supabase
        .from('circoli')
        .select('*')
        .eq('slug', slug as string)
        .maybeSingle()
      if (error) throw error
      return data as Circolo | null
    },
    enabled: !!slug,
  })

  const { data: ruoloInfo, isLoading: caricoRuolo, error: erroreRuolo } = useQuery({
    queryKey: ['mio-ruolo', circolo?.id, profilo?.id],
    enabled: !!circolo && !!profilo,
    queryFn: async (): Promise<{ ruolo: RuoloCircolo; puoDareLezioni: boolean }> => {
      if (profilo!.is_super_admin) return { ruolo: 'gestore', puoDareLezioni: true }
      const { data, error } = await supabase
        .from('soci_circoli')
        .select('ruolo, puo_dare_lezioni')
        .eq('circolo_id', circolo!.id)
        .eq('socio_id', profilo!.id)
        .maybeSingle()
      if (error) throw error
      if (!data) return { ruolo: 'socio', puoDareLezioni: false }
      return { ruolo: data.ruolo as RuoloCircolo, puoDareLezioni: !!data.puo_dare_lezioni }
    },
  })

  useEffect(() => {
    applicaTemaCircolo(circolo?.colore_primario)
    return () => applicaTemaCircolo(null)
  }, [circolo?.colore_primario])

  if (caricoCircolo || caricoRuolo) return <SchermataCaricamento />

  if (erroreCircolo || erroreRuolo) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className={classiErrore}>
          Impossibile caricare il circolo: {(erroreCircolo ?? erroreRuolo)?.message}
        </p>
      </div>
    )
  }

  if (!circolo) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className={classiErrore}>Il circolo "{slug}" non esiste o non è più attivo.</p>
      </div>
    )
  }

  return (
    <CircoloContext.Provider
      value={{ circolo, ruolo: ruoloInfo?.ruolo ?? 'socio', puoDareLezioni: ruoloInfo?.puoDareLezioni ?? false }}
    >
      {children}
    </CircoloContext.Provider>
  )
}
