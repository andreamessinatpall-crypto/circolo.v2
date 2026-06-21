// Livelli a punti (TAPPA 7 della v1): il livello mostrato nel Riepilogo
// dipende dai punti totali del socio.

export interface LivelloPunti {
  nome: string
  soglia: number
  colore: string
  emoji: string
}

export const LIVELLI_PUNTI: LivelloPunti[] = [
  { nome: 'Esordiente', soglia: 0, colore: '#A8702F', emoji: '🥉' },
  { nome: 'Promessa', soglia: 100, colore: '#9AA3A0', emoji: '🥈' },
  { nome: 'Atleta', soglia: 300, colore: '#E0A83A', emoji: '🥇' },
  { nome: 'Veterano', soglia: 700, colore: '#2E9E6B', emoji: '🏆' },
  { nome: 'Leggenda', soglia: 1500, colore: '#7C4DFF', emoji: '👑' },
]

// Livello (1-based) raggiunto con N punti; 1 = primo livello (soglia 0).
export function livelloDaPunti(punti: number): number {
  const p = Number(punti) || 0
  let r = 1
  for (let i = 0; i < LIVELLI_PUNTI.length; i++) {
    if (p >= LIVELLI_PUNTI[i].soglia) r = i + 1
  }
  return r
}
