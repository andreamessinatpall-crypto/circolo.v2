import { useRef, useState, type ChangeEvent } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { classiErrore, classiOk } from '@/components/stili'
import { leggiCsv, costruisciCsv, scaricaCsv } from '@/lib/csv'
import { useSoci } from './datiSoci'

// Import massivo giocatori da CSV (segreteria). Stessa meccanica di
// creazione account di NuovoSocio.tsx (client Supabase "usa e getta" che non
// tocca la sessione dell'admin), ripetuta riga per riga. Password fissa e
// provvisoria per tutti gli importati: il socio la cambia al primo accesso
// (vedi CambiaPassword.tsx), qui non serve una colonna password nel CSV.
const PASSWORD_PROVVISORIA = '12345678'

// Limite Supabase: 30 richieste di signup/5 minuti per IP (vedi
// supabase/config.toml, [auth.rate_limit] sign_in_sign_ups). 11s di attesa
// tra una riga e l'altra tiene un margine di sicurezza (~27/5min).
const ATTESA_MS = 11_000

const COLONNE_OBBLIGATORIE = ['nome', 'cognome', 'email', 'data_nascita', 'genere', 'sport_preferito']
const COLONNE_FACOLTATIVE = ['telefono', 'is_allenatore', 'e_allenatore']

interface DatiRigaValida {
  nome: string
  cognome: string
  email: string
  data_nascita: string
  genere: 'M' | 'F' | 'altro'
  sport_preferito: 'padel' | 'calcio' | 'entrambi'
  telefono?: string
  is_allenatore: boolean
  e_allenatore: boolean
}

type StatoRiga = 'in_attesa' | 'in_corso' | 'ok' | 'errore'

interface RigaImport {
  numero: number
  dati: DatiRigaValida | null
  erroreValidazione: string | null
  stato: StatoRiga
  erroreImport: string | null
}

function normalizzaData(v: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, gg, mm, aaaa] = m
    return `${aaaa}-${mm.padStart(2, '0')}-${gg.padStart(2, '0')}`
  }
  return null
}

function normalizzaGenere(v: string): 'M' | 'F' | 'altro' | null {
  const s = v.trim().toLowerCase()
  if (s === 'm' || s === 'maschio') return 'M'
  if (s === 'f' || s === 'femmina') return 'F'
  if (s === 'altro') return 'altro'
  return null
}

function normalizzaSport(v: string): 'padel' | 'calcio' | 'entrambi' | null {
  const s = v.trim().toLowerCase()
  if (s === 'padel') return 'padel'
  if (s === 'calcio') return 'calcio'
  if (s === 'entrambi' || s === 'padel e calcio') return 'entrambi'
  return null
}

function normalizzaBooleano(v: string): boolean {
  return ['si', 'sì', '1', 'true', 'x'].includes(v.trim().toLowerCase())
}

function validaRiga(
  grezza: Record<string, string>,
  emailViste: Set<string>,
  emailEsistenti: Set<string>,
): { dati: DatiRigaValida | null; errore: string | null } {
  const nome = (grezza.nome ?? '').trim()
  const cognome = (grezza.cognome ?? '').trim()
  const email = (grezza.email ?? '').trim().toLowerCase()

  if (!nome) return { dati: null, errore: 'Nome mancante' }
  if (!cognome) return { dati: null, errore: 'Cognome mancante' }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { dati: null, errore: 'Email mancante o non valida' }
  }
  if (emailViste.has(email)) return { dati: null, errore: 'Email duplicata nel file' }
  if (emailEsistenti.has(email)) return { dati: null, errore: 'Email già registrata nel circolo' }

  const data_nascita = normalizzaData((grezza.data_nascita ?? '').trim())
  if (!data_nascita) return { dati: null, errore: 'Data di nascita mancante o non in formato AAAA-MM-GG' }

  const genere = normalizzaGenere(grezza.genere ?? '')
  if (!genere) return { dati: null, errore: 'Genere non valido (usa M, F o altro)' }

  const sport_preferito = normalizzaSport(grezza.sport_preferito ?? '')
  if (!sport_preferito) return { dati: null, errore: 'Sport preferito non valido (padel, calcio o entrambi)' }

  const is_allenatore = normalizzaBooleano(grezza.is_allenatore ?? '')
  const e_allenatore = normalizzaBooleano(grezza.e_allenatore ?? '')
  if (e_allenatore && sport_preferito === 'entrambi') {
    return { dati: null, errore: 'Un istruttore deve avere sport_preferito padel o calcio, non entrambi' }
  }

  const telefono = (grezza.telefono ?? '').trim()
  return {
    dati: { nome, cognome, email, data_nascita, genere, sport_preferito, telefono: telefono || undefined, is_allenatore, e_allenatore },
    errore: null,
  }
}

