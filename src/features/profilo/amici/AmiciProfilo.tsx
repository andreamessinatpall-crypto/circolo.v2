import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, eDuplicato, messaggioErrore } from '@/lib/errori'
import { titleCase } from '@/lib/formato'
import { classiInput } from '@/components/stili'
import { RuoloAvatar } from '@/features/profilo/ruoloBadge'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti } from '@/features/profilo/livelliPunti'
import { MedagliaLv } from '@/features/profilo/MedagliaLv'
import { useAmici, type Amicizia, type VoceAmico } from './useAmici'
import { SportIcona } from '@/components/IconeSport'
import { useConversazioni } from '@/features/chat/useChat'
import ChatModal from '@/features/chat/ChatModal'


function IcoCalendario() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IcoChat() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function IcoBidone() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function CardAmico({
  voce,
  nonLetti,
  onChat,
  onRimuovi,
}: {
  voce: VoceAmico
  nonLetti: number
  onChat: () => void
  onRimuovi: () => void
}) {
  const lv = livelloDaPunti(voce.punti, LIVELLI_PUNTI_DEFAULT)
  const lvNome = LIVELLI_PUNTI_DEFAULT[lv - 1]?.nome ?? ''
  return (
    <div className="amici-card">
      <MedagliaLv punti={voce.punti} />
      <div className="amici-card-info">
        <div className="amici-card-nome">
          {voce.etichetta}
          {voce.sport && <span className="amici-sport-ico"><SportIcona sport={voce.sport} /></span>}
        </div>
        <div className="amici-card-sub">
          {lvNome}
          {' · '}
          {voce.punti} pt
        </div>
        {voce.nPartite > 0 && (
          <div className="amici-card-partite">
            {voce.nPartite} {voce.nPartite === 1 ? 'partita giocata insieme' : 'partite giocate insieme'}
          </div>
        )}
      </div>
      <div className="amici-card-azioni">
        <button
          type="button"
          onClick={onChat}
          className="btn btn-secondario btn-mini relative flex items-center justify-center"
          title="Chat con questo amico"
        >
          <IcoChat />
          {nonLetti > 0 && <span className="chat-puntino" aria-label={`${nonLetti} messaggi non letti`} />}
        </button>
        <Link
          to="/prenota"
          state={{ amicoId: voce.id }}
          className="btn btn-mini flex items-center justify-center"
          title="Prenota con questo amico"
        >
          <IcoCalendario />
        </Link>
        <button
          type="button"
          title="Rimuovi amico"
          className="btn btn-pericolo btn-mini px-2"
          onClick={onRimuovi}
        >
          <IcoBidone />
        </button>
      </div>
    </div>
  )
}

function CardRichiesta({
  voce,
  sotto,
  children,
}: {
  voce: VoceAmico
  sotto: string
  children: React.ReactNode
}) {
  return (
    <div className="amici-card">
      <RuoloAvatar ruolo={voce.ruolo} size={36} />
      <div className="amici-card-info">
        <div className="amici-card-nome">{voce.etichetta}</div>
        <div className="amici-card-sub">{sotto}</div>
      </div>
      <div className="amici-card-azioni">{children}</div>
    </div>
  )
}

function Ico({ children, d }: { children?: React.ReactNode; d?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d ? <path d={d} /> : children}
    </svg>
  )
}

const IcoAmici = <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Ico>
const IcoInbox = <Ico><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Ico>
const IcoSend = <Ico><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Ico>
const IcoPiu = <Ico><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></Ico>

function Eyebrow({ icona, children }: { icona?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="club-sez-header" style={{ marginTop: '0' }}>
      {icona && <span className="club-sez-icona">{icona}</span>}
      <h2 className="club-sez-titolo">{children}</h2>
    </div>
  )
}

function corrispondenze(query: string, etichetta: string): boolean {
  const e = etichetta.toLowerCase()
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .every((t) => e.includes(t))
}

function CercaAmico({
  selezionabili,
  onInvia,
  isPending,
}: {
  selezionabili: import('./useAmici').SocioPubblico[]
  onInvia: (id: string) => void
  isPending: boolean
}) {
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  // Chiude la lista cliccando fuori
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.trim()
  const risultati =
    q.length >= 3
      ? selezionabili.filter((s) => corrispondenze(q, s.etichetta)).slice(0, 12)
      : []

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chi vuoi aggiungere?"
        className={`${classiInput} pr-9`}
        disabled={isPending}
        autoComplete="off"
      />
      {/* Icona lente */}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>

      {/* Lista risultati */}
      {risultati.length > 0 && (
        <div className="cerca-lista">
          {risultati.map((s) => (
            <button
              key={s.id}
              type="button"
              className="cerca-riga"
              onMouseDown={(e) => e.preventDefault()} // evita blur prima del click
              onClick={() => {
                onInvia(s.id)
                setQuery('')
              }}
            >
              <span className="cerca-riga-nome">{titleCase(s.etichetta)}</span>
              <span className="cerca-riga-ico" aria-hidden="true">+</span>
            </button>
          ))}
        </div>
      )}

      {/* Nessun risultato */}
      {q.length >= 3 && risultati.length === 0 && (
        <p className="mt-2 text-xs text-ink-3">Nessun giocatore trovato per «{q}».</p>
      )}
    </div>
  )
}

