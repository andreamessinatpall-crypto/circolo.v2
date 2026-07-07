import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fase 10 — Bacheca annunci del circolo. Tabella `annunci` (tappa72):
// lettura per tutti i soci, scrittura riservata all'admin/segreteria (RLS).

export interface Annuncio {
  id: string
  titolo: string
  testo: string
  autore_id: string
  creato_il: string
}

export function useAnnunci() {
  return useQuery({
    queryKey: ['annunci'],
    queryFn: async (): Promise<Annuncio[]> => {
      const { data, error } = await supabase
        .from('annunci')
        .select('*')
        .order('creato_il', { ascending: false })
      if (error) throw error
      return (data ?? []) as Annuncio[]
    },
  })
}

export async function creaAnnuncio(p: { titolo: string; testo: string; autore_id: string }): Promise<void> {
  const { error } = await supabase.from('annunci').insert(p)
  if (error) throw error
}

export async function salvaAnnuncio(id: string, patch: { titolo: string; testo: string }): Promise<void> {
  const { error } = await supabase.from('annunci').update(patch).eq('id', id)
  if (error) throw error
}

export async function eliminaAnnuncio(id: string): Promise<void> {
  const { error } = await supabase.from('annunci').delete().eq('id', id)
  if (error) throw error
}
