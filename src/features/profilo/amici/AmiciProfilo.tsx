import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, eDuplicato, messaggioErrore } from '@/lib/errori'
import { titleCase, inizialiDaEtichetta } from '@/lib/formato'
import { classiInput } from '@/components/stili'
import Avatar from '@/components/Avatar'
import { useAmici, type Amicizia, type VoceAmico } from './useAmici'
import { useConversazioni } from '@/features/chat/useChat'
import ChatModal from '@/features/chat/ChatModal'
import DettaglioAmicoModal from './DettaglioAmicoModal'

function MiniAmico({
  voce,
  nonLetti,
  onClick,
}: {
  voce: VoceAmico
  nonLetti: number
  onClick: () => void
}) {
  return (
    <button type="button" className="mini-persona mini-persona-wow" onClick={onClick}>
      <span className="relative">
        <Avatar foto={voce.foto_url} iniziali={inizialiDaEtichetta(voce.etichetta)} titolo={voce.etichetta} size={72} />
        {nonLetti > 0 && <span className="chat-puntino mini-persona-puntino" aria-label={`${nonLetti} messaggi non letti`} />}
      </span>
      <span className="mini-persona-nome">{voce.etichetta}</span>
    </button>
  )
}

function MiniRichiestaInviata({
  voce,
  onAnnulla,
  isPending,
}: {
  voce: VoceAmico
  onAnnulla: () => void
  isPending: boolean
}) {
  return (
    <div className="mini-persona mini-persona-wow">
      <Avatar foto={voce.foto_url} iniziali={inizialiDaEtichetta(voce.etichetta)} titolo={voce.etichetta} size={72} />
      <span className="mini-persona-nome">{voce.etichetta}</span>
      <span className="mini-persona-tag">In attesa</span>
      <button type="button" className="mini-persona-btn mini-persona-btn-pericolo" disabled={isPending} onClick={onAnnulla}>
        Annulla
      </button>
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
      <Avatar foto={voce.foto_url} iniziali={inizialiDaEtichetta(voce.etichetta)} titolo={voce.etichetta} />
      <div className="amici-card-info">
        <div className="amici-card-nome">{voce.etichetta}</div>
        <div className="amici-card-sub">{sotto}</div>
      </div>
      <div className="amici-card-azioni">{children}</div>
    </div>
  )
}

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
  const [dettaglioAmico, setDettaglioAmico] = useState<VoceAmico | null>(null)
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
  // Gli account privati non compaiono nella ricerca per nuove amicizie
  // (restano visibili a chi era già amico prima di diventare privato).
  const selezionabili = amici.sociPubblici.filter((s) => !collegati.has(s.id) && !s.account_privato)

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

  return (
    <div className="flex flex-col gap-6">

      {/* ── Aggiungi un amico ──────────────────────────────── */}
      <section>
        <Eyebrow>Aggiungi un amico</Eyebrow>
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
        <Eyebrow>I tuoi amici</Eyebrow>
        {amici.amici.length === 0 ? (
          <div className="card py-6 text-center text-sm text-ink-3">
            Non hai ancora amici. Cerca un giocatore qui sopra.
          </div>
        ) : (
          <div className="amici-griglia">
            {amici.amici.map((v) => (
              <MiniAmico
                key={v.rec.id}
                voce={v}
                nonLetti={nonLettiPerAmico.get(v.id) ?? 0}
                onClick={() => setDettaglioAmico(v)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Richieste ricevute ─────────────────────────────── */}
      {amici.ricevute.length > 0 && (
        <section>
          <Eyebrow>
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

      {/* ── Richieste inviate ──────────────────────────────── */}
      {amici.inviate.length > 0 && (
        <section>
          <Eyebrow>Richieste inviate</Eyebrow>
          <div className="amici-griglia">
            {amici.inviate.map((v) => (
              <MiniRichiestaInviata
                key={v.rec.id}
                voce={v}
                isPending={amici.rimuovi.isPending}
                onAnnulla={() => amici.rimuovi.mutate(v.rec)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Crea un torneo tra amici ───────────────────────── */}
      <Link to="/tornei?vista=amici" className="btn btn-oro btn-riflesso btn-block text-center">
        Crea un torneo con i tuoi amici
      </Link>

      {dettaglioAmico && (
        <DettaglioAmicoModal
          key={dettaglioAmico.id}
          voce={dettaglioAmico}
          amiciCount={
            amici.amicizieTutte.filter(
              (a) =>
                a.stato === 'accettata' &&
                (a.richiedente === dettaglioAmico.id || a.destinatario === dettaglioAmico.id),
            ).length
          }
          onChat={() => { setChatAmico(dettaglioAmico); setDettaglioAmico(null) }}
          onRimuovi={() => {
            rimuoviConConferma(dettaglioAmico, amici.rimuovi.mutate)
            setDettaglioAmico(null)
          }}
          onChiudi={() => setDettaglioAmico(null)}
        />
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
