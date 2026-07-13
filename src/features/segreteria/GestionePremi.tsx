import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { messaggioErrore } from '@/lib/errori'
import CampoImmagine from '@/components/CampoImmagine'
import {
  SCRIPT_PREMI,
  mancaPremi,
  useModalitaPremi,
  type Premio,
} from '@/features/premi/datiPremi'
import {
  annullaRichiesta,
  cambiaStatoRichiesta,
  creaPremio,
  eliminaPremio,
  impostaNascosto,
  salvaModalitaPremi,
  salvaPremio,
  useTuttiPremi,
  useTutteRichieste,
  type RichiestaConNome,
} from './datiPremiAdmin'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

// Messaggio d'errore: se manca il sistema premi rimanda allo script v1.
function erroreTesto(e: unknown): string {
  return mancaPremi(e)
    ? `Sistema premi non attivo: esegui lo script ${SCRIPT_PREMI} su Supabase.`
    : messaggioErrore(e)
}

function dataIt(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Numero con pulsanti +/− ai bordi (stesso pattern di CampoNumero in
// GestioneCampi.tsx, versione compatta), scrivibile anche a mano. `max`
// facoltativo (illimitato di default, utile per costo/stock).
function CampoNumeroStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
  placeholder?: string
}) {
  const n = parseInt(value, 10)
  const attuale = Number.isFinite(n) ? n : min
  return (
    <div className="stepper-numero stepper-numero-compatta">
      <button
        type="button"
        className="stepper-btn"
        aria-label="Diminuisci"
        disabled={value !== '' && attuale <= min}
        onClick={() => onChange(String(Math.max(min, attuale - 1)))}
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        inputMode="numeric"
        placeholder={placeholder}
        className="stepper-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="stepper-btn"
        aria-label="Aumenta"
        onClick={() => onChange(String(Math.min(max, attuale + 1)))}
      >
        +
      </button>
    </div>
  )
}

// (Fase 8f) Segreteria · premi: interruttore modalità, catalogo, richieste.
export default function GestionePremi() {
  return (
    <div>
      <InterruttorePremi />
      <Catalogo />
      <Richieste />
    </div>
  )
}

// ── Interruttore modalità premi ──
function InterruttorePremi() {
  const qc = useQueryClient()
  const { data: attiva } = useModalitaPremi()
  const [msg, setMsg] = useState<Esito>(null)

  const cambia = useMutation({
    mutationFn: (v: boolean) => salvaModalitaPremi(v),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['modalita-premi'] })
      setMsg({
        tipo: 'ok',
        testo: v
          ? 'Premi attivi: i crediti tornano visibili e ricominciano ad accumularsi.'
          : 'Premi sospesi: i crediti sono nascosti e non si accumulano.',
      })
    },
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: erroreTesto(e) }),
  })

  return (
    <div>
      <div className="eyebrow">Modalità premi</div>
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{attiva ? 'Premi attivi' : 'Premi sospesi'}</div>
            <p className="sub m-0">
              Quando è spenta, i crediti non si accumulano e restano nascosti ai soci.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!attiva}
            disabled={cambia.isPending}
            onClick={() => {
              setMsg(null)
              cambia.mutate(!attiva)
            }}
            className={
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ' +
              (attiva ? 'bg-verde-600' : 'bg-black/20')
            }
            title={attiva ? 'Disattiva i premi' : 'Attiva i premi'}
          >
            <span
              className={
                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition ' +
                (attiva ? 'translate-x-5' : 'translate-x-0.5')
              }
            />
          </button>
        </div>
        {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
      </div>
    </div>
  )
}