async function importaRiga(
  clientTemporaneo: SupabaseClient,
  dati: DatiRigaValida,
): Promise<{ ok: true } | { ok: false; messaggio: string }> {
  const { data, error } = await clientTemporaneo.auth.signUp({
    email: dati.email,
    password: PASSWORD_PROVVISORIA,
  })
  if (error) return { ok: false, messaggio: 'Account: ' + error.message }
  if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
    return { ok: false, messaggio: 'Esiste già un account con questa email.' }
  }

  const { error: errIns } = await supabase.from('soci').insert({
    id: data.user.id,
    nome: dati.nome,
    cognome: dati.cognome,
    email: dati.email,
    telefono: dati.telefono || null,
    data_nascita: dati.data_nascita,
    genere: dati.genere,
    sport_preferito: dati.sport_preferito,
    is_admin: false,
    is_allenatore: dati.is_allenatore,
    e_allenatore: dati.e_allenatore,
  })
  if (errIns) return { ok: false, messaggio: 'Account creato ma scheda non salvata: ' + errIns.message }
  return { ok: true }
}

function attesa(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function scaricaModello(): void {
  const csv = costruisciCsv([
    {
      nome: 'Mario',
      cognome: 'Rossi',
      email: 'mario.rossi@esempio.it',
      data_nascita: '1990-05-14',
      genere: 'M',
      sport_preferito: 'padel',
      telefono: '3331234567',
      is_allenatore: '',
      e_allenatore: '',
    },
  ])
  scaricaCsv('modello_giocatori.csv', csv)
}

function IconaStato({ stato }: { stato: StatoRiga }) {
  if (stato === 'ok') return <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
  if (stato === 'errore') return <span style={{ color: '#dc2626', fontWeight: 700 }}>✕</span>
  if (stato === 'in_corso') return <span style={{ color: '#c8972e', fontWeight: 700 }}>…</span>
  return <span style={{ color: 'var(--ink-3)' }}>—</span>
}

export default function ImportaGiocatoriCsv({ onChiudi }: { onChiudi: () => void }) {
  const queryClient = useQueryClient()
  const { data: soci } = useSoci()
  const fileRef = useRef<HTMLInputElement>(null)
  const fermaRef = useRef(false)

  const [righe, setRighe] = useState<RigaImport[]>([])
  const [nomeFile, setNomeFile] = useState('')
  const [erroreFile, setErroreFile] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [indiceCorrente, setIndiceCorrente] = useState(0)
  const [completato, setCompletato] = useState(false)
  const [interrotto, setInterrotto] = useState(false)

  const validi = righe.filter((r) => r.dati && r.stato !== 'ok')
  const conErrore = righe.filter((r) => r.erroreValidazione)
  const importati = righe.filter((r) => r.stato === 'ok').length
  const falliti = righe.filter((r) => r.stato === 'errore').length

  async function scegliFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErroreFile('')
    setCompletato(false)
    setNomeFile(file.name)

    const testo = await file.text()
    const grezze = leggiCsv(testo)
    if (grezze.length === 0) {
      setErroreFile('Il file è vuoto o non è stato riconosciuto come CSV.')
      setRighe([])
      return
    }

    const emailEsistenti = new Set((soci ?? []).map((s) => (s.email ?? '').toLowerCase()))
    const emailViste = new Set<string>()
    const risultato = grezze.map((grezza, i): RigaImport => {
      const { dati, errore } = validaRiga(grezza, emailViste, emailEsistenti)
      if (dati) emailViste.add(dati.email)
      return { numero: i + 2, dati, erroreValidazione: errore, stato: 'in_attesa', erroreImport: null }
    })
    setRighe(risultato)
  }

  async function eseguiImport() {
    fermaRef.current = false
    setInCorso(true)
    setCompletato(false)
    setInterrotto(false)

    const clientTemporaneo = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const daImportare = righe
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.dati && r.stato !== 'ok')

    for (let k = 0; k < daImportare.length; k++) {
      if (fermaRef.current) { setInterrotto(true); break }
      const { i } = daImportare[k]
      setIndiceCorrente(k + 1)
      setRighe((prev) => prev.map((x, idx) => (idx === i ? { ...x, stato: 'in_corso' } : x)))

      const dati = righe[i].dati as DatiRigaValida
      const esito = await importaRiga(clientTemporaneo, dati)

      setRighe((prev) =>
        prev.map((x, idx) =>
          idx === i
            ? esito.ok
              ? { ...x, stato: 'ok', erroreImport: null }
              : { ...x, stato: 'errore', erroreImport: esito.messaggio }
            : x,
        ),
      )

      if (k < daImportare.length - 1 && !fermaRef.current) await attesa(ATTESA_MS)
    }

    setInCorso(false)
    setCompletato(true)
    queryClient.invalidateQueries({ queryKey: ['soci'] })
  }

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="eyebrow">Import massivo da CSV</div>

      <p className="sub mb-2">
        Colonne obbligatorie: <code>{COLONNE_OBBLIGATORIE.join(', ')}</code>.
        Facoltative: <code>{COLONNE_FACOLTATIVE.join(', ')}</code>.
        Genere: <code>M</code>/<code>F</code>/<code>altro</code> · Sport: <code>padel</code>/<code>calcio</code>/<code>entrambi</code> ·
        Data: <code>AAAA-MM-GG</code>.
      </p>
      <p className="sub mb-3">
        A tutti i giocatori importati viene assegnata la password provvisoria{' '}
        <strong>{PASSWORD_PROVVISORIA}</strong>: comunicala ai soci, che potranno cambiarla al primo accesso.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondario btn-mini" onClick={scaricaModello} disabled={inCorso}>
          Scarica modello CSV
        </button>
        <button type="button" className="btn btn-secondario btn-mini" onClick={() => fileRef.current?.click()} disabled={inCorso}>
          {nomeFile || 'Scegli file CSV…'}
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={scegliFile} />
      </div>

      {erroreFile && <p className={`mt-2 ${classiErrore}`}>{erroreFile}</p>}

      {righe.length > 0 && (
        <>
          <p className="sub mt-3 mb-2">
            {righe.length} righe lette · {righe.length - conErrore.length} valide
            {conErrore.length > 0 && ` · ${conErrore.length} con errori (verranno saltate)`}
          </p>

          <div style={{ maxHeight: '16rem', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.4rem 0.6rem' }}>#</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Giocatore</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Email</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Esito</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.35rem 0.6rem', color: 'var(--ink-3)' }}>{r.numero}</td>
                    <td style={{ padding: '0.35rem 0.6rem' }}>
                      {r.dati ? `${r.dati.cognome} ${r.dati.nome}` : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.35rem 0.6rem' }}>{r.dati?.email ?? '—'}</td>
                    <td style={{ padding: '0.35rem 0.6rem' }}>
                      {r.erroreValidazione ? (
                        <span className={classiErrore}>{r.erroreValidazione}</span>
                      ) : r.erroreImport ? (
                        <span className={classiErrore}>{r.erroreImport}</span>
                      ) : (
                        <IconaStato stato={r.stato} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inCorso && (
            <p className="sub mt-2">
              Importazione in corso… riga {indiceCorrente} di {righe.length - conErrore.length} (~11s a riga per i limiti
              di Supabase, non chiudere la pagina).
            </p>
          )}

          {completato && (
            <p className={`mt-2 ${!interrotto && falliti === 0 ? classiOk : classiErrore}`}>
              {interrotto ? 'Import interrotto: ' : 'Import completato: '}
              {importati} giocatori creati{falliti > 0 ? `, ${falliti} falliti` : ''}
              {interrotto ? `, ${validi.length} rimasti da importare.` : '.'}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-aggiungi"
              disabled={inCorso || validi.length === 0}
              onClick={eseguiImport}
            >
              {inCorso ? 'Importazione in corso…' : `Importa ${validi.length} giocatori`}
            </button>
            {inCorso && (
              <button type="button" className="btn btn-pericolo" onClick={() => { fermaRef.current = true }}>
                Interrompi
              </button>
            )}
            {!inCorso && (
              <button type="button" className="btn btn-secondario" onClick={onChiudi}>
                Chiudi
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
