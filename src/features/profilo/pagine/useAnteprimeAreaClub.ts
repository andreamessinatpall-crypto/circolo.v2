import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'

export interface ProssimaAttivita {
  id: number | string
  inizio: string
  fine: string
  campo_nome: string | null
  sport: string
}

// Anteprima leggera per la card "Attività in programma": solo la prossima
// (niente arricchimento allenamento/torneo — quello resta nella pagina
// completa, AttivitaInProgramma.tsx). Stessa RPC, stesso ordinamento.
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
      }>
      if (righe.length === 0) return null
      const prima = [...righe].sort(
        (a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime(),
      )[0]
      return {
        id: prima.prenotazione_id,
        inizio: prima.inizio,
        fine: prima.fine,
        campo_nome: prima.campo_nome,
        sport: prima.sport,
      }
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
