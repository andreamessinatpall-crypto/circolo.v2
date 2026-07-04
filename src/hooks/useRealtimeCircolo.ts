import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Un solo canale realtime per tutta l'app (come la v1): quando cambia una
// tabella, invalido le query collegate e le viste visibili si aggiornano.
export function useRealtimeCircolo() {
  const qc = useQueryClient()

  useEffect(() => {
    const inval = (chiavi: string[]) =>
      chiavi.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))

    const canale = supabase
      .channel('aggiornamenti-circolo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prenotazioni' }, () =>
        inval(['prenotazioni', 'amichevoli', 'lezioni', 'attivita-programma']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campi' }, () =>
        inval(['campi']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impostazioni' }, () =>
        inval(['impostazioni']),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partecipanti_amichevole' },
        () => inval(['amichevoli', 'lezioni', 'attivita-programma']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amicizie' }, () =>
        inval(['amicizie']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messaggi_chat' }, () =>
        inval(['messaggi_chat']),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canale)
    }
  }, [qc])
}
