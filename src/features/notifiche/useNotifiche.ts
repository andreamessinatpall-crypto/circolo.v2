import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Notifica {
  id: number
  titolo: string
  corpo: string | null
  url: string | null
  letta: boolean
  creato_il: string
}

// Cronologia in-app delle notifiche push (tabella "notifiche", scritta dalla
// Edge Function invia-push). Riusabile da qualunque schermata mostri la
// campanella.
export function useNotifiche(socioId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['notifiche'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifiche')
        .select('*')
        .order('creato_il', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as Notifica[]
    },
    enabled: !!socioId,
  })

  const nonLette = (query.data ?? []).filter((n) => !n.letta).length

  const ricarica = () => qc.invalidateQueries({ queryKey: ['notifiche'] })

  // Senza questo canale il pannello resta con i dati del primo caricamento
  // finché non cambia focus/ricarica pagina: la Edge Function inserisce le
  // righe lato server, React Query da solo non se ne accorge.
  useEffect(() => {
    if (!socioId) return
    const canale = supabase
      .channel(`notifiche-${socioId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifiche', filter: `socio_id=eq.${socioId}` },
        () => qc.invalidateQueries({ queryKey: ['notifiche'] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canale)
    }
  }, [socioId, qc])

  const segnaLetta = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('notifiche').update({ letta: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  const segnaTutteLette = useMutation({
    mutationFn: async () => {
      if (!socioId) return
      const { error } = await supabase
        .from('notifiche')
        .update({ letta: true })
        .eq('socio_id', socioId)
        .eq('letta', false)
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  const elimina = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('notifiche').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  return {
    notifiche: query.data ?? [],
    nonLette,
    caricamento: query.isLoading,
    errore: query.error,
    segnaLetta,
    segnaTutteLette,
    elimina,
  }
}
