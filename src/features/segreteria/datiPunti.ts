import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCircolo } from '@/circolo/useCircolo'
import type { EsitoSalvataggio } from './datiCampi'
import type { Sport } from '@/features/prenotazioni/tipi'

// (Fase 8d · blocco 1, estesa Tappa 94) Valori dei punti e dei crediti per
// ogni azione, per sport — `impostazioni.punti_per_sport`/`crediti_per_sport`
// (jsonb, una chiave per sport, vedi tappa94-nuovi-sport-classifica-toggle.sql).
// Le vecchie colonne per-sport (punti_partita_padel, ecc.) restano in tabella
// per rollback ma non sono più lette/scritte da qui.

export interface ValoriSport {
  partita: number
  allenamento: number
  creditiPartita: number
  creditiAllenamento: number
}

export type ValoriPunti = Partial<Record<Sport, ValoriSport>>

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0
}

// Una colonna nuova non esiste ancora (manca lo script SQL relativo).
function mancaColonna(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true
  const m = (error.message ?? '').toLowerCase()
  return m.includes('punti_per_sport') || m.includes('crediti_per_sport')
}

export function useValoriPunti() {
  const circolo = useCircolo()
  return useQuery({
    queryKey: ['valori-punti', circolo.id],
    queryFn: async (): Promise<ValoriPunti> => {
      const { data, error } = await supabase
        .from('impostazioni')
        .select('punti_per_sport, crediti_per_sport')
        .eq('circolo_id', circolo.id)
        .maybeSingle()
      if (error) throw error
      const puntiPerSport = (data?.punti_per_sport ?? {}) as Record<string, { partita?: number; allenamento?: number }>
      const creditiPerSport = (data?.crediti_per_sport ?? {}) as Record<string, { partita?: number; allenamento?: number }>
      const sportPresenti = new Set([...Object.keys(puntiPerSport), ...Object.keys(creditiPerSport)])
      const valori: ValoriPunti = {}
      for (const sport of sportPresenti) {
        valori[sport as Sport] = {
          partita: num(puntiPerSport[sport]?.partita),
          allenamento: num(puntiPerSport[sport]?.allenamento),
          creditiPartita: num(creditiPerSport[sport]?.partita),
          creditiAllenamento: num(creditiPerSport[sport]?.allenamento),
        }
      }
      return valori
    },
  })
}

export async function salvaValoriPunti(v: ValoriPunti, circoloId: string): Promise<EsitoSalvataggio> {
  const puntiPerSport: Record<string, { partita: number; allenamento: number }> = {}
  const creditiPerSport: Record<string, { partita: number; allenamento: number }> = {}
  for (const [sport, valori] of Object.entries(v)) {
    if (!valori) continue
    puntiPerSport[sport] = { partita: valori.partita, allenamento: valori.allenamento }
    creditiPerSport[sport] = { partita: valori.creditiPartita, allenamento: valori.creditiAllenamento }
  }
  const { error } = await supabase
    .from('impostazioni')
    .update({ punti_per_sport: puntiPerSport, crediti_per_sport: creditiPerSport })
    .eq('circolo_id', circoloId)
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
