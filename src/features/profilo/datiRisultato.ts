import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Dettaglio strutturato (squadre + set), per renderizzare il risultato con
// lo stesso stile "nome vs nome" dei tornei — il testo in `risultato` resta
// come riassunto leggibile per lo Storico attività, che non ha bisogno del
// dettaglio.
export interface DettaglioRisultato {
  squadraCasa: string[]
  squadraOspite: string[]
  puntiCasa: number
  puntiOspite: number
  set?: { casa: number; ospite: number }[]
}

// Inserisce/aggiorna il risultato di una partita amichevole semplice (non un
// incontro di torneo, che ha già il proprio editor punteggio). La funzione
// RPC controlla lato server che chi chiama abbia davvero giocato quella
// partita (partecipante o prenotante) prima di scrivere.
export function useImpostaRisultato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      prenotazioneId,
      risultato,
      dettaglio,
    }: {
      prenotazioneId: string
      risultato: string
      dettaglio: DettaglioRisultato
    }) => {
      const { error } = await supabase.rpc('imposta_risultato_prenotazione', {
        p_prenotazione_id: prenotazioneId,
        p_risultato: risultato,
        p_dettaglio: dettaglio,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partite-concluse'] })
      qc.invalidateQueries({ queryKey: ['storico-partite'] })
    },
  })
}
