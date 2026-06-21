import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { titleCase } from '@/lib/formato'

export interface SocioPubblico {
  id: string
  etichetta: string
}

export interface Amicizia {
  id: string
  richiedente: string
  destinatario: string
  stato: string
}

export interface VoceAmico {
  id: string
  etichetta: string
  rec: Amicizia
}

// Raccoglie tutta la logica degli amici: carica i soci pubblici e le amicizie,
// li suddivide (amici / richieste ricevute / richieste inviate) e offre le
// azioni (invia, accetta, rimuovi). Usa TanStack Query per dati e ricariche.
export function useAmici(profiloId: string) {
  const qc = useQueryClient()

  const sociQuery = useQuery({
    queryKey: ['soci_pubblici'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('soci_pubblici')
      if (error) throw error
      return (data ?? []) as SocioPubblico[]
    },
  })

  const amicizieQuery = useQuery({
    queryKey: ['amicizie'],
    queryFn: async () => {
      const { data, error } = await supabase.from('amicizie').select('*')
      if (error) throw error
      return (data ?? []) as Amicizia[]
    },
  })

  // mappa id socio -> etichetta (nome leggibile)
  const etichette = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of sociQuery.data ?? []) m[s.id] = titleCase(s.etichetta)
    return m
  }, [sociQuery.data])

  const gruppi = useMemo(() => {
    const amici: VoceAmico[] = []
    const ricevute: VoceAmico[] = []
    const inviate: VoceAmico[] = []
    for (const a of amicizieQuery.data ?? []) {
      const altro = a.richiedente === profiloId ? a.destinatario : a.richiedente
      const voce: VoceAmico = { id: altro, etichetta: etichette[altro] ?? 'Giocatore', rec: a }
      if (a.stato === 'accettata') amici.push(voce)
      else if (a.destinatario === profiloId) ricevute.push(voce)
      else inviate.push(voce)
    }
    amici.sort((x, y) => x.etichetta.localeCompare(y.etichetta, 'it'))
    return { amici, ricevute, inviate }
  }, [amicizieQuery.data, etichette, profiloId])

  const ricarica = () => qc.invalidateQueries({ queryKey: ['amicizie'] })

  const invia = useMutation({
    mutationFn: async (destinatario: string) => {
      const { error } = await supabase
        .from('amicizie')
        .insert({ richiedente: profiloId, destinatario, stato: 'in_attesa' })
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  const accetta = useMutation({
    mutationFn: async (rec: Amicizia) => {
      const { error } = await supabase
        .from('amicizie')
        .update({ stato: 'accettata', aggiornata_il: new Date().toISOString() })
        .eq('id', rec.id)
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  const rimuovi = useMutation({
    mutationFn: async (rec: Amicizia) => {
      const { error } = await supabase.from('amicizie').delete().eq('id', rec.id)
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  return {
    sociPubblici: sociQuery.data ?? [],
    caricamento: amicizieQuery.isLoading || sociQuery.isLoading,
    erroreAmicizie: amicizieQuery.error,
    ...gruppi,
    invia,
    accetta,
    rimuovi,
  }
}
