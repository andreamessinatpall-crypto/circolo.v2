import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { conferma } from '@/lib/dialoghi'
import {
  aggiornaBranding,
  aggiornaRuoloMembro,
  aggiungiMembro,
  attivaDisattivaCircolo,
  cercaSocioPerEmail,
  creaCircolo,
  generaSlug,
  rimuoviMembro,
  useCircoli,
  useMembriCircolo,
} from './datiPiattaforma'
import type { Circolo, MembroCircolo, RuoloCircolo, SocioTrovato } from './tipi'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

const MSG_PERMESSO = 'Permesso negato dal database: questa azione è riservata al super-admin della piattaforma.'

export default function PiattaformaPage() {
  const { data: circoli, isLoading, error } = useCircoli()
  const [selezionato, setSelezionato] = useState<string | null>(null)
  const circoloSelezionato = (circoli ?? []).find((c) => c.id === selezionato) ?? null

  return (
    <div>
      <div className="eyebrow">Piattaforma · Circoli</div>
      <div className="card">
        {isLoading ? (
          <p className="text-ink-2">Caricamento circoli…</p>
        ) : error ? (
          <p className={classiErrore}>Impossibile caricare i circoli: {error.message}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {(circoli ?? []).length === 0 && <p className="text-ink-2">Nessun circolo ancora creato.</p>}
            {(circoli ?? []).map((c) => (
              <RigaCircolo
                key={c.id}
                circolo={c}
                selezionato={selezionato === c.id}
                onSeleziona={() => setSelezionato(selezionato === c.id ? null : c.id)}
              />
            ))}
          </div>
        )}
        <NuovoCircolo circoliEsistenti={circoli ?? []} />
      </div>

      {circoloSelezionato && (
        <>
          <div className="eyebrow">Membri di {circoloSelezionato.nome}</div>
          <div className="card">
            <MembriCircoloSezione circoloId={circoloSelezionato.id} />
          </div>
        </>
      )}
    </div>
  )
}

