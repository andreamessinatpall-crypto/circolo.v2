import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Inserisce/aggiorna il risultato di una partita amichevole semplice (non un
// incontro di torneo, che ha già il proprio editor punteggio). La funzione
// RPC controlla lato server che chi chiama abbia davvero giocato quella
// partita (partecipante o prenotante) prima di scrivere.
export function useImpostaRisultato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ prenotazioneId, risultato }: { prenotazioneId: string; risultato: string }) => {
      const { error } = await supabase.rpc('imposta_risultato_prenotazione', {
        p_prenotazione_id: prenotazioneId,
        p_risultato: risultato,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partite-concluse'] })
      qc.invalidateQueries({ queryKey: ['storico-partite'] })
    },
  })
}
