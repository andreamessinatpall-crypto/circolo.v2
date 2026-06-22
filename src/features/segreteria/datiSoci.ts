import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mancaRpc } from '@/lib/errori'

// (Fase 8b) Gestione giocatori lato segreteria.
// La scheda socio include anche i saldi (punti/crediti), che la tabella
// `soci` mantiene aggiornati.
export interface SocioAdmin {
  id: string
  nome: string
  cognome: string
  email: string | null
  telefono: string | null
  data_nascita: string | null
  genere: string | null
  sport_preferito: string
  attivo: boolean
  is_admin: boolean
  is_allenatore: boolean | null
  e_allenatore: boolean | null
  punti: number | null
  crediti: number | null
}

// Tutti i soci (l'admin li legge grazie alle policy RLS).
export function useSoci() {
  return useQuery({
    queryKey: ['soci'],
    queryFn: async (): Promise<SocioAdmin[]> => {
      const { data, error } = await supabase.from('soci').select('*')
      if (error) throw error
      return (data ?? []) as SocioAdmin[]
    },
  })
}

// Aggiustamento manuale dei saldi. Come la v1: chiave nulla = il movimento
// si accumula (non è idempotente). I crediti si toccano solo a modalità
// premi accesa.
export async function aggiustaSaldo(
  socioId: string,
  dPunti: number,
  dCrediti: number,
  modalitaPremi: boolean,
): Promise<{ ok: boolean; mancaScript?: boolean; messaggio?: string }> {
  const { error } = await supabase.rpc('assegna_movimento', {
    p_socio: socioId,
    p_punti: dPunti,
    p_crediti: modalitaPremi ? dCrediti : 0,
    p_motivo: 'Aggiustamento manuale',
    p_chiave: null,
    p_data_evento: null,
    p_sport: null,
    p_tipo: 'aggiustamento',
  })
  if (error) return { ok: false, mancaScript: mancaRpc(error), messaggio: error.message }
  return { ok: true }
}
