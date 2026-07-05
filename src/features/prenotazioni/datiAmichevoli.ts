import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { titleCase } from '@/lib/formato'
import type { Sport } from './tipi'

export interface SocioPubblico {
  id: string
  etichetta: string
}

export interface Partecipante {
  id: number | string
  prenotazione_id: number | string
  socio_id: string | null
  // (Tappa 11) Nome di un ospite non registrato (solo quando socio_id è null).
  nome_manuale?: string | null
  confermato: boolean
}

// (Tappa 11) La colonna "nome_manuale" potrebbe non esistere ancora nel database.
export function mancaColonnaManuale(error: unknown) {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  return (
    e.code === 'PGRST204' ||
    e.code === '42703' ||
    (e.message ?? '').toLowerCase().includes('nome_manuale')
  )
}

export interface MiaPrenotazione {
  id: number | string
  campo_id: number | string
  socio_id: string
  inizio: string
  fine: string
  allenamento?: boolean | null
  allenatore_id?: string | null
  incontro_id?: number | string | null
  torneo_id?: string | null
  torneo_nome?: string | null
}

// Elenco soci attivi (per etichette e selettore). Condivide la cache con gli amici.
export function useSociPubblici() {
  return useQuery({
    queryKey: ['soci_pubblici'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('soci_pubblici')
      if (error) throw error
      return ((data ?? []) as SocioPubblico[]).map((s) => ({
        id: s.id,
        etichetta: titleCase(s.etichetta),
      }))
    },
  })
}

// Le mie prenotazioni future per uno sport, con i partecipanti.
export function useMieAmichevoli(
  sport: Sport,
  idCampi: Array<number | string>,
  profiloId: string,
) {
  return useQuery({
    queryKey: ['amichevoli', sport, profiloId],
    enabled: idCampi.length > 0,
    queryFn: async () => {
      const adesso = new Date().toISOString()
      const { data: pren, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .eq('socio_id', profiloId)
        .in('campo_id', idCampi)
        .gte('fine', adesso)
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

      // Risolve il nome del torneo per le prenotazioni di incontri (girone/eliminazione).
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

      // Risolve il nome del torneo per le prenotazioni americano (torneo_id diretto).
      const conTorneo = lista.filter((p) => p.torneo_id && !p.incontro_id)
      if (conTorneo.length) {
        const torneoIds = conTorneo.map((p) => p.torneo_id as string)
        const { data: torn } = await supabase
          .from('tornei')
          .select('id, nome')
          .in('id', torneoIds)
        const nomePerTorneo = new Map<string, string>()
        for (const t of (torn ?? []) as Array<{ id: string; nome: string }>) {
          nomePerTorneo.set(String(t.id), t.nome)
        }
        for (const p of lista) {
          if (p.torneo_id && !p.incontro_id) p.torneo_nome = nomePerTorneo.get(String(p.torneo_id)) ?? null
        }
      }

      return { lista, parts }
    },
  })
}

// Le lezioni (allenamenti) di cui sono istruttore, con i partecipanti.
// Non filtrate per sport: un istruttore vede tutte le proprie lezioni
// (padel e calcio) in un unico posto (tab "Lezioni" del profilo).
export function useMieLezioni(
  idCampi: Array<number | string>,
  allenatoreId: string,
) {
  return useQuery({
    queryKey: ['lezioni', allenatoreId],
    enabled: idCampi.length > 0,
    queryFn: async () => {
      const adesso = new Date().toISOString()
      const { data: pren, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .eq('allenatore_id', allenatoreId)
        .eq('allenamento', true)
        .in('campo_id', idCampi)
        .gte('fine', adesso)
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
