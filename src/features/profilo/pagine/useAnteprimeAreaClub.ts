import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'

export interface ProssimaAttivita {
  id: number | string
  inizio: string
  fine: string
  campo_nome: string | null
  sport: string
  partecipanti: string[]
}

// Anteprima leggera per la card "Attività in programma": solo la prossima
// (niente arricchimento allenamento/torneo — quello resta nella pagina
// completa, AttivitaInProgramma.tsx). Stessa RPC, stesso ordinamento. La RPC
// fa un LEFT JOIN con i partecipanti: la stessa prenotazione può comparire
// su più righe (una per partecipante), quindi si raggruppa per
// prenotazione_id prima di prendere la più vicina, non la prima riga.
export function useProssimaAttivita() {
  const { profilo } = useAuth()
  return useQuery({
    queryKey: ['prossima-attivita', profilo?.id],
    enabled: !!profilo,
    queryFn: async (): Promise<ProssimaAttivita | null> => {
      const { data, error } = await supabase.rpc('partite_in_programma')
      if (error) throw error
      const righe = (data ?? []) as Array<{
        prenotazione_id: number | string
        inizio: string
        fine: string
        campo_nome: string | null
        sport: string
        socio_id: string | null
      }>
      if (righe.length === 0) return null

      const gruppi = new Map<string, ProssimaAttivita>()
      for (const r of righe) {
        const k = String(r.prenotazione_id)
        if (!gruppi.has(k)) {
          gruppi.set(k, {
            id: r.prenotazione_id,
            inizio: r.inizio,
            fine: r.fine,
            campo_nome: r.campo_nome,
            sport: r.sport,
            partecipanti: [],
          })
        }
        if (r.socio_id) gruppi.get(k)!.partecipanti.push(r.socio_id)
      }
      return [...gruppi.values()].sort(
        (a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime(),
      )[0]
    },
  })
}

export interface RigaClassificaTop {
  posizione: number
  etichetta: string | null
  punti: number | null
  is_me: boolean
}

// Anteprima leggera per la card "Classifica": solo i primi 3 (stessa RPC
// della pagina completa, ClassificaClub.tsx).
export function useTop3Classifica() {
  return useQuery({
    queryKey: ['classifica_visibile'],
    queryFn: async (): Promise<RigaClassificaTop[]> => {
      const { data, error } = await supabase.rpc('classifica_visibile')
      if (error) throw error
      return ((data ?? []) as RigaClassificaTop[]).slice(0, 3)
    },
  })
}
