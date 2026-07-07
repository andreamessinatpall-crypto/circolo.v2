import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Livello } from './domande'

export interface LivelloGioco {
  livello: Livello
  aggiornato_il: string
}

// Livello di gioco (solo padel, Fase 3bis), impostabile solo rifacendo il
// questionario in QuestionarioLivello.tsx.
export function useLivelloGiocoPadel(socioId: string | undefined) {
  const qc = useQueryClient()
  const queryKey = ['livelli_gioco', socioId, 'padel']

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('livelli_gioco')
        .select('livello, aggiornato_il')
        .eq('sport', 'padel')
        .maybeSingle()
      if (error) throw error
      return data as LivelloGioco | null
    },
    enabled: !!socioId,
  })

  const salva = useMutation({
    mutationFn: async (livello: Livello) => {
      if (!socioId) throw new Error('Utente non autenticato')
      const { error } = await supabase
        .from('livelli_gioco')
        .upsert(
          { socio_id: socioId, sport: 'padel', livello, aggiornato_il: new Date().toISOString() },
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
