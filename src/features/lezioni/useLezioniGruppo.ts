import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MiaPrenotazione, Partecipante } from '@/features/prenotazioni/datiAmichevoli'

// Le lezioni di gruppo future (tappa91): stessa forma di useMieLezioni, ma
// non filtrate per istruttore — servono alla card di Area Club, visibile a
// chiunque voglia iscriversi, non solo a chi le tiene.
export function useLezioniGruppoFuture() {
  return useQuery({
    queryKey: ['lezioni_gruppo'],
    queryFn: async () => {
      const adesso = new Date().toISOString()
      const { data: pren, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .eq('lezione_gruppo', true)
        .gte('fine', adesso)
        .order('inizio', { ascending: true })
      if (error) throw error
      const lista = (pren ?? []) as MiaPrenotazione[]

      const ids = lista.map((p) => p.id)
      let parts: Partecipante[] = []
      if (ids.length) {
        const { data, error: errP } = await supabase
          .from('partecipanti_amichevole')
          .select('*')
          .in('prenotazione_id', ids)
        if (errP) throw errP
        parts = (data ?? []) as Partecipante[]
      }
      return { lista, parts }
    },
  })
}

// Iscrizione/disiscrizione da soli (policy dedicate, tappa91): invalidano sia
// la card di Area Club sia — se chi agisce è anche l'istruttore che la tiene
// — l'elenco "Le tue lezioni", dove l'iscritto in più/meno deve comparire.
function invalidaLezioniGruppo(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['lezioni_gruppo'] })
  qc.invalidateQueries({ queryKey: ['lezioni'] })
}

// `nomeSocio` serve solo per il testo della notifica push all'istruttore
// (vedi sotto): niente a che fare con l'autorizzazione, che resta la RLS.
export function useIscrivitiLezioneGruppo(profiloId: string | undefined, nomeSocio: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dati: {
      prenotazioneId: number | string
      istruttoreId: string | null
      quando: string
    }) => {
      if (!profiloId) throw new Error('Utente non autenticato')
      const { error } = await supabase.from('partecipanti_amichevole').insert({
        prenotazione_id: dati.prenotazioneId,
        socio_id: profiloId,
        confermato: false,
      })
      if (error) throw error

      // L'istruttore non vede da solo le nuove iscrizioni (a differenza delle
      // richieste di lezione private, qui non c'è nulla da accettare): una
      // notifica push lo avvisa comunque, stesso pattern di
      // useInviaRichiestaLezione in useRichiesteLezione.ts.
      if (dati.istruttoreId) {
        supabase.functions
          .invoke('invia-push', {
            body: {
              socio_id: dati.istruttoreId,
              titolo: 'Nuova iscrizione alla lezione di gruppo',
              corpo: `${nomeSocio ?? 'Un giocatore'} si è iscritto alla lezione di gruppo del ${dati.quando}.`,
              url: '/profilo/gestione-lezioni',
            },
          })
          .catch(() => {})
      }
    },
    onSuccess: () => invalidaLezioniGruppo(qc),
  })
}

export function useAnnullaIscrizioneLezioneGruppo(profiloId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (prenotazioneId: number | string) => {
      if (!profiloId) throw new Error('Utente non autenticato')
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .delete()
        .eq('prenotazione_id', prenotazioneId)
        .eq('socio_id', profiloId)
      if (error) throw error
    },
    onSuccess: () => invalidaLezioniGruppo(qc),
  })
}

// Creazione (lato istruttore): stessa policy INSERT di un socio che prenota
// per sé ("I soci attivi prenotano per sé", socio_id = auth.uid()) — qui
// valorizziamo anche allenamento/allenatore_id/lezione_gruppo nella stessa
// riga, permesso dalla policy perché non vincola quelle colonne.
export function useCreaLezioneGruppo(istruttoreId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dati: { campoId: number | string; inizio: string; fine: string }) => {
      if (!istruttoreId) throw new Error('Utente non autenticato')
      const { error } = await supabase.from('prenotazioni').insert({
        campo_id: Number(dati.campoId),
        socio_id: istruttoreId,
        allenatore_id: istruttoreId,
        allenamento: true,
        lezione_gruppo: true,
        inizio: dati.inizio,
        fine: dati.fine,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lezioni', istruttoreId] })
      qc.invalidateQueries({ queryKey: ['lezioni_gruppo'] })
    },
  })
}
