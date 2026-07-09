import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Preferenze, Sport } from './domande'

// Preferenze del giocatore per sport (padel/calcio indipendenti, come
// livelloGioco/useLivelliGioco.ts), impostabili solo rifacendo il
// questionario in QuestionarioPreferenze.tsx.
export function usePreferenzeGiocatore(socioId: string | undefined, sport: Sport) {
  const qc = useQueryClient()
  const queryKey = ['preferenze_giocatore', socioId, sport]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preferenze_giocatore')
        .select('mano_piede_preferito, posizione, orario_preferito, giorni_preferiti')
        .eq('sport', sport)
        .maybeSingle()
      if (error) throw error
      return data as Preferenze | null
    },
    enabled: !!socioId,
  })

  const salva = useMutation({
    mutationFn: async (pref: Preferenze) => {
      if (!socioId) throw new Error('Utente non autenticato')
      const { error } = await supabase
        .from('preferenze_giocatore')
        .upsert(
          { socio_id: socioId, sport, ...pref, aggiornato_il: new Date().toISOString() },
          { onConflict: 'socio_id,sport' },
        )
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }) },
  })

  return {
    attuale: query.data ?? null,
    caricamento: query.isLoading,
    errore: query.error,
    salva,
  }
}
