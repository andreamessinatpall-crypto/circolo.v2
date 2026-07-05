import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Disponibilita {
  id: number
  istruttore_id: string
  giorno_settimana: number | null
  data: string | null
  ora_inizio: string
  ora_fine: string
}

export interface NuovaDisponibilita {
  giorno_settimana: number | null
  data: string | null
  ora_inizio: string
  ora_fine: string
}

// Fasce di disponibilità di un istruttore per lezioni private (Fase 4).
// Sola aggiunta/rimozione, nessuna modifica diretta.
export function useDisponibilita(istruttoreId: string | undefined) {
  const qc = useQueryClient()
  const queryKey = ['disponibilita_maestri', istruttoreId]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disponibilita_maestri')
        .select('*')
        .eq('istruttore_id', istruttoreId)
        .order('giorno_settimana', { ascending: true, nullsFirst: false })
        .order('data', { ascending: true })
        .order('ora_inizio', { ascending: true })
      if (error) throw error
      return (data ?? []) as Disponibilita[]
    },
    enabled: !!istruttoreId,
  })

  const ricarica = () => qc.invalidateQueries({ queryKey })

  const aggiungi = useMutation({
    mutationFn: async (nuova: NuovaDisponibilita) => {
      if (!istruttoreId) throw new Error('Utente non autenticato')
      const { error } = await supabase
        .from('disponibilita_maestri')
        .insert({ istruttore_id: istruttoreId, ...nuova })
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  const rimuovi = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('disponibilita_maestri').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  return {
    fasce: query.data ?? [],
    caricamento: query.isLoading,
    errore: query.error,
    aggiungi,
    rimuovi,
  }
}
