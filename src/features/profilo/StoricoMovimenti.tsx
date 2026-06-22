import { useAuth } from '@/auth/useAuth'
import {
  useStoricoMovimenti,
  mancaStorico,
  SCRIPT_STORICO,
  type MovimentoGrezzo,
} from './datiMovimenti'

// Colonne da NON esportare nel CSV.
const COLONNE_NASCOSTE = ['socio_id', 'chiave']

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

// Costruisce il contenuto CSV da tutte le righe e tutte le loro colonne.
function costruisciCsv(righe: MovimentoGrezzo[]): string {
  // Unione ordinata di tutte le colonne presenti (escluse quelle nascoste).
  const colonne: string[] = []
  for (const r of righe)
    for (const k of Object.keys(r))
      if (!colonne.includes(k) && !COLONNE_NASCOSTE.includes(k)) colonne.push(k)

  const intest = colonne.map(esc).join(';')
  const corpo = righe.map((r) => colonne.map((c) => esc(cella(r[c]))).join(';'))
  return [intest, ...corpo].join('\r\n')
}

export default function StoricoMovimenti() {
  const { profilo } = useAuth()
  const storico = useStoricoMovimenti(profilo?.id)

  if (!profilo) return null

  // Tabella non ancora creata su Supabase.
  if (storico.error && mancaStorico(storico.error)) {
    return (
      <>
        <div className="eyebrow">Storico movimenti</div>
        <p className="sub">
          Storico non ancora attivo: esegui lo script{' '}
          <code className="rounded bg-verde-50 px-1">{SCRIPT_STORICO}</code> su Supabase.
        </p>
      </>
    )
  }

  const righe = storico.data ?? []
  const vuoto = !storico.isLoading && righe.length === 0

  const scarica = () => {
    const csv = costruisciCsv(righe)
    // Anteponiamo il BOM (U+FEFF) così Excel apre bene le lettere accentate.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movimenti_${profilo.cognome || 'socio'}_${profilo.nome || ''}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <div className="eyebrow">Storico movimenti</div>
      <div className="card">
        <p className="mb-3 text-sm text-ink-2">
          Scarica un file CSV con tutti i tuoi movimenti di punti e crediti (uno per ogni evento),
          con tutti i dettagli registrati.
        </p>
        <button
          type="button"
          className="btn"
          disabled={storico.isLoading || righe.length === 0}
          onClick={scarica}
        >
          {storico.isLoading
            ? 'Caricamento…'
            : vuoto
              ? 'Nessun movimento da scaricare'
              : `Scarica CSV (${righe.length})`}
        </button>
      </div>
    </>
  )
}
