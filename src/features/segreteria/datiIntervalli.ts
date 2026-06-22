import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EsitoSalvataggio } from './datiCampi'

// (Fase 8d · blocco 3) Intervalli per l'accumulo dei crediti.
//
// I CREDITI si accumulano solo per gli eventi la cui data ricade dentro uno di
// questi intervalli di date. Nessun intervallo definito = nessun limite di date
// (vale solo l'interruttore "modalità premi"). I PUNTI non sono mai filtrati.
//
// Stanno nella colonna jsonb impostazioni.intervalli_crediti (già presente dalla
// v1, script tappa6-pannello-admin.sql): un array di { da, a } in "AAAA-MM-GG".

export interface Intervallo {
  da: string
  a: string
}

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/

// Tiene solo gli intervalli completi e validi (da ≤ a), ordinati per data.
export function normalizzaIntervalli(arr: unknown): Intervallo[] {
  if (!Array.isArray(arr)) return []
  return arr
    .map((x) => {
      const o = (x ?? {}) as { da?: unknown; a?: unknown }
      const da = typeof o.da === 'string' && RE_DATA.test(o.da) ? o.da : ''
      const a = typeof o.a === 'string' && RE_DATA.test(o.a) ? o.a : ''
      return { da, a }
    })
    .filter((x) => x.da && x.a && x.da <= x.a)
    .sort((u, v) => u.da.localeCompare(v.da))
}

// true se la data (ISO o "AAAA-MM-GG") ricade in uno degli intervalli.
// Nessun intervallo = nessun limite; evento senza data = non lo blocco.
export function dataInIntervalli(
  dataStr: string | null | undefined,
  intervalli: Intervallo[],
): boolean {
  if (!intervalli.length) return true
  if (!dataStr) return true
  const d = String(dataStr).slice(0, 10)
  return intervalli.some((iv) => d >= iv.da && d <= iv.a)
}

// La colonna intervalli_crediti non esiste ancora (manca lo script SQL).
function mancaColonna(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return (error.message ?? '').toLowerCase().includes('intervalli_crediti')
}

export function useIntervalliCrediti() {
  return useQuery({
    queryKey: ['intervalli-crediti'],
    queryFn: async (): Promise<Intervallo[]> => {
      // select('*') così la lettura non si rompe se la colonna non esiste ancora.
      const { data, error } = await supabase
        .from('impostazioni')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      const r = (data ?? {}) as Record<string, unknown>
      return normalizzaIntervalli(r.intervalli_crediti)
    },
  })
}

export async function salvaIntervalli(intervalli: Intervallo[]): Promise<EsitoSalvataggio> {
  const puliti = normalizzaIntervalli(intervalli)
  const { error } = await supabase
    .from('impostazioni')
    .update({ intervalli_crediti: puliti })
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
