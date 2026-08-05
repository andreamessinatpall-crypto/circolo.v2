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

// Spezza una riga CSV nei suoi campi, gestendo virgolette (con "" per la
// virgoletta letterale) come da convenzione CSV/Excel.
function splitRigaCsv(riga: string, sep: string): string[] {
  const campi: string[] = []
  let corrente = ''
  let inVirgolette = false
  for (let i = 0; i < riga.length; i++) {
    const c = riga[i]
    if (inVirgolette) {
      if (c === '"') {
        if (riga[i + 1] === '"') { corrente += '"'; i++ } else inVirgolette = false
      } else corrente += c
    } else if (c === '"') {
      inVirgolette = true
    } else if (c === sep) {
      campi.push(corrente)
      corrente = ''
    } else {
      corrente += c
    }
  }
  campi.push(corrente)
  return campi
}

// Legge un CSV (import) in righe oggetto, chiave = intestazione in minuscolo.
// Riconosce da solo il separatore (";" convenzione Excel IT, o ",") guardando
// la riga di intestazione. Non gestisce campi con "a capo" al loro interno
// (non previsto per i dati anagrafici che importiamo).
export function leggiCsv(testo: string): Record<string, string>[] {
  const senzaBom = testo.charCodeAt(0) === 0xfeff ? testo.slice(1) : testo
  const pulito = senzaBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!pulito) return []
  const righeGrezze = pulito.split('\n').filter((r) => r.trim() !== '')
  if (righeGrezze.length === 0) return []
  const intestazioneGrezza = righeGrezze[0]
  const nPuntoVirgola = (intestazioneGrezza.match(/;/g) ?? []).length
  const nVirgola = (intestazioneGrezza.match(/,/g) ?? []).length
  const sep = nPuntoVirgola >= nVirgola ? ';' : ','
  const intestazioni = splitRigaCsv(intestazioneGrezza, sep).map((h) => h.trim().toLowerCase())
  return righeGrezze.slice(1).map((riga) => {
    const campi = splitRigaCsv(riga, sep)
    const rec: Record<string, string> = {}
    intestazioni.forEach((h, i) => { rec[h] = (campi[i] ?? '').trim() })
    return rec
  })
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
