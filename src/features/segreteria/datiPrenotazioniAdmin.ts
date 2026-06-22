import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MiaPrenotazione, Partecipante } from '@/features/prenotazioni/datiAmichevoli'

// (Fase 8g) Prenotazioni di un intervallo di giorni (di norma una settimana)
// per i campi di uno sport, con i relativi partecipanti. Serve al pannello
// admin "Prenotazioni": il calendario colora i giorni e la modale del giorno
// elenca le partite da gestire e confermare.

export interface DatiPrenAdmin {
  lista: MiaPrenotazione[]
  parts: Partecipante[]
}

export function usePrenotazioniAdminIntervallo(
  idCampi: Array<number | string>,
  daIso: string,
  aIso: string,
) {
  return useQuery({
    queryKey: ['pren-admin', daIso, aIso, idCampi],
    enabled: idCampi.length > 0 && !!daIso && !!aIso,
    queryFn: async (): Promise<DatiPrenAdmin> => {
      const { data: pren, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .in('campo_id', idCampi)
        .gte('inizio', daIso)
        .lt('inizio', aIso)
        .order('inizio', { ascending: true })
      if (error) throw error
      const lista = (pren ?? []) as MiaPrenotazione[]

      const ids = lista.map((p) => p.id)
      let parts: Partecipante[] = []
      if (ids.length) {
        const { data, error: errP } = await supabase
          .from('partecipanti_amichevole')
          .select('*')
          .in('prenotazione_id', ids)
        if (errP) throw errP
        parts = (data ?? []) as Partecipante[]
      }
      return { lista, parts }
    },
  })
}
