// Dati e helper dei traguardi di partita ("badge"). La traccia "partite" è
// configurabile dall'admin (impostazioni.badge_livelli) con immagini per Padel e
// Calcio; in mancanza di configurazione si usano i default qui sotto.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EsitoSalvataggio } from '@/features/segreteria/datiCampi'

export type Sport = 'padel' | 'calcio'

export interface Livello {
  nome: string
  soglia: number
  colore: string
  // Immagini caricate dall'admin (PNG data URL), distinte per sport.
  img_padel: string | null
  img_calcio: string | null
}

export const LIVELLI_PARTITE_DEFAULT: Livello[] = [
  { nome: 'Esordiente', soglia: 1, colore: '#A8702F', img_padel: null, img_calcio: null },
  { nome: 'Habitué', soglia: 5, colore: '#9AA3A0', img_padel: null, img_calcio: null },
  { nome: 'Veterano', soglia: 15, colore: '#E0A83A', img_padel: null, img_calcio: null },
  { nome: 'Campione', soglia: 30, colore: '#2E9E6B', img_padel: null, img_calcio: null },
  { nome: 'Leggenda', soglia: 60, colore: '#7C4DFF', img_padel: null, img_calcio: null },
]

export const EMOJI_SPORT: Record<Sport, string> = { padel: '🎾', calcio: '⚽' }

const PALETTE = ['#A8702F', '#9AA3A0', '#E0A83A', '#2E9E6B', '#7C4DFF', '#3A7BD5', '#C0392B', '#16A085']

// Normalizza i traguardi (come la v1): nomi non vuoti, soglie intere ≥ 1, colori
// validi, ordinati per soglia crescente.
export function applicaBadgeLivelli(arr: unknown): Livello[] {
  if (!Array.isArray(arr) || arr.length === 0)
    return LIVELLI_PARTITE_DEFAULT.map((l) => ({ ...l }))
  return arr
    .map((x, i) => {
      const l = (x ?? {}) as Partial<Livello>
      return {
        nome: (l.nome ? String(l.nome) : `Livello ${i + 1}`).slice(0, 30),
        soglia: Math.max(1, parseInt(String(l.soglia), 10) || 1),
        colore:
          typeof l.colore === 'string' && /^#[0-9a-fA-F]{6}$/.test(l.colore)
            ? l.colore
            : PALETTE[i % PALETTE.length],
        img_padel: typeof l.img_padel === 'string' ? l.img_padel : null,
        img_calcio: typeof l.img_calcio === 'string' ? l.img_calcio : null,
      }
    })
    .sort((a, b) => a.soglia - b.soglia)
}

// Quanti livelli ha raggiunto un socio con n partite (0 = nessuno).
export function livelloDaConteggio(n: number, livelli: Livello[] = LIVELLI_PARTITE_DEFAULT): number {
  let liv = 0
  livelli.forEach((l, i) => {
    if (n >= l.soglia) liv = i + 1
  })
  return liv
}

// Legge i traguardi configurati (con ripiego sui default).
export function useLivelliPartite() {
  return useQuery({
    queryKey: ['badge-livelli'],
    queryFn: async (): Promise<Livello[]> => {
      const { data, error } = await supabase
        .from('impostazioni')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      const r = (data ?? {}) as Record<string, unknown>
      return applicaBadgeLivelli(r.badge_livelli)
    },
  })
}

function mancaColonna(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return (error.message ?? '').toLowerCase().includes('badge_livelli')
}

export async function salvaBadgeLivelli(livelli: Livello[]): Promise<EsitoSalvataggio> {
  const puliti = applicaBadgeLivelli(livelli)
  const { error } = await supabase
    .from('impostazioni')
    .update({ badge_livelli: puliti })
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

export function numeroRomano(n: number): string {
  const tabella: Array<[number, string]> = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let out = ''
  let resto = n
  for (const [valore, simbolo] of tabella) {
    while (resto >= valore) {
      out += simbolo
      resto -= valore
    }
  }
  return out
}

// Codice salvato in soci.badge_profilo, es. "partite:padel:3".
export function codiceBadge(sport: Sport, liv: number): string {
  return `partite:${sport}:${liv}`
}

export function leggiCodiceBadge(code: string | null): { sport: Sport; liv: number } | null {
  if (!code) return null
  const parti = code.split(':')
  if (parti.length >= 3 && parti[0] === 'partite' && (parti[1] === 'padel' || parti[1] === 'calcio')) {
    const liv = Number.parseInt(parti[2], 10)
    // Numero di livelli configurabile: accetto un livello plausibile (1..20).
    if (liv >= 1 && liv <= 20) return { sport: parti[1], liv }
  }
  return null
}
