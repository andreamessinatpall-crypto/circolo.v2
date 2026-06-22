// Helper generici per esportare righe (oggetti) in un file CSV scaricabile.
// Usati sia dallo storico del socio sia dall'export admin per giocatore.

// Riconosce una stringa che inizia come una data ISO (YYYY-MM-DD...).
const RE_DATA = /^\d{4}-\d{2}-\d{2}/

// Formatta una data/ora in "gg/mm/aaaa HH:MM" in ora locale, senza fuso orario
// né secondi. Se è solo una data (o l'orario è 00:00) mostra solo il giorno.
function formattaData(v: string): string {
  const soloData = /^\d{4}-\d{2}-\d{2}$/.test(v)
  const d = new Date(soloData ? v + 'T00:00:00' : v)
  if (Number.isNaN(d.getTime())) return v
  const due = (n: number) => String(n).padStart(2, '0')
  const data = `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()}`
  if (soloData) return data
  const ora = `${due(d.getHours())}:${due(d.getMinutes())}`
  return ora === '00:00' ? data : `${data} ${ora}`
}

// Trasforma un valore di cella in testo adatto al CSV.
function cella(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string' && RE_DATA.test(v)) return formattaData(v)
  if (typeof v === 'object') return JSON.stringify(v) // es. colonne jsonb
  return String(v)
}

// Mette tra virgolette i campi che contengono separatori, a capo o virgolette
// (raddoppiandole), come da convenzione CSV.
function esc(s: string): string {
  return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

// Costruisce il contenuto CSV da tutte le righe e tutte le loro colonne
// (unione ordinata), escludendo le colonne indicate.
export function costruisciCsv(
  righe: Record<string, unknown>[],
  colonneNascoste: string[] = [],
): string {
  const colonne: string[] = []
  for (const r of righe)
    for (const k of Object.keys(r))
      if (!colonne.includes(k) && !colonneNascoste.includes(k)) colonne.push(k)

  const intest = colonne.map(esc).join(';')
  const corpo = righe.map((r) => colonne.map((c) => esc(cella(r[c]))).join(';'))
  return [intest, ...corpo].join('\r\n')
}

// Avvia il download di un file CSV. Antepone il BOM (U+FEFF) così Excel apre
// bene le lettere accentate.
export function scaricaCsv(nomeFile: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
