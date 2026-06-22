import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EsitoSalvataggio } from './datiCampi'

// (Fase 8d · blocco 1) Valori dei punti e dei crediti per ogni azione, distinti
// per Padel e Calcio. Stanno nella riga impostazioni (id=1).
//   - punti_*   : già presenti dalla v1.
//   - crediti_* : novità della v2 (script tappa14-valori-crediti.sql). Nella v1
//                 i crediti valevano quanto i punti; ora hanno un valore proprio.
// Si legge con select('*') così la lettura non si rompe se le colonne crediti
// non esistono ancora (prima della migrazione vengono lette come 0).

export interface ValoriPunti {
  partitaPadel: number
  partitaCalcio: number
  allenamentoPadel: number
  allenamentoCalcio: number
  creditiPartitaPadel: number
  creditiPartitaCalcio: number
  creditiAllenamentoPadel: number
  creditiAllenamentoCalcio: number
}

// Una colonna nuova non esiste ancora (manca lo script SQL relativo).
function mancaColonna(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true
  const m = (error.message ?? '').toLowerCase()
  return m.includes('crediti_partita_padel') || m.includes('punti_partita_padel')
}

// Legge un numero, con eventuale ripiego sul valore legacy a colonna unica.
function num(perSport: unknown, legacy: unknown = undefined): number {
  if (typeof perSport === 'number') return perSport
  if (typeof legacy === 'number') return legacy
  return 0
}

export function useValoriPunti() {
  return useQuery({
    queryKey: ['valori-punti'],
    queryFn: async (): Promise<ValoriPunti> => {
      const { data, error } = await supabase
        .from('impostazioni')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      const r = (data ?? {}) as Record<string, unknown>
      return {
        partitaPadel: num(r.punti_partita_padel, r.punti_partita),
        partitaCalcio: num(r.punti_partita_calcio, r.punti_partita),
        allenamentoPadel: num(r.punti_allenamento_padel, r.punti_allenamento),
        allenamentoCalcio: num(r.punti_allenamento_calcio, r.punti_allenamento),
        creditiPartitaPadel: num(r.crediti_partita_padel),
        creditiPartitaCalcio: num(r.crediti_partita_calcio),
        creditiAllenamentoPadel: num(r.crediti_allenamento_padel),
        creditiAllenamentoCalcio: num(r.crediti_allenamento_calcio),
      }
    },
  })
}

export async function salvaValoriPunti(v: ValoriPunti): Promise<EsitoSalvataggio> {
  const { error } = await supabase
    .from('impostazioni')
    .update({
      punti_partita_padel: v.partitaPadel,
      punti_partita_calcio: v.partitaCalcio,
      punti_allenamento_padel: v.allenamentoPadel,
      punti_allenamento_calcio: v.allenamentoCalcio,
      crediti_partita_padel: v.creditiPartitaPadel,
      crediti_partita_calcio: v.creditiPartitaCalcio,
      crediti_allenamento_padel: v.creditiAllenamentoPadel,
      crediti_allenamento_calcio: v.creditiAllenamentoCalcio,
    })
    .eq('id', 1)
  if (error) {
    return {
      ok: false,
      mancaPermesso: error.code === '42501',
      mancaScript: mancaColonna(error),
      messaggio: error.message,
    }
  }
  return { ok: true }
}
