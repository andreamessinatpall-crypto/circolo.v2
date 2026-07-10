import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DettaglioRisultato } from '@/features/profilo/datiRisultato'

export interface PartitaConAmico {
  prenotazione_id: string
  inizio: string
  fine: string
  campo_nome: string | null
  sport: 'padel' | 'calcio' | null
  risultato: string | null
  risultato_dettaglio: DettaglioRisultato | null
}

// Ultime partite giocate insieme a un amico specifico, con il risultato se
// già inserito (scheda dettaglio amico in AmiciProfilo.tsx).
export function usePartiteConAmico(amicoId: string | undefined) {
  return useQuery({
    queryKey: ['partite-con-amico', amicoId],
    enabled: !!amicoId,
    queryFn: async (): Promise<PartitaConAmico[]> => {
      const { data, error } = await supabase.rpc('partite_con_amico_dettaglio', {
        p_amico: amicoId,
        p_limite: 5,
      })
      if (error) throw error
      return (data ?? []) as PartitaConAmico[]
    },
  })
}
