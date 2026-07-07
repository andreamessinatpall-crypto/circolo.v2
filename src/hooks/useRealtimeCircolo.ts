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
        inval(['prenotazioni', 'amichevoli', 'lezioni', 'attivita-programma', 'impegni_istruttore', 'riepilogo-stat', 'tornei_amici_dettaglio']),
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
        () => inval(['amichevoli', 'lezioni', 'attivita-programma', 'riepilogo-stat']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amicizie' }, () =>
        inval(['amicizie']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messaggi_chat' }, () =>
        inval(['messaggi_chat']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste_partner' }, () =>
        inval(['richieste_partner']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidature_partner' }, () =>
        inval(['candidature_partner']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste_lezione' }, () =>
        inval(['richieste_lezione_ricevute', 'richieste_lezione_inviate', 'impegni_istruttore', 'riepilogo-stat']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilita_maestri' }, () =>
        inval(['disponibilita_maestri']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tornei_amici' }, () =>
        inval(['tornei_amici', 'tornei_amici_dettaglio']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tornei_amici_partecipanti' }, () =>
        inval(['tornei_amici', 'tornei_amici_dettaglio']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tornei_amici_squadre' }, () =>
        inval(['tornei_amici_dettaglio']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tornei_amici_incontri' }, () =>
        inval(['tornei_amici_dettaglio']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annunci' }, () =>
        inval(['annunci']),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canale)
    }
  }, [qc])
}
