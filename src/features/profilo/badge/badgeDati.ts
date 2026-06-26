import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EsitoSalvataggio } from '@/features/segreteria/datiCampi'

export type VariabileTraguardo = 'partite' | 'allenamenti' | 'tornei' | 'amici'
export type Sport = 'padel' | 'calcio'

export const VARIABILI: VariabileTraguardo[] = ['partite', 'allenamenti', 'tornei', 'amici']

export const LABEL_VARIABILE: Record<VariabileTraguardo, string> = {
  partite: 'Partite giocate',
  allenamenti: 'Allenamenti fatti',
  tornei: 'Tornei vinti',
  amici: 'Numero di amici',
}

export const COLORE_SPORT: Record<Sport, string> = {
  padel: '#2E9E6B',
  calcio: '#E0A83A',
}

export const EMOJI_SPORT: Record<Sport, string> = { padel: '🎾', calcio: '⚽' }

export interface Traguardo {
  variabile: VariabileTraguardo
  sport: Sport
  soglia: number
  nome: string
  img: string | null
}

export const TRAGUARDI_DEFAULT: Traguardo[] = [
  { variabile: 'partite', sport: 'padel', soglia: 1, nome: 'Esordiente', img: null },
  { variabile: 'partite', sport: 'padel', soglia: 10, nome: 'Habitué', img: null },
  { variabile: 'partite', sport: 'padel', soglia: 30, nome: 'Veterano', img: null },
  { variabile: 'partite', sport: 'calcio', soglia: 1, nome: 'Esordiente', img: null },
  { variabile: 'partite', sport: 'calcio', soglia: 10, nome: 'Habitué', img: null },
  { variabile: 'partite', sport: 'calcio', soglia: 30, nome: 'Veterano', img: null },
]

function ordinaTraguardi(arr: Traguardo[]): Traguardo[] {
  return [...arr].sort((a, b) => {
    const vi = VARIABILI.indexOf(a.variabile) - VARIABILI.indexOf(b.variabile)
    if (vi !== 0) return vi
    if (a.sport !== b.sport) return a.sport === 'padel' ? -1 : 1
    return a.soglia - b.soglia
  })
}

export function applicaTraguardi(arr: unknown): Traguardo[] {
  if (!Array.isArray(arr) || arr.length === 0) return TRAGUARDI_DEFAULT.map(t => ({ ...t }))
  const validi = arr
    .filter(x => x && typeof x === 'object')
    .map((x, i) => {
      const t = x as Partial<Traguardo>
      return {
        variabile: (VARIABILI.includes(t.variabile as VariabileTraguardo)
          ? t.variabile
          : 'partite') as VariabileTraguardo,
        sport: (t.sport === 'padel' || t.sport === 'calcio' ? t.sport : 'padel') as Sport,
        soglia: Math.max(1, parseInt(String(t.soglia), 10) || 1),
        nome: (t.nome ? String(t.nome) : `Traguardo ${i + 1}`).slice(0, 30),
        img: typeof t.img === 'string' ? t.img : null,
      }
    })
  if (validi.length === 0) return TRAGUARDI_DEFAULT.map(t => ({ ...t }))
  return ordinaTraguardi(validi)
}

export function useTraguardi() {
  return useQuery({
    queryKey: ['badge-livelli'],
    queryFn: async (): Promise<Traguardo[]> => {
      const { data, error } = await supabase
        .from('impostazioni')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      const r = (data ?? {}) as Record<string, unknown>
      return applicaTraguardi(r.badge_livelli)
    },
  })
}

// Alias usato da Medaglia.tsx
export const useLivelliPartite = useTraguardi

function mancaColonna(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return (error.message ?? '').toLowerCase().includes('badge_livelli')
}

export async function salvaTraguardi(traguardi: Traguardo[]): Promise<EsitoSalvataggio> {
  const puliti = applicaTraguardi(traguardi)
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

// Codice salvato in soci.badge_profilo: "variabile:sport:soglia"
export function codiceBadge(t: Traguardo): string {
  return `${t.variabile}:${t.sport}:${t.soglia}`
}

export function leggiCodiceBadge(
  code: string | null,
): { variabile: VariabileTraguardo; sport: Sport; soglia: number } | null {
  if (!code) return null
  const parti = code.split(':')
  if (parti.length < 3) return null
  const variabile = parti[0] as VariabileTraguardo
  const sport = parti[1] as Sport
  const soglia = parseInt(parti[2], 10)
  if (
    VARIABILI.includes(variabile) &&
    (sport === 'padel' || sport === 'calcio') &&
    !isNaN(soglia) &&
    soglia > 0
  ) {
    return { variabile, sport, soglia }
  }
  return null
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
