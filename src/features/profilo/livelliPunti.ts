// Livelli a punti (TAPPA 7 della v1): il livello mostrato nel Riepilogo dipende
// dai punti totali del socio. Le soglie sono configurabili dall'admin e salvate
// in impostazioni.livelli_punti (con ripiego sui default qui sotto).

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EsitoSalvataggio } from '@/features/segreteria/datiCampi'

export interface LivelloPunti {
  nome: string
  soglia: number
  colore: string
  // Immagine caricata dall'admin (PNG data URL). Se presente ha la priorità
  // sulla medaglia disegnata col colore.
  img: string | null
}

export const LIVELLI_PUNTI_DEFAULT: LivelloPunti[] = [
  { nome: 'Esordiente', soglia: 0, colore: '#A8702F', img: null },
  { nome: 'Promessa', soglia: 100, colore: '#9AA3A0', img: null },
  { nome: 'Atleta', soglia: 300, colore: '#E0A83A', img: null },
  { nome: 'Veterano', soglia: 700, colore: '#2E9E6B', img: null },
  { nome: 'Leggenda', soglia: 1500, colore: '#7C4DFF', img: null },
]

const PALETTE = ['#A8702F', '#9AA3A0', '#E0A83A', '#2E9E6B', '#7C4DFF', '#3A7BD5', '#C0392B', '#16A085']

// Normalizza una lista di livelli (come la v1): nomi non vuoti, soglie intere
// ≥ 0, colori validi, ordinati per soglia; il primo livello parte sempre da 0.
export function applicaLivelliPunti(arr: unknown): LivelloPunti[] {
  if (!Array.isArray(arr) || arr.length === 0)
    return LIVELLI_PUNTI_DEFAULT.map((l) => ({ ...l }))
  const puliti = arr
    .map((x, i) => {
      const l = (x ?? {}) as Partial<LivelloPunti>
      return {
        nome: (l.nome ? String(l.nome) : `Livello ${i + 1}`).slice(0, 30),
        soglia: Math.max(0, parseInt(String(l.soglia), 10) || 0),
        colore:
          typeof l.colore === 'string' && /^#[0-9a-fA-F]{6}$/.test(l.colore)
            ? l.colore
            : PALETTE[i % PALETTE.length],
        img: typeof l.img === 'string' ? l.img : null,
      }
    })
    .sort((a, b) => a.soglia - b.soglia)
  puliti[0].soglia = 0
  return puliti
}

// Livello (1-based) raggiunto con N punti; 1 = primo livello (soglia 0).
export function livelloDaPunti(punti: number, livelli: LivelloPunti[] = LIVELLI_PUNTI_DEFAULT): number {
  const p = Number(punti) || 0
  let r = 1
  for (let i = 0; i < livelli.length; i++) {
    if (p >= livelli[i].soglia) r = i + 1
  }
  return r
}

// Legge i livelli configurati (con ripiego sui default).
export function useLivelliPunti() {
  return useQuery({
    queryKey: ['livelli-punti'],
    queryFn: async (): Promise<LivelloPunti[]> => {
      const { data, error } = await supabase
        .from('impostazioni')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      const r = (data ?? {}) as Record<string, unknown>
      return applicaLivelliPunti(r.livelli_punti)
    },
  })
}

function mancaColonna(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return (error.message ?? '').toLowerCase().includes('livelli_punti')
}

export async function salvaLivelliPunti(livelli: LivelloPunti[]): Promise<EsitoSalvataggio> {
  const puliti = applicaLivelliPunti(livelli)
  const { error } = await supabase
    .from('impostazioni')
    .update({ livelli_punti: puliti })
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
