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
