import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PartitaStorico {
  id: number | string
  inizio: string
  fine: string
  sport: 'padel' | 'calcio' | null
  campoNome: string | null
  risultato?: string | null
}

export interface TorneoStorico {
  id: number | string
  nome: string
  sport: 'padel' | 'calcio'
  stato: string
  data_inizio: string | null
  data_fine: string | null
}

// Mappa campo_id -> {nome, sport} per un elenco di prenotazioni, una sola
// query invece di un join lato server (niente RPC dedicata per questo).
async function arricchisciConCampo<T extends { campo_id: number | string }>(
  righe: T[],
): Promise<(T & { sport: 'padel' | 'calcio' | null; campoNome: string | null })[]> {
  const campoIds = [...new Set(righe.map((r) => r.campo_id))]
  if (campoIds.length === 0) return righe.map((r) => ({ ...r, sport: null, campoNome: null }))
  const { data: campi } = await supabase.from('campi').select('id, nome, sport').in('id', campoIds)
  const mappa = new Map((campi ?? []).map((c) => [c.id, c]))
  return righe.map((r) => {
    const c = mappa.get(r.campo_id)
    return { ...r, sport: (c?.sport as 'padel' | 'calcio' | undefined) ?? null, campoNome: c?.nome ?? null }
  })
}

// Partite amichevoli giocate (Fase D): esclude lezioni e incontri di torneo,
// solo prenotazioni già concluse a cui il socio ha partecipato da confermato.
// Solo quelle iniziate da più di 7 giorni: quelle più recenti si vedono già
// nella pagina Attività → "Concluse questa settimana" (AttivitaConcluse.tsx),
// niente doppioni tra le due liste.
export function usePartiteGiocate(socioId: string | undefined) {
  return useQuery({
    queryKey: ['storico-partite', socioId],
    enabled: !!socioId,
    queryFn: async (): Promise<PartitaStorico[]> => {
      const { data: parts, error: errParts } = await supabase
        .from('partecipanti_amichevole')
        .select('prenotazione_id')
        .eq('socio_id', socioId!)
        .eq('confermato', true)
      if (errParts) throw errParts
      const prenIds = [...new Set((parts ?? []).map((p) => p.prenotazione_id))]
      if (prenIds.length === 0) return []

      const settimanaFa = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: pren, error: errPren } = await supabase
        .from('prenotazioni')
        .select('id, inizio, fine, campo_id, allenamento, torneo_id, incontro_id, risultato')
        .in('id', prenIds)
        .eq('allenamento', false)
        .is('torneo_id', null)
        .is('incontro_id', null)
        .lt('inizio', settimanaFa)
        .order('inizio', { ascending: false })
      if (errPren) throw errPren

      const righe = await arricchisciConCampo(pren ?? [])
      return righe.map((r) => ({
        id: r.id,
        inizio: r.inizio,
        fine: r.fine,
        sport: r.sport,
        campoNome: r.campoNome,
        risultato: r.risultato ?? null,
      }))
    },
  })
}

// Lezioni/allenamenti svolti come allievo (non come istruttore).
export function useLezioniStoriche(socioId: string | undefined) {
  return useQuery({
    queryKey: ['storico-lezioni', socioId],
    enabled: !!socioId,
    queryFn: async (): Promise<PartitaStorico[]> => {
      const { data: parts, error: errParts } = await supabase
        .from('partecipanti_amichevole')
        .select('prenotazione_id')
        .eq('socio_id', socioId!)
        .eq('confermato', true)
      if (errParts) throw errParts
      const prenIds = [...new Set((parts ?? []).map((p) => p.prenotazione_id))]
      if (prenIds.length === 0) return []

      const { data: pren, error: errPren } = await supabase
        .from('prenotazioni')
        .select('id, inizio, fine, campo_id, allenamento')
        .in('id', prenIds)
        .eq('allenamento', true)
        .lt('fine', new Date().toISOString())
        .order('inizio', { ascending: false })
      if (errPren) throw errPren

      const righe = await arricchisciConCampo(pren ?? [])
      return righe.map((r) => ({ id: r.id, inizio: r.inizio, fine: r.fine, sport: r.sport, campoNome: r.campoNome }))
    },
  })
}

// Tornei a cui il socio ha partecipato (come componente di una squadra/coppia).
export function useTorneiPartecipati(socioId: string | undefined) {
  return useQuery({
    queryKey: ['storico-tornei', socioId],
    enabled: !!socioId,
    queryFn: async (): Promise<TorneoStorico[]> => {
      const { data: comp, error: errComp } = await supabase
        .from('squadra_componenti')
        .select('torneo_id')
        .eq('socio_id', socioId!)
      if (errComp) throw errComp
      const torneoIds = [...new Set((comp ?? []).map((c) => c.torneo_id))]
      if (torneoIds.length === 0) return []

      const { data: tornei, error: errTornei } = await supabase
        .from('tornei')
        .select('id, nome, sport, stato, data_inizio, data_fine')
        .in('id', torneoIds)
        .order('data_inizio', { ascending: false })
      if (errTornei) throw errTornei

      return (tornei ?? []) as TorneoStorico[]
    },
  })
}
