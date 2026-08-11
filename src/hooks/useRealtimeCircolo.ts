import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCircolo } from '@/circolo/useCircolo'

// Un solo canale realtime per tutta l'app (come la v1): quando cambia una
// tabella, invalido le query collegate e le viste visibili si aggiornano.
//
// Multi-tenant: sulle tabelle che hanno una colonna circolo_id diretta,
// filtriamo lato server (`filter: circolo_id=eq...`) così un socio non
// riceve più eventi per i cambi in ALTRI circoli — non è un problema di
// sicurezza (le RLS già impediscono la lettura dei dati altrui), ma senza
// filtro ogni utente ricaricherebbe le sue query anche per cambi che non lo
// riguardano affatto, una volta che esistono più circoli attivi. Le tabelle
// "figlie" senza circolo_id proprio (partecipanti_amichevole, amicizie,
// messaggi_chat, tornei_amici_*) restano senza filtro: il volume è basso e
// filtrarle richiederebbe un join che postgres_changes non supporta.
//
// Va chiamato solo dentro <CircoloProvider> (cioè dentro AppShell): usa il
// circolo corrente risolto dallo slug nell'URL, non più un ID fisso.
export function useRealtimeCircolo() {
  const qc = useQueryClient()
  const circolo = useCircolo()

  useEffect(() => {
    const inval = (chiavi: string[]) =>
      chiavi.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))

    const perCircolo = `circolo_id=eq.${circolo.id}`

    const canale = supabase
      .channel('aggiornamenti-circolo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prenotazioni', filter: perCircolo }, () =>
        inval(['prenotazioni', 'pren-admin', 'amichevoli', 'lezioni', 'attivita-programma', 'impegni_istruttore', 'riepilogo-stat', 'tornei_amici_dettaglio', 'partite-concluse', 'storico-partite']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campi', filter: perCircolo }, () =>
        inval(['campi']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impostazioni', filter: perCircolo }, () =>
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste_partner', filter: perCircolo }, () =>
        inval(['richieste_partner']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidature_partner', filter: perCircolo }, () =>
        inval(['candidature_partner']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'richieste_lezione', filter: perCircolo }, () =>
        inval(['richieste_lezione_ricevute', 'richieste_lezione_inviate', 'impegni_istruttore', 'riepilogo-stat']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilita_maestri', filter: perCircolo }, () =>
        inval(['disponibilita_maestri']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tornei_amici', filter: perCircolo }, () =>
        inval(['tornei_amici', 'tornei_amici_dettaglio']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tornei_amici_partecipanti' }, () =>
        inval(['tornei_amici', 'tornei_amici_dettaglio']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tornei_amici_squadre' }, () =>
        inval(['tornei_amici_dettaglio']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tornei_amici_incontri' }, () =>
        inval(['tornei_amici_dettaglio', 'partite-concluse', 'storico-partite']),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annunci', filter: perCircolo }, () =>
        inval(['annunci']),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canale)
    }
  }, [qc, circolo.id])
}