function rimuoviConConferma(v: VoceAmico, rimuovi: (rec: Amicizia) => void) {
  if (window.confirm('Rimuovere ' + v.etichetta + ' dai tuoi amici?')) rimuovi(v.rec)
}

export default function AmiciProfilo() {
  const { profilo } = useAuth()
  const [msg, setMsg] = useState('')
  const [chatAmico, setChatAmico] = useState<VoceAmico | null>(null)
  const amici = useAmici(profilo!.id)
  const { conversazioni } = useConversazioni(profilo?.id)

  if (!profilo) return null

  const nonLettiPerAmico = new Map(conversazioni.map((c) => [c.altroId, c.nonLetti]))

  if (amici.erroreAmicizie && mancaTabella(amici.erroreAmicizie, 'amicizie')) {
    return (
      <div className="card text-ink-2">
        Esegui lo script <code className="rounded bg-verde-50 px-1">amici.sql</code> su
        Supabase per attivare gli amici.
      </div>
    )
  }

  const collegati = new Set<string>([
    profilo.id,
    ...amici.staffIds,
    ...amici.amici.map((v) => v.id),
    ...amici.ricevute.map((v) => v.id),
    ...amici.inviate.map((v) => v.id),
  ])
  const selezionabili = amici.sociPubblici.filter((s) => !collegati.has(s.id))

  function invia(destinatario: string) {
    setMsg('')
    amici.invia.mutate(destinatario, {
      onError: (e) =>
        setMsg(
          eDuplicato(e)
            ? "C'è già un'amicizia o una richiesta con questo socio."
            : 'Invio non riuscito: ' + messaggioErrore(e),
        ),
    })
  }

  const conta = amici.amici.length
  const nRichieste = amici.ricevute.length

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero strip ─────────────────────────────────────── */}
      <div className="amici-hero-strip">
        <svg width="22" height="20" viewBox="0 0 26 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="6" r="4" />
          <path d="M1 20c0-3.8 3.6-7 8-7" />
          <circle cx="19" cy="7" r="3.5" />
          <path d="M14.5 19.5c.5-3 3-5.5 4.5-5.5" />
          <path d="M1 20h14" />
          <path d="M14.5 19.5H25" />
        </svg>
        <span>
          <strong>{conta}</strong> {conta === 1 ? 'amico' : 'amici'}
        </span>
        {nRichieste > 0 && (
          <>
            <span className="text-ink-3">·</span>
            <span className="amici-n-badge">{nRichieste}</span>
            <span className="text-sm text-ink-2">
              {nRichieste === 1 ? 'nuova richiesta' : 'nuove richieste'}
            </span>
          </>
        )}
      </div>

      {/* ── Richieste ricevute ─────────────────────────────── */}
      {amici.ricevute.length > 0 && (
        <section>
          <Eyebrow icona={IcoInbox}>
            Richieste ricevute{' '}
            <span className="amici-n-badge">{amici.ricevute.length}</span>
          </Eyebrow>
          <div className="flex flex-col gap-2">
            {amici.ricevute.map((v) => (
              <CardRichiesta key={v.rec.id} voce={v} sotto="vuole essere tuo amico">
                <button
                  type="button"
                  className="btn btn-mini"
                  onClick={() => amici.accetta.mutate(v.rec)}
                >
                  Accetta
                </button>
                <button
                  type="button"
                  className="btn btn-pericolo btn-mini"
                  onClick={() => amici.rimuovi.mutate(v.rec)}
                >
                  Rifiuta
                </button>
              </CardRichiesta>
            ))}
          </div>
        </section>
      )}

      {/* ── Aggiungi un amico ──────────────────────────────── */}
      <section>
        <Eyebrow icona={IcoPiu}>Aggiungi un amico</Eyebrow>
        <div className="card">
          <CercaAmico
            selezionabili={selezionabili}
            onInvia={invia}
            isPending={amici.invia.isPending}
          />
          {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
        </div>
      </section>

      {/* ── I tuoi amici ───────────────────────────────────── */}
      <section>
        <Eyebrow icona={IcoAmici}>I tuoi amici</Eyebrow>
        {amici.amici.length === 0 ? (
          <div className="card py-6 text-center text-sm text-ink-3">
            Non hai ancora amici. Cerca un giocatore qui sopra.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {amici.amici.map((v) => (
              <CardAmico
                key={v.rec.id}
                voce={v}
                nonLetti={nonLettiPerAmico.get(v.id) ?? 0}
                onChat={() => setChatAmico(v)}
                onRimuovi={() => rimuoviConConferma(v, amici.rimuovi.mutate)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Richieste inviate ──────────────────────────────── */}
      {amici.inviate.length > 0 && (
        <section>
          <Eyebrow icona={IcoSend}>Richieste inviate</Eyebrow>
          <div className="flex flex-col gap-2">
            {amici.inviate.map((v) => (
              <CardRichiesta key={v.rec.id} voce={v} sotto="in attesa di conferma">
                <button
                  type="button"
                  className="btn btn-secondario btn-mini"
                  onClick={() => amici.rimuovi.mutate(v.rec)}
                >
                  Annulla
                </button>
              </CardRichiesta>
            ))}
          </div>
        </section>
      )}

      {chatAmico && (
        <ChatModal
          key={chatAmico.id}
          profiloId={profilo.id}
          amico={chatAmico}
          onChiudi={() => setChatAmico(null)}
        />
      )}

    </div>
  )
}
