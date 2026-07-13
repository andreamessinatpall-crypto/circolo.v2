import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Livello } from '@/features/profilo/livelloGioco/domande'
import { dataDa } from '@/features/prenotazioni/orari'

const SPORT_LABEL: Record<Sport, string> = { padel: 'Padel', calcio: 'Calcio' }

// L'annuncio smette di valere mezz'ora prima dell'inizio della partita
// proposta, non più a un tempo fisso dalla pubblicazione (il default a 48h
// in tappa50-richieste-partner.sql resta solo come fallback lato DB).
function scadeIlDa(giorno: string, oraInizio: string): string {
  const inizio = dataDa(giorno, oraInizio)
  return new Date(inizio.getTime() - 30 * 60 * 1000).toISOString()
}

export type Sport = 'padel' | 'calcio'
export type StatoCandidatura = 'in_attesa' | 'accettato' | 'rifiutato'

export interface RichiestaPartner {
  id: number
  socio_id: string
  sport: Sport
  livello: Livello | null
  giocatori_mancanti: number | null
  giorno: string
  ora_inizio: string
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
  foto_url?: string | null
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
      ora_inizio: string
    }) => {
      if (!profiloId) throw new Error('Utente non autenticato')
      const { error } = await supabase.from('richieste_partner').insert({
        socio_id: profiloId,
        ...dati,
        scade_il: scadeIlDa(dati.giorno, dati.ora_inizio),
      })
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  const aggiorna = useMutation({
    mutationFn: async ({
      id,
      dati,
    }: {
      id: number
      dati: {
        sport: Sport
        livello: Livello | null
        giocatori_mancanti: number | null
        giorno: string
        ora_inizio: string
      }
    }) => {
      const { error } = await supabase
        .from('richieste_partner')
        .update({ ...dati, scade_il: scadeIlDa(dati.giorno, dati.ora_inizio) })
        .eq('id', id)
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
    mutationFn: async ({ richiesta, nomeCandidato }: { richiesta: RichiestaPartner; nomeCandidato: string }) => {
      if (!profiloId) throw new Error('Utente non autenticato')
      const { error } = await supabase
        .from('candidature_partner')
        .insert({ richiesta_id: richiesta.id, socio_id: profiloId })
      if (error) throw error

      supabase.functions
        .invoke('invia-push', {
          body: {
            socio_id: richiesta.socio_id,
            titolo: 'Hanno risposto alla tua richiesta',
            corpo: `${nomeCandidato} ha risposto alla tua richiesta di ${SPORT_LABEL[richiesta.sport]}.`,
            url: '/profilo/cerco-giocatori',
          },
        })
        .catch(() => {})
    },
    onSuccess: ricarica,
  })

  // Padel: "Rispondi" apre subito la chat (nessuna candidatura da tracciare,
  // vedi commento in tappa50-richieste-partner.sql), ma chi ha pubblicato la
  // richiesta deve comunque essere avvisato che qualcuno ha risposto.
  const notificaRisposta = useMutation({
    mutationFn: async ({ richiesta, nomeRisponditore }: { richiesta: RichiestaPartner; nomeRisponditore: string }) => {
      await supabase.functions
        .invoke('invia-push', {
          body: {
            socio_id: richiesta.socio_id,
            titolo: 'Hanno risposto alla tua richiesta',
            corpo: `${nomeRisponditore} ha risposto alla tua richiesta di ${SPORT_LABEL[richiesta.sport]}.`,
            url: '/profilo/cerco-giocatori',
          },
        })
        .catch(() => {})
    },
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
  const fotoById = new Map(sociQuery.data?.map((s) => [s.id, s.foto_url ?? null]))

  return {
    richieste: richiesteQuery.data ?? [],
    candidature: candidatureQuery.data ?? [],
    sociById,
    fotoById,
    caricamento: richiesteQuery.isLoading || sociQuery.isLoading,
    errore: richiesteQuery.error,
    crea,
    aggiorna,
    elimina,
    candidati,
    rispondiCandidatura,
    notificaRisposta,
  }
}