// ---- Una riga = un circolo ----
function RigaCircolo({
  circolo,
  selezionato,
  onSeleziona,
}: {
  circolo: Circolo
  selezionato: boolean
  onSeleziona: () => void
}) {
  const qc = useQueryClient()
  const [msg, setMsg] = useState<Esito>(null)
  const [modificaAperta, setModificaAperta] = useState(false)
  const [nome, setNome] = useState(circolo.nome)
  const [logoUrl, setLogoUrl] = useState(circolo.logo_url ?? '')
  const [colorePrimario, setColorePrimario] = useState(circolo.colore_primario ?? '#0e4a78')

  const toggleAttivo = useMutation({
    mutationFn: async () => {
      const esito = await attivaDisattivaCircolo(circolo.id, !circolo.attivo)
      if (!esito.ok)
        throw new Error(esito.mancaPermesso ? MSG_PERMESSO : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['circoli'] }),
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const salvaBranding = useMutation({
    mutationFn: async () => {
      const n = nome.trim()
      if (!n) throw new Error('Il nome non può essere vuoto.')
      const esito = await aggiornaBranding(circolo.id, {
        nome: n,
        logo_url: logoUrl.trim() || null,
        colore_primario: colorePrimario || null,
      })
      if (!esito.ok)
        throw new Error(esito.mancaPermesso ? MSG_PERMESSO : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['circoli'] })
      qc.invalidateQueries({ queryKey: ['circolo', circolo.slug] })
      setMsg({ tipo: 'ok', testo: 'Branding aggiornato.' })
      setModificaAperta(false)
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div className="campo-card">
      <div className={`campo-head ${circolo.attivo ? 'campo-head-attivo' : 'campo-head-off'}`}>
        <span className="campo-head-sport">{circolo.nome}</span>
        <span className="campo-head-tag">/{circolo.slug}</span>
        {!circolo.attivo && <span className="campo-head-tag">Disattivato</span>}
        <button
          type="button"
          className="campo-toggle"
          aria-pressed={circolo.attivo}
          title={circolo.attivo ? 'Circolo attivo · clicca per disattivare' : 'Circolo disattivato · clicca per attivare'}
          onClick={() => {
            setMsg(null)
            toggleAttivo.mutate()
          }}
        >
          ⏻
        </button>
      </div>
      <div className="campo-body">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secondario !mt-0" onClick={onSeleziona}>
            {selezionato ? 'Chiudi membri' : 'Gestisci membri'}
          </button>
          <button type="button" className="btn btn-secondario !mt-0" onClick={() => setModificaAperta((v) => !v)}>
            {modificaAperta ? 'Chiudi branding' : 'Modifica branding'}
          </button>
        </div>

        {modificaAperta && (
          <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3">
            <label className="block">
              <span className="etichetta !mb-1">Nome del circolo</span>
              <input type="text" className="campo !mt-0 w-full" value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label className="block">
              <span className="etichetta !mb-1">URL logo (facoltativo)</span>
              <input
                type="text"
                placeholder="https://…"
                className="campo !mt-0 w-full"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="etichetta !mb-1">Colore principale</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-14 cursor-pointer rounded border border-black/10"
                  value={/^#[0-9a-fA-F]{6}$/.test(colorePrimario) ? colorePrimario : '#0e4a78'}
                  onChange={(e) => setColorePrimario(e.target.value)}
                />
                <input
                  type="text"
                  className="campo !mt-0 !w-auto"
                  value={colorePrimario}
                  onChange={(e) => setColorePrimario(e.target.value)}
                />
              </div>
            </label>
            <button
              type="button"
              className="btn !mt-1"
              disabled={salvaBranding.isPending}
              onClick={() => { setMsg(null); salvaBranding.mutate() }}
            >
              Salva branding
            </button>
          </div>
        )}

        {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
      </div>
    </div>
  )
}

// ---- Creazione di un nuovo circolo ----
function NuovoCircolo({ circoliEsistenti }: { circoliEsistenti: Circolo[] }) {
  const qc = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [slugModificato, setSlugModificato] = useState(false)
  const [msg, setMsg] = useState<Esito>(null)

  const crea = useMutation({
    mutationFn: async () => {
      const n = nome.trim()
      const s = (slugModificato ? slug : generaSlug(nome)).trim()
      if (!n) throw new Error('Dai un nome al circolo.')
      if (!s) throw new Error('Lo slug non può essere vuoto.')
      if (circoliEsistenti.some((c) => c.slug === s)) throw new Error('Esiste già un circolo con questo slug.')
      const esito = await creaCircolo(n, s)
      if (!esito.ok) throw new Error(esito.mancaPermesso ? MSG_PERMESSO : 'Creazione non riuscita: ' + (esito.messaggio ?? ''))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['circoli'] })
      setNome('')
      setSlug('')
      setSlugModificato(false)
      setAperto(false)
      setMsg(null)
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  if (!aperto)
    return (
      <button type="button" className="btn btn-secondario mt-3" onClick={() => setAperto(true)}>
        ＋ Nuovo circolo
      </button>
    )

  return (
    <div className="mt-3 rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Nome del circolo"
          className="campo !mt-0 min-w-0 flex-1"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            if (!slugModificato) setSlug(generaSlug(e.target.value))
          }}
        />
        <input
          type="text"
          placeholder="slug-url"
          className="campo !mt-0 !w-auto"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value)
            setSlugModificato(true)
          }}
        />
        <button type="button" className="btn !mt-0" disabled={crea.isPending} onClick={() => { setMsg(null); crea.mutate() }}>
          Crea
        </button>
        <button type="button" className="btn btn-secondario !mt-0" onClick={() => { setAperto(false); setMsg(null) }}>
          Annulla
        </button>
      </div>
      {msg && <p className={`mt-2.5 ${classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}

// ---- Membri di un circolo ----
function MembriCircoloSezione({ circoloId }: { circoloId: string }) {
  const { data: membri, isLoading, error } = useMembriCircolo(circoloId)

  return (
    <div className="flex flex-col gap-2.5">
      {isLoading ? (
        <p className="text-ink-2">Caricamento membri…</p>
      ) : error ? (
        <p className={classiErrore}>Impossibile caricare i membri: {error.message}</p>
      ) : (membri ?? []).length === 0 ? (
        <p className="text-ink-2">Nessun membro in questo circolo.</p>
      ) : (
        (membri ?? []).map((m) => <RigaMembro key={m.id} membro={m} />)
      )}
      <AggiungiMembro circoloId={circoloId} membriEsistenti={membri ?? []} />
    </div>
  )
}

function RigaMembro({ membro }: { membro: MembroCircolo }) {
  const qc = useQueryClient()
  const [ruolo, setRuolo] = useState<RuoloCircolo>(membro.ruolo)
  const [puoDareLezioni, setPuoDareLezioni] = useState(membro.puo_dare_lezioni)
  const [msg, setMsg] = useState<Esito>(null)

  const salva = useMutation({
    mutationFn: async () => {
      const esito = await aggiornaRuoloMembro(membro.id, {
        ruolo,
        puo_dare_lezioni: ruolo === 'collaboratore' ? puoDareLezioni : false,
      })
      if (!esito.ok) throw new Error(esito.mancaPermesso ? MSG_PERMESSO : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soci_circoli', membro.circolo_id] })
      setMsg({ tipo: 'ok', testo: 'Ruolo aggiornato.' })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const rimuovi = useMutation({
    mutationFn: async () => {
      const esito = await rimuoviMembro(membro.id)
      if (!esito.ok) throw new Error(esito.mancaPermesso ? MSG_PERMESSO : 'Rimozione non riuscita: ' + (esito.messaggio ?? ''))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['soci_circoli', membro.circolo_id] }),
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {membro.socio?.nome} {membro.socio?.cognome}
        </div>
        <div className="truncate text-xs text-ink-3">{membro.socio?.email}</div>
      </div>
      <select className="campo !mt-0 !w-auto" value={ruolo} onChange={(e) => setRuolo(e.target.value as RuoloCircolo)}>
        <option value="socio">Socio</option>
        <option value="collaboratore">Collaboratore</option>
        <option value="gestore">Gestore</option>
      </select>
      {ruolo === 'collaboratore' && (
        <label className="flex items-center gap-1.5 text-sm text-ink-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-verde-600"
            checked={puoDareLezioni}
            onChange={(e) => setPuoDareLezioni(e.target.checked)}
          />
          Può dare lezioni
        </label>
      )}
      <button
        type="button"
        className="btn !mt-0 !w-auto !px-3 !py-1.5 text-sm"
        disabled={salva.isPending}
        onClick={() => { setMsg(null); salva.mutate() }}
      >
        Salva
      </button>
      <button
        type="button"
        title="Rimuovi dal circolo"
        disabled={rimuovi.isPending}
        onClick={async () => {
          if (await conferma(`Rimuovere ${membro.socio?.nome} ${membro.socio?.cognome} dal circolo?`, { pericolo: true, labelConferma: 'Rimuovi' }))
            rimuovi.mutate()
        }}
        className="rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-black/5 hover:text-ink"
      >
        🗑
      </button>
      {msg && <p className={`w-full ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}

// ---- Aggiunta di un membro esistente (ricerca per email) ----
function AggiungiMembro({ circoloId, membriEsistenti }: { circoloId: string; membriEsistenti: MembroCircolo[] }) {
  const qc = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [termine, setTermine] = useState('')
  const [risultati, setRisultati] = useState<SocioTrovato[]>([])
  const [selezionato, setSelezionato] = useState<SocioTrovato | null>(null)
  const [ruolo, setRuolo] = useState<RuoloCircolo>('socio')
  const [msg, setMsg] = useState<Esito>(null)

  const cerca = useMutation({
    mutationFn: async () => cercaSocioPerEmail(termine),
    onSuccess: (res) => setRisultati(res),
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const aggiungi = useMutation({
    mutationFn: async () => {
      if (!selezionato) throw new Error('Cerca e seleziona un socio.')
      const esito = await aggiungiMembro(circoloId, selezionato.id, ruolo)
      if (!esito.ok) throw new Error(esito.mancaPermesso ? MSG_PERMESSO : esito.messaggio ?? 'Aggiunta non riuscita.')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soci_circoli', circoloId] })
      setTermine('')
      setRisultati([])
      setSelezionato(null)
      setRuolo('socio')
      setAperto(false)
      setMsg(null)
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const giaMembro = (id: string) => membriEsistenti.some((m) => m.socio_id === id)

  if (!aperto)
    return (
      <button type="button" className="btn btn-secondario mt-3" onClick={() => setAperto(true)}>
        ＋ Aggiungi membro
      </button>
    )

  return (
    <div className="mt-3 rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          placeholder="Cerca per email (min 3 caratteri)"
          className="campo !mt-0 min-w-0 flex-1"
          value={termine}
          onChange={(e) => {
            setTermine(e.target.value)
            setSelezionato(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setMsg(null)
              cerca.mutate()
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondario !mt-0"
          disabled={cerca.isPending || termine.trim().length < 3}
          onClick={() => { setMsg(null); cerca.mutate() }}
        >
          Cerca
        </button>
      </div>

      {risultati.length > 0 && !selezionato && (
        <div className="mt-2 flex flex-col gap-1.5">
          {risultati.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={giaMembro(s.id)}
              className="rounded-lg border border-black/10 px-3 py-2 text-left text-sm hover:bg-black/5 disabled:opacity-40"
              onClick={() => setSelezionato(s)}
            >
              {s.nome} {s.cognome} — {s.email}
              {giaMembro(s.id) ? ' (già membro)' : ''}
            </button>
          ))}
        </div>
      )}

      {selezionato && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm">
            <strong>{selezionato.nome} {selezionato.cognome}</strong> · ruolo:
          </span>
          <select className="campo !mt-0 !w-auto" value={ruolo} onChange={(e) => setRuolo(e.target.value as RuoloCircolo)}>
            <option value="socio">Socio</option>
            <option value="collaboratore">Collaboratore</option>
            <option value="gestore">Gestore</option>
          </select>
          <button type="button" className="btn !mt-0" disabled={aggiungi.isPending} onClick={() => { setMsg(null); aggiungi.mutate() }}>
            Aggiungi al circolo
          </button>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button type="button" className="btn btn-secondario !mt-0" onClick={() => { setAperto(false); setMsg(null) }}>
          Chiudi
        </button>
      </div>
      {msg && <p className={`mt-2.5 ${classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
