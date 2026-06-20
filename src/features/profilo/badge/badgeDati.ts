// Dati e helper dei badge. Riprendiamo la traccia "partite" della v1
// (l'unica mostrata ai soci) con i suoi 5 livelli.

export type Sport = 'padel' | 'calcio'

export interface Livello {
  nome: string
  soglia: number
  colore: string
  emoji: string
}

export const LIVELLI_PARTITE: Livello[] = [
  { nome: 'Esordiente', soglia: 1, colore: '#A8702F', emoji: '🐢' },
  { nome: 'Habitué', soglia: 5, colore: '#9AA3A0', emoji: '🐇' },
  { nome: 'Veterano', soglia: 15, colore: '#E0A83A', emoji: '🐆' },
  { nome: 'Campione', soglia: 30, colore: '#2E9E6B', emoji: '🦅' },
  { nome: 'Leggenda', soglia: 60, colore: '#7C4DFF', emoji: '🦁' },
]

export const EMOJI_SPORT: Record<Sport, string> = { padel: '🎾', calcio: '⚽' }

// Quanti livelli ha raggiunto un socio con n partite (0 = nessuno).
export function livelloDaConteggio(n: number): number {
  let liv = 0
  LIVELLI_PARTITE.forEach((l, i) => {
    if (n >= l.soglia) liv = i + 1
  })
  return liv
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
    if (liv >= 1 && liv <= LIVELLI_PARTITE.length) return { sport: parti[1], liv }
  }
  return null
}
