import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Si iscrive ai cambiamenti di prenotazioni/campi/impostazioni e invalida le
// query corrispondenti, così la griglia si aggiorna da sola (come la v1).
export function useRealtimePrenotazioni() {
  const qc = useQueryClient()

  useEffect(() => {
    const aggiorna = () => {
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
      qc.invalidateQueries({ queryKey: ['campi'] })
      qc.invalidateQueries({ queryKey: ['impostazioni'] })
    }
    const canale = supabase
      .channel('rt-prenotazioni')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prenotazioni' }, aggiorna)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campi' }, aggiorna)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impostazioni' }, aggiorna)
      .subscribe()

    return () => {
      supabase.removeChannel(canale)
    }
  }, [qc])
}
