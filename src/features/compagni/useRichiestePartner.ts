import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Livello } from '@/features/profilo/livelloGioco/domande'

export type Sport = 'padel' | 'calcio'
export type FasciaOraria = 'mattina' | 'pomeriggio' | 'sera'
export type StatoCandidatura = 'in_attesa' | 'accettato' | 'rifiutato'

export interface RichiestaPartner {
  id: number
  socio_id: string
  sport: Sport
  livello: Livello | null
  giocatori_mancanti: number | null
  giorno: string
  fascia_oraria: FasciaOraria
  creato_il: string
  scade_il: string
}

export interface CandidaturaPartner {
  id: number
  richiesta_id: number
  socio_id: string
  stato: StatoCandidatura
  creato_il: string
}

interface SocioPubblico {
  id: string
  etichetta: string
}

// Bacheca "Cerco compagno" (Fase 3). Padel: richiesta con livello, rispondere
// apre una chat diretta (nessuna riga da tracciare). Calcio: l'organizzatore
// segna quanti giocatori mancano, indistintamente dal livello; chi è
// interessato si candida e l'organizzatore accetta/rifiuta.
export function useRichiestePartner(profiloId: string | undefined) {
  const qc = useQueryClient()

  const richiesteQuery = useQuery({
    queryKey: ['richieste_partner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('richieste_partner')
        .select('*')
        .gt('scade_il', new Date().toISOString())
        .order('creato_il', { ascending: false })
      if (error) throw error
      return (data ?? []) as RichiestaPartner[]
    },
  })

  const candidatureQuery = useQuery({
    queryKey: ['candidature_partner'],
    queryFn: async () => {
      const { data, error } = await supabase.from('candidature_partner').select('*')
      if (error) throw error
      return (data ?? []) as CandidaturaPartner[]
    },
    enabled: !!profiloId,
  })

  const sociQuery = useQuery({
    queryKey: ['soci_pubblici'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('soci_pubblici')
      if (error) throw error
      return (data ?? []) as SocioPubblico[]
    },
  })

  // Aggiornamento realtime: canale condiviso in useRealtimeCircolo.ts (non uno
  // dedicato qui, per non ripetere il crash da doppia sottoscrizione già
  // visto in Fase 2 quando questo hook viene chiamato da più componenti).
  const ricarica = () => {
    qc.invalidateQueries({ queryKey: ['richieste_partner'] })
    qc.invalidateQueries({ queryKey: ['candidature_partner'] })
  }

  const crea = useMutation({
    mutationFn: async (dati: {
      sport: Sport
      livello: Livello | null
      giocatori_mancanti: number | null
      giorno: string
      fascia_oraria: FasciaOraria
    }) => {
      if (!profiloId) throw new Error('Utente non autenticato')
      const { error } = await supabase.from('richieste_partner').insert({ socio_id: profiloId, ...dati })
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  const elimina = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('richieste_partner').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  const candidati = useMutation({
    mutationFn: async (richiesta: RichiestaPartner) => {
      if (!profiloId) throw new Error('Utente non autenticato')
      const { error } = await supabase
        .from('candidature_partner')
        .insert({ richiesta_id: richiesta.id, socio_id: profiloId })
      if (error) throw error

      supabase.functions
        .invoke('invia-push', {
          body: {
            socio_id: richiesta.socio_id,
            titolo: 'Nuovo candidato',
            corpo: 'Qualcuno si è candidato per la tua ricerca giocatori di calcio.',
            url: '/profilo?sezione=club',
          },
        })
        .catch(() => {})
    },
    onSuccess: ricarica,
  })

  const rispondiCandidatura = useMutation({
    mutationFn: async ({
      candidatura,
      stato,
    }: {
      candidatura: CandidaturaPartner
      stato: 'accettato' | 'rifiutato'
    }) => {
      const { error } = await supabase.from('candidature_partner').update({ stato }).eq('id', candidatura.id)
      if (error) throw error

      supabase.functions
        .invoke('invia-push', {
          body: {
            socio_id: candidatura.socio_id,
            titolo: stato === 'accettato' ? 'Candidatura accettata' : 'Candidatura rifiutata',
            corpo:
              stato === 'accettato'
                ? 'Sei stato accettato per la partita di calcio!'
                : 'La tua candidatura non è stata accettata questa volta.',
            url: '/profilo?sezione=club',
          },
        })
        .catch(() => {})
    },
    onSuccess: ricarica,
  })

  const sociById = new Map(sociQuery.data?.map((s) => [s.id, s.etichetta]))

  return {
    richieste: richiesteQuery.data ?? [],
    candidature: candidatureQuery.data ?? [],
    sociById,
    caricamento: richiesteQuery.isLoading || sociQuery.isLoading,
    errore: richiesteQuery.error,
    crea,
    elimina,
    candidati,
    rispondiCandidatura,
  }
}