// ── Catalogo (form + lista) ──
function Catalogo() {
  const { data, isLoading, error } = useTuttiPremi()

  return (
    <div>
      <div className="eyebrow">Catalogo premi</div>
      <div className="card">
        <FormNuovoPremio />
        <div className="mt-4">
          {isLoading ? (
            <p className="text-ink-2">Caricamento…</p>
          ) : error ? (
            <p className={classiErrore}>{erroreTesto(error)}</p>
          ) : (data ?? []).length === 0 ? (
            <p className="text-ink-2">Catalogo vuoto. Aggiungi il primo premio qui sopra.</p>
          ) : (
            <div className="premi-griglia">
              {(data ?? []).map((p) => <CardPremio key={p.id} premio={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FormNuovoPremio() {
  const qc = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [costo, setCosto] = useState('')
  const [stock, setStock] = useState('')
  const [immagine, setImmagine] = useState<string | null>(null)
  const [msg, setMsg] = useState<Esito>(null)

  const crea = useMutation({
    mutationFn: async () => {
      const n = nome.trim()
      if (!n) throw new Error('Inserisci il nome del premio.')
      const c = parseInt(costo, 10)
      if (!Number.isInteger(c) || c < 0) throw new Error("Il costo dev'essere un numero ≥ 0.")
      let s: number | null = null
      const sr = stock.trim()
      if (sr !== '') {
        s = parseInt(sr, 10)
        if (!Number.isInteger(s) || s < 0)
          throw new Error('Lo stock dev’essere un numero ≥ 0 (oppure lascialo vuoto = illimitato).')
      }
      await creaPremio({ nome: n, descrizione: descrizione.trim() || null, costo: c, stock: s, immagine })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['premi-admin'] })
      qc.invalidateQueries({ queryKey: ['premi-catalogo'] })
      setNome('')
      setDescrizione('')
      setCosto('')
      setStock('')
      setImmagine(null)
      setAperto(false)
      setMsg({ tipo: 'ok', testo: 'Premio aggiunto al catalogo.' })
    },
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: erroreTesto(e) }),
  })

  if (!aperto)
    return (
      <button type="button" className="btn btn-secondario" onClick={() => setAperto(true)}>
        ＋ Aggiungi nuovo premio
      </button>
    )

  return (
    <form
      className="rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault()
        setMsg(null)
        crea.mutate()
      }}
    >
      <label className="block">
        <span className="etichetta !mb-1">Nome</span>
        <input
          type="text"
          maxLength={60}
          className="w-full !mt-0"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </label>
      <div className="mt-4 max-w-xs">
        <CampoImmagine img={immagine} onCambia={setImmagine} aspetto="4/3" etichetta="Immagine (facoltativa)" />
      </div>
      <label className="mt-4 block">
        <span className="etichetta !mb-1">Descrizione (facoltativa)</span>
        <textarea
          maxLength={300}
          rows={2}
          className="w-full !mt-0"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
        />
      </label>
      <div className="mt-2 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="etichetta !mb-1">Costo (crediti)</span>
          <CampoNumeroStepper value={costo} onChange={setCosto} />
        </label>
        <label className="block">
          <span className="etichetta !mb-1">Stock (vuoto = ∞)</span>
          <CampoNumeroStepper value={stock} onChange={setStock} placeholder="∞" />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondario !mt-0"
            onClick={() => { setAperto(false); setMsg(null) }}
          >
            Annulla
          </button>
          <button type="submit" className="btn !mt-0" disabled={crea.isPending}>
            Aggiungi
          </button>
        </div>
      </div>
      {msg && <p className={`mt-2 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </form>
  )
}

function CardPremio({ premio }: { premio: Premio }) {
  const [modificaAperta, setModificaAperta] = useState(false)

  return (
    <>
      <div className={'premio-card premio-card-admin premio-minicard' + (premio.nascosto ? ' spento' : '')}>
        <div className="premio-v1-top">
          <div className="min-w-0">
            <div className="premio-nome">{premio.nome}</div>
            {premio.nascosto && <span className="stato-pill consegnato mt-1 inline-block">Nascosto</span>}
          </div>
          <div className="premio-v1-prezzo">
            <div className="num">{premio.costo ?? 0}</div>
            <div className="et">Crediti</div>
          </div>
        </div>
        <div className="premio-v1-stock">
          {premio.stock != null ? `${premio.stock} disponibili` : 'Illimitato'}
        </div>
        {premio.descrizione && <div className="premio-descr mt-2">{premio.descrizione}</div>}
        {premio.immagine && (
          <div className="premio-v1-img">
            <img src={premio.immagine} alt="" />
          </div>
        )}
        <button
          type="button"
          className="premio-modifica-btn premio-modifica-btn-assoluta"
          title="Modifica premio"
          aria-label="Modifica premio"
          onClick={() => setModificaAperta(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
      </div>
      {modificaAperta && (
        <ModaleModificaPremio premio={premio} onChiudi={() => setModificaAperta(false)} />
      )}
    </>
  )
}

// Modale di modifica: unico punto dove si cambiano titolo/descrizione/costo/
// stock/immagine, si nasconde o si elimina il premio — la card del catalogo è
// ormai di sola lettura (vedi CardPremio sopra).
function ModaleModificaPremio({ premio, onChiudi }: { premio: Premio; onChiudi: () => void }) {
  const qc = useQueryClient()
  const [nome, setNome] = useState(premio.nome)
  const [descrizione, setDescrizione] = useState(premio.descrizione ?? '')
  const [costo, setCosto] = useState(String(premio.costo ?? 0))
  const [stock, setStock] = useState(premio.stock != null ? String(premio.stock) : '')
  const [immagine, setImmagine] = useState<string | null>(premio.immagine)
  const [msg, setMsg] = useState<Esito>(null)

  const invalida = () => {
    qc.invalidateQueries({ queryKey: ['premi-admin'] })
    qc.invalidateQueries({ queryKey: ['premi-catalogo'] })
  }

  const salva = useMutation({
    mutationFn: async () => {
      const n = nome.trim()
      if (!n) throw new Error('Il nome non può essere vuoto.')
      const c = parseInt(costo, 10)
      if (!Number.isInteger(c) || c < 0) throw new Error('Costo non valido.')
      let s: number | null = null
      const sr = stock.trim()
      if (sr !== '') {
        s = parseInt(sr, 10)
        if (!Number.isInteger(s) || s < 0) throw new Error('Stock non valido.')
      }
      await salvaPremio(premio.id, { nome: n, descrizione: descrizione.trim() || null, costo: c, stock: s, immagine })
    },
    onSuccess: () => {
      invalida()
      onChiudi()
    },
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: erroreTesto(e) }),
  })

  const nascondi = useMutation({
    mutationFn: () => impostaNascosto(premio.id, !premio.nascosto),
    onSuccess: invalida,
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: erroreTesto(e) }),
  })

  const elimina = useMutation({
    mutationFn: () => eliminaPremio(premio.id),
    onSuccess: () => { invalida(); onChiudi() },
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: erroreTesto(e) }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <div className="card modale-leggibile w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg">Modifica premio</h2>
        <label className="block">
          <span className="etichetta !mb-1">Nome</span>
          <input
            type="text"
            maxLength={60}
            className="w-full !mt-0"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>
        <div className="mt-4 max-w-[10rem]">
          <CampoImmagine img={immagine} onCambia={setImmagine} aspetto="1/1" etichetta="Immagine (facoltativa)" />
        </div>
        <label className="mt-4 block">
          <span className="etichetta !mb-1">Descrizione (facoltativa)</span>
          <textarea
            maxLength={300}
            rows={2}
            className="w-full !mt-0"
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
          />
        </label>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="etichetta !mb-1">Costo (crediti)</span>
            <CampoNumeroStepper value={costo} onChange={setCosto} />
          </label>
          <label className="block">
            <span className="etichetta !mb-1">Stock (vuoto = ∞)</span>
            <CampoNumeroStepper value={stock} onChange={setStock} placeholder="∞" />
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border2)] pt-3">
          <button
            type="button"
            className="btn btn-secondario btn-mini !mt-0"
            disabled={nascondi.isPending}
            onClick={() => { setMsg(null); nascondi.mutate() }}
          >
            {premio.nascosto ? 'Mostra' : 'Nascondi'}
          </button>
          <button
            type="button"
            className="btn btn-pericolo btn-mini !mt-0"
            disabled={elimina.isPending}
            onClick={() => {
              setMsg(null)
              if (window.confirm(`Eliminare "${premio.nome}" dal catalogo? Le richieste già fatte restano nello storico.`))
                elimina.mutate()
            }}
          >
            Elimina
          </button>
        </div>

        {msg && <p className={`mt-3 ${classiErrore}`}>{msg.testo}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="btn flex-1 !mt-0"
            disabled={salva.isPending}
            onClick={() => { setMsg(null); salva.mutate() }}
          >
            Salva modifiche
          </button>
          <button type="button" className="btn btn-secondario flex-1 !mt-0" onClick={onChiudi}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 10
const PAGE_STEP = 5

// ── Richieste ──
function Richieste() {
  const { data, isLoading, error } = useTutteRichieste()
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')
  const [visibili, setVisibili] = useState(PAGE_SIZE)

  const tutte = (data ?? []).slice().sort(
    (a, b) => new Date(b.creato_il).getTime() - new Date(a.creato_il).getTime(),
  )

  const filtrate = tutte.filter((r) => {
    const ts = new Date(r.creato_il).getTime()
    if (dal && ts < new Date(dal).getTime()) return false
    if (al) {
      const fine = new Date(al)
      fine.setHours(23, 59, 59, 999)
      if (ts > fine.getTime()) return false
    }
    return true
  })

  const mostra = filtrate.slice(0, visibili)
  const ancora = filtrate.length - mostra.length

  function resetFiltri() {
    setDal('')
    setAl('')
    setVisibili(PAGE_SIZE)
  }

  return (
    <div>
      <div className="eyebrow">Richieste di premio</div>
      <div className="card">
        {/* Filtro date */}
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="etichetta !mb-1">Dal</span>
            <input
              type="date"
              className="!mt-0"
              value={dal}
              onChange={(e) => { setDal(e.target.value); setVisibili(PAGE_SIZE) }}
            />
          </label>
          <label className="block">
            <span className="etichetta !mb-1">Al</span>
            <input
              type="date"
              className="!mt-0"
              value={al}
              onChange={(e) => { setAl(e.target.value); setVisibili(PAGE_SIZE) }}
            />
          </label>
          {(dal || al) && (
            <button type="button" className="btn btn-secondario btn-mini !mt-0" onClick={resetFiltri}>
              Azzera filtro
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-ink-2">Caricamento…</p>
        ) : error ? (
          <p className={classiErrore}>{erroreTesto(error)}</p>
        ) : filtrate.length === 0 ? (
          <p className="text-ink-2">{tutte.length === 0 ? 'Nessuna richiesta.' : 'Nessuna richiesta nel periodo selezionato.'}</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {mostra.map((r) => (
                <RigaRichiesta key={r.id} richiesta={r} />
              ))}
            </div>
            {ancora > 0 && (
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/10 py-2 text-sm text-ink-2 hover:bg-black/5"
                onClick={() => setVisibili((v) => v + PAGE_STEP)}
              >
                <span>▼</span>
                <span>Mostra altri {Math.min(ancora, PAGE_STEP)} ({ancora} rimaste)</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function pillStato(stato: string) {
  const m: Record<string, { cls: string; label: string }> = {
    in_attesa: { cls: 'attesa', label: 'In attesa' },
    approvato: { cls: 'approvato', label: 'Approvato' },
    consegnato: { cls: 'consegnato', label: 'Consegnato' },
  }
  const x = m[stato] ?? { cls: 'attesa', label: stato }
  return <span className={`stato-pill ${x.cls}`}>{x.label}</span>
}

function RigaRichiesta({ richiesta: r }: { richiesta: RichiestaConNome }) {
  const qc = useQueryClient()
  const invalida = () => {
    qc.invalidateQueries({ queryKey: ['richieste-admin'] })
    qc.invalidateQueries({ queryKey: ['soci'] })
    qc.invalidateQueries({ queryKey: ['saldo-crediti'] })
  }

  const stato = useMutation({
    mutationFn: (s: 'approvato' | 'consegnato') => cambiaStatoRichiesta(r.id, s),
    onSuccess: invalida,
    onError: (e: unknown) => window.alert('Operazione non riuscita: ' + erroreTesto(e)),
  })
  const annulla = useMutation({
    mutationFn: () => annullaRichiesta(r.id),
    onSuccess: invalida,
    onError: (e: unknown) => window.alert('Operazione non riuscita: ' + erroreTesto(e)),
  })
  const inCorso = stato.isPending || annulla.isPending

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-verde-100 px-3 py-2">
      <div>
        <div className="font-medium">
          {r.chi} — {r.nome_premio}
        </div>
        <div className="text-sm text-ink-3">
          {r.costo_pagato ?? 0} cr · {dataIt(r.creato_il)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {r.stato !== 'in_attesa' && pillStato(r.stato)}
        {r.stato === 'in_attesa' && (
          <button
            type="button"
            className="btn btn-bianco btn-mini !mt-0"
            disabled={inCorso}
            onClick={() => stato.mutate('approvato')}
          >
            Approva
          </button>
        )}
        {r.stato === 'approvato' && (
          <button
            type="button"
            className="btn btn-secondario btn-mini !mt-0"
            disabled={inCorso}
            onClick={() => stato.mutate('consegnato')}
          >
            Consegnato
          </button>
        )}
        {r.stato !== 'consegnato' && (
          <button
            type="button"
            className="btn btn-bianco-rosso btn-mini !mt-0"
            disabled={inCorso}
            onClick={() => {
              if (window.confirm('Eliminare la richiesta? I crediti tornano al socio.'))
                annulla.mutate()
            }}
          >
            Elimina
          </button>
        )}
      </div>
    </div>
  )
}
