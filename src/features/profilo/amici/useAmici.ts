import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { titleCase } from '@/lib/formato'
import type { Ruolo } from '@/features/profilo/ruoloBadge'

export interface SocioPubblico {
  id: string
  etichetta: string
  e_allenatore: boolean
  is_admin: boolean
  is_allenatore: boolean
  punti: number
  sport_preferito: string | null
  data_iscrizione: string | null
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
  ruolo: Ruolo | null
  punti: number
  sport: string | null
  rec: Amicizia
  nPartite: number
}

export interface VoceStaff {
  id: string
  etichetta: string
  ruolo: Ruolo
  punti: number
  sport: string | null
}

function ruoloDa(s: SocioPubblico): Ruolo | null {
  if (s.is_admin) return 'admin'
  if (s.is_allenatore && !s.is_admin) return 'collaboratore'
  if (s.e_allenatore && !s.is_allenatore && !s.is_admin) return 'istruttore'
  return null
}

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

  const partiteQuery = useQuery({
    queryKey: ['partite_con_amici', profiloId],
    queryFn: async () => {
      const { data } = await supabase.rpc('partite_con_amici', { p_me: profiloId })
      return (data ?? []) as { amico_id: string; n_partite: number }[]
    },
  })

  const partiteByAmico = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of partiteQuery.data ?? []) m[r.amico_id] = Number(r.n_partite)
    return m
  }, [partiteQuery.data])

  const sociById = useMemo(() => {
    const m: Record<string, SocioPubblico> = {}
    for (const s of sociQuery.data ?? []) m[s.id] = s
    return m
  }, [sociQuery.data])

  // Collaboratori e istruttori: sempre visibili come staff
  const staff = useMemo<VoceStaff[]>(() => {
    return (sociQuery.data ?? [])
      .filter((s) => (s.is_allenatore || s.e_allenatore) && !s.is_admin && s.id !== profiloId)
      .map((s) => ({
        id: s.id,
        etichetta: titleCase(s.etichetta),
        ruolo: (s.is_allenatore ? 'collaboratore' : 'istruttore') as Ruolo,
        punti: s.punti,
        sport: s.sport_preferito ?? null,
      }))
      .sort((a, b) => a.etichetta.localeCompare(b.etichetta, 'it'))
  }, [sociQuery.data, profiloId])

  const staffIds = useMemo(() => new Set(staff.map((s) => s.id)), [staff])

  const gruppi = useMemo(() => {
    const amici: VoceAmico[] = []
    const ricevute: VoceAmico[] = []
    const inviate: VoceAmico[] = []
    for (const a of amicizieQuery.data ?? []) {
      const altro = a.richiedente === profiloId ? a.destinatario : a.richiedente
      if (staffIds.has(altro)) continue
      const s = sociById[altro]
      // Account cancellato/anonimizzato (o comunque non più in soci_pubblici):
      // l'amicizia resta a livello di dati per storico/FK, ma non va mostrata.
      if (!s) continue
      const voce: VoceAmico = {
        id: altro,
        etichetta: titleCase(s.etichetta),
        ruolo: ruoloDa(s),
        punti: s.punti,
        sport: s.sport_preferito,
        rec: a,
        nPartite: partiteByAmico[altro] ?? 0,
      }
      if (a.stato === 'accettata') amici.push(voce)
      else if (a.destinatario === profiloId) ricevute.push(voce)
      else inviate.push(voce)
    }
    amici.sort((x, y) => x.etichetta.localeCompare(y.etichetta, 'it'))
    return { amici, ricevute, inviate }
  }, [amicizieQuery.data, sociById, profiloId, staffIds, partiteByAmico])

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
    staff,
    staffIds,
    caricamento: amicizieQuery.isLoading || sociQuery.isLoading,
    erroreAmicizie: amicizieQuery.error,
    ...gruppi,
    invia,
    accetta,
    rimuovi,
  }
}
