import { useState } from 'react'
import { messaggioErrore, mancaTabella } from '@/lib/errori'
import { dataEstesa } from '@/lib/formato'
import { classiOk } from '@/components/stili'
import { oraLocale } from '@/features/prenotazioni/orari'
import type { Campo, Sport } from '@/features/prenotazioni/tipi'
import { useRichiesteRicevute, campiLiberi, type RichiestaLezione } from './useRichiesteLezione'

const ETICHETTE_SPORT: Record<Sport, string> = { padel: 'Padel', calcio: 'Calcio' }

function IcoRichiesta() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// Sezione dentro la tab Lezioni del profilo istruttore: richieste di lezione
// private ricevute (Fase 5), con accetta (scegliendo il campo libero) o rifiuta.
export default function RichiesteLezioneSezione({
  istruttoreId,
  etichette,
}: {
  istruttoreId: string
  etichette: Map<string, string>
}) {
  const { richieste, caricamento, errore, accetta, rifiuta } = useRichiesteRicevute(istruttoreId)
  const [accettando, setAccettando] = useState<RichiestaLezione | null>(null)
  const [campi, setCampi] = useState<Campo[]>([])
  const [campoScelto, setCampoScelto] = useState('')
  const [caricamentoCampi, setCaricamentoCampi] = useState(false)

  if (errore) {
    return (
      <p className="msg-errore">
        {mancaTabella(errore, 'richieste_lezione')
          ? 'Esegui lo script tappa53-richieste-lezione.sql su Supabase per attivare questa sezione.'
          : messaggioErrore(errore)}
      </p>
    )
  }
  if (caricamento) return <p className="sub">Caricamento…</p>

  const inAttesa = richieste.filter((r) => r.stato === 'in_attesa')
  if (inAttesa.length === 0) return null

  async function apriAccetta(r: RichiestaLezione) {
    setAccettando(r)
    setCampoScelto('')
    setCaricamentoCampi(true)
    try {
      setCampi(await campiLiberi(r.sport, r.inizio, r.fine))
    } finally {
      setCaricamentoCampi(false)
    }
  }

  function confermaAccetta() {
    if (!accettando) return
    const campo = campi.find((c) => String(c.id) === campoScelto)
    if (!campo) return
    accetta.mutate({ richiesta: accettando, campo }, { onSuccess: () => setAccettando(null) })
  }

  return (
    <div className="card sezione-moderna" style={{ marginTop: '0.75rem' }}>
      <div className="sezione-moderna-head">
        <span className="sezione-moderna-icona"><IcoRichiesta /></span>
        <div className="sezione-moderna-testi">
          <h3 className="sezione-moderna-titolo">Richieste di lezione</h3>
          <p className="sezione-moderna-sub">Da accettare o rifiutare</p>
        </div>
        <span className="sezione-moderna-pill ok">{inAttesa.length}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {inAttesa.map((r) => (
          <div key={r.id} className="richiesta-lezione-riga">
            <span className="richiesta-lezione-info">
              <strong>{etichette.get(r.socio_id) ?? 'Socio'}</strong>
              <span className="richiesta-lezione-sport">{ETICHETTE_SPORT[r.sport]}</span>
              <span className="richiesta-lezione-quando">
                {dataEstesa(r.inizio.slice(0, 10))} · {oraLocale(new Date(r.inizio))}–{oraLocale(new Date(r.fine))}
              </span>
            </span>

            {accettando?.id === r.id ? (
              <div className="flex flex-col gap-2" style={{ width: '100%' }}>
                {caricamentoCampi ? (
                  <p className="sub">Verifico campi liberi…</p>
                ) : campi.length === 0 ? (
                  <p className="msg-errore">Nessun campo libero per quell'orario.</p>
                ) : (
                  <>
                    <select value={campoScelto} onChange={(e) => setCampoScelto(e.target.value)}>
                      <option value="">Scegli il campo…</option>
                      {campi.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.nome}</option>
                      ))}
                    </select>
                    {campoScelto && (
                      <p className={classiOk}>✓ Campo disponibile per questo orario</p>
                    )}
                  </>
                )}
                {accetta.error && <p className="msg-errore">{messaggioErrore(accetta.error)}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-mini"
                    disabled={!campoScelto || accetta.isPending}
                    onClick={confermaAccetta}
                  >
                    {accetta.isPending ? 'Confermo…' : 'Conferma'}
                  </button>
                  <button type="button" className="btn btn-secondario btn-mini" onClick={() => setAccettando(null)}>
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" className="btn btn-mini" onClick={() => apriAccetta(r)}>
                  Accetta
                </button>
                <button
                  type="button"
                  className="btn btn-pericolo btn-mini"
                  onClick={() => rifiuta.mutate(r)}
                  disabled={rifiuta.isPending}
                >
                  Rifiuta
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
