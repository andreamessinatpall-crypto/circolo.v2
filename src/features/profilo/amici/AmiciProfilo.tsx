import { useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, eDuplicato, messaggioErrore } from '@/lib/errori'
import { classiInput } from '@/components/stili'
import { useAmici, type Amicizia, type VoceAmico } from './useAmici'

export default function AmiciProfilo() {
  const { profilo } = useAuth()
  const [msg, setMsg] = useState('')
  const amici = useAmici(profilo!.id)

  if (!profilo) return null

  // Database non ancora predisposto: messaggio guidato (come nella v1).
  if (amici.erroreAmicizie && mancaTabella(amici.erroreAmicizie, 'amicizie')) {
    return (
      <div className="card text-ink-2">
        Esegui lo script <code className="rounded bg-verde-50 px-1">amici.sql</code> su
        Supabase per attivare gli amici.
      </div>
    )
  }

  // Soci selezionabili: tutti tranne te e quelli già collegati/in richiesta.
  const collegati = new Set<string>([
    profilo.id,
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

  return (
    <div className="card">
      <h2 className="mb-4 text-xl">Amici</h2>

      {/* Aggiungi un amico */}
      <label>Cerca un giocatore da aggiungere</label>
      <select
        className={classiInput}
        value=""
        onChange={(e) => {
          if (e.target.value) invia(e.target.value)
        }}
        disabled={amici.invia.isPending}
      >
        <option value="">— Seleziona un giocatore —</option>
        {selezionabili.map((s) => (
          <option key={s.id} value={s.id}>
            {s.etichetta}
          </option>
        ))}
      </select>
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}

      {/* Richieste ricevute */}
      {amici.ricevute.length > 0 && (
        <Sezione titolo="Richieste ricevute">
          {amici.ricevute.map((v) => (
            <Riga key={v.rec.id} etichetta={v.etichetta} sotto="vuole essere tuo amico">
              <Bottone onClick={() => amici.accetta.mutate(v.rec)}>Accetta</Bottone>
              <Bottone variante="pericolo" onClick={() => amici.rimuovi.mutate(v.rec)}>
                Rifiuta
              </Bottone>
            </Riga>
          ))}
        </Sezione>
      )}

      {/* I tuoi amici */}
      <Sezione titolo="I tuoi amici">
        {amici.amici.length === 0 ? (
          <p className="text-sm text-ink-3">
            Non hai ancora amici. Cerca un giocatore qui sopra e invia una richiesta.
          </p>
        ) : (
          amici.amici.map((v) => (
            <Riga key={v.rec.id} etichetta={v.etichetta}>
              <Bottone
                variante="pericolo"
                onClick={() => rimuoviConConferma(v, amici.rimuovi.mutate)}
              >
                Rimuovi
              </Bottone>
            </Riga>
          ))
        )}
      </Sezione>

      {/* Richieste inviate */}
      {amici.inviate.length > 0 && (
        <Sezione titolo="Richieste inviate">
          {amici.inviate.map((v) => (
            <Riga key={v.rec.id} etichetta={v.etichetta} sotto="in attesa di conferma">
              <Bottone variante="secondario" onClick={() => amici.rimuovi.mutate(v.rec)}>
                Annulla
              </Bottone>
            </Riga>
          ))}
        </Sezione>
      )}
    </div>
  )
}

function rimuoviConConferma(v: VoceAmico, rimuovi: (rec: Amicizia) => void) {
  if (window.confirm('Rimuovere ' + v.etichetta + ' dai tuoi amici?')) rimuovi(v.rec)
}

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {titolo}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function Riga({
  etichetta,
  sotto,
  children,
}: {
  etichetta: string
  sotto?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-verde-700/10 px-3 py-2">
      <div>
        <div className="text-sm font-medium text-ink">{etichetta}</div>
        {sotto && <div className="text-xs text-ink-3">{sotto}</div>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

function Bottone({
  children,
  onClick,
  variante = 'principale',
}: {
  children: ReactNode
  onClick: () => void
  variante?: 'principale' | 'secondario' | 'pericolo'
}) {
  const classe = {
    principale: 'btn btn-mini',
    secondario: 'btn btn-secondario btn-mini',
    pericolo: 'btn btn-pericolo btn-mini',
  }
  return (
    <button type="button" onClick={onClick} className={classe[variante]}>
      {children}
    </button>
  )
}
