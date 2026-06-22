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
      return { lista, parts }
    },
  })
}

// Le lezioni (allenamenti) di cui sono istruttore, con i partecipanti.
export function useMieLezioni(
  sport: Sport,
  idCampi: Array<number | string>,
  allenatoreId: string,
) {
  return useQuery({
    queryKey: ['lezioni', sport, allenatoreId],
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
