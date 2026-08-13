import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import SchermataCaricamento from '@/components/SchermataCaricamento'
import { classiErrore } from '@/components/stili'
import { CircoloContext } from './CircoloContext'
import { applicaTemaCircolo } from './temaCircolo'
import { aggiornaUltimoAccesso } from './datiCircoloSocio'
import OnboardingGestore from '@/features/onboarding/OnboardingGestore'
import type { Circolo, RuoloCircolo } from '@/features/piattaforma/tipi'

// Risolve lo slug nell'URL (/c/:slug/...) nel circolo corrente E il ruolo
// del socio in QUEL circolo (soci_circoli, non il vecchio is_admin globale
// su `soci` — un socio può essere gestore in un circolo e socio semplice in
// un altro), esponendo entrambi in context a tutto l'albero sotto AppShell.
// Applica anche il tema colore del circolo (vedi temaCircolo.ts).
export default function CircoloProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>()
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const [saltato, setSaltato] = useState(false)

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

  // Traccia "ultimo circolo visitato" per il carosello di scelta dopo il
  // login (vedi SceltaCircoloPage.tsx). Fire-and-forget: un socio senza riga
  // in soci_circoli (es. super-admin di passaggio) semplicemente non
  // aggiorna nulla, nessun errore.
  useEffect(() => {
    if (circolo?.id && profilo?.id) aggiornaUltimoAccesso(circolo.id, profilo.id)
  }, [circolo?.id, profilo?.id])

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

  const ruolo = ruoloInfo?.ruolo ?? 'socio'

  // Un circolo appena creato nasce non attivo (vedi creaCircolo in
  // datiPiattaforma.ts): lo diventa solo quando il suo gestore completa il
  // questionario di primo accesso. Il super-admin non entra mai in un
  // circolo come membro (non può esserlo, vedi migrazione
  // mt14-superadmin-puro.sql), quindi non serve un'esenzione qui: gestisce
  // circoli/giocatori dal pannello dedicato /admin.
  if (!circolo.attivo) {
    if (ruolo !== 'gestore') {
      return (
        <div className="mx-auto max-w-md p-6 text-center">
          <p className="text-ink-2">
            Il circolo "{circolo.nome}" è ancora in fase di configurazione da parte del gestore. Riprova più tardi.
          </p>
        </div>
      )
    }
    if (!saltato) {
      return (
        <OnboardingGestore
          circolo={circolo}
          onSaltaPerOra={() => setSaltato(true)}
          onCompletato={() => qc.invalidateQueries({ queryKey: ['circolo', slug] })}
        />
      )
    }
  }

  return (
    <CircoloContext.Provider
      value={{ circolo, ruolo, puoDareLezioni: ruoloInfo?.puoDareLezioni ?? false }}
    >
      {children}
    </CircoloContext.Provider>
  )
}
