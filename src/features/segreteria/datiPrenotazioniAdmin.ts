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

      // Risolve il nome del torneo per le prenotazioni di incontri.
      const conIncontro = lista.filter((p) => p.incontro_id)
      if (conIncontro.length) {
        const incontroIds = conIncontro.map((p) => p.incontro_id as number | string)
        const { data: inc } = await supabase
          .from('incontri')
          .select('id, torneo:tornei(nome)')
          .in('id', incontroIds)
        const nomePerIncontro = new Map<string, string>()
        for (const r of (inc ?? []) as unknown as Array<{ id: number | string; torneo: { nome: string } | null }>) {
          if (r.torneo?.nome) nomePerIncontro.set(String(r.id), r.torneo.nome)
        }
        for (const p of lista) {
          if (p.incontro_id) p.torneo_nome = nomePerIncontro.get(String(p.incontro_id)) ?? null
        }
      }

      // Risolve il nome per le prenotazioni americano (torneo_id diretto).
      const conTorneo = lista.filter((p) => p.torneo_id && !p.incontro_id)
      if (conTorneo.length) {
        const torneoIds = conTorneo.map((p) => p.torneo_id as string)
        const { data: torn } = await supabase.from('tornei').select('id, nome').in('id', torneoIds)
        const nomePerTorneo = new Map<string, string>()
        for (const t of (torn ?? []) as Array<{ id: string; nome: string }>) nomePerTorneo.set(String(t.id), t.nome)
        for (const p of lista) {
          if (p.torneo_id && !p.incontro_id) p.torneo_nome = nomePerTorneo.get(String(p.torneo_id)) ?? null
        }
      }

      return { lista, parts }
    },
  })
}
