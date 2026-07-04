// Piccole funzioni per mostrare i dati in modo leggibile (in italiano).

// "mario rossi" -> "Mario Rossi" (gestisce spazi, apostrofi e trattini).
export function titleCase(str: string | null): string {
  if (str == null) return ''
  return String(str)
    .toLowerCase()
    .replace(/(^|[\s'’-])([a-zàèéìòùç])/g, (_m, sep, ch) => sep + ch.toUpperCase())
}

export const ETICHETTE_GENERE: Record<string, string> = {
  M: 'Maschile',
  F: 'Femminile',
  altro: 'Altro',
}

export function etichettaGenere(g: string | null): string {
  if (!g) return '—'
  return ETICHETTE_GENERE[g] ?? g
}

export const ETICHETTE_SPORT: Record<string, string> = {
  padel: 'Padel',
  calcio: 'Calcio',
  entrambi: 'Entrambi',
}

export function etichettaSport(s: string | null): string {
  if (!s) return '—'
  return ETICHETTE_SPORT[s] ?? s
}

// Da "2024-09-01" a "1 settembre 2024".
export function dataEstesa(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Da timestamp ISO a "adesso" / "5 min fa" / "3 ore fa" / "2 giorni fa".
export function tempoRelativo(iso: string): string {
  const minuti = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minuti < 1) return 'adesso'
  if (minuti < 60) return `${minuti} min fa`
  const ore = Math.floor(minuti / 60)
  if (ore < 24) return `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`
  const giorni = Math.floor(ore / 24)
  if (giorni < 7) return `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'} fa`
  return dataEstesa(iso.slice(0, 10))
}
