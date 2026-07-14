import { useEffect, useState } from 'react'
import { messaggioErrore } from '@/lib/errori'
import { etichettaSport } from '@/lib/formato'
import type { Campo, Sport } from '@/features/prenotazioni/tipi'
import { campiLiberi } from './useRichiesteLezione'
import { useCreaLezioneGruppo } from './useLezioniGruppo'

function IcoGruppo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IcoChiudi() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Card dentro VistaLezioni.tsx: l'istruttore fissa data/ora di una lezione
// di gruppo, i giocatori si iscrivono da soli dalla card gemella in Area
// Club (CardLezioniGruppo). Una volta creata è una prenotazione come le
// altre (allenamento=true, lezione_gruppo=true, tappa91): compare da sola
// nell'elenco sotto, gestibile come qualunque altro allenamento (annulla,
// aggiungi/togli giocatori) — qui serve solo il modulo di creazione.
export default function CreaLezioneGruppo({
  istruttoreId,
  sport,
}: {
  istruttoreId: string
  sport: string
}) {
  const [modaleAperta, setModaleAperta] = useState(false)

  return (
    <>
      <div className="card sezione-moderna" style={{ marginTop: '0.75rem' }}>
        <div className="sezione-moderna-head">
          <span className="sezione-moderna-icona"><IcoGruppo /></span>
          <div className="sezione-moderna-testi">
            <h3 className="sezione-moderna-titolo">Lezioni di gruppo</h3>
            <p className="sezione-moderna-sub">Fissa data e ora: i giocatori si iscrivono da Area Club</p>
          </div>
        </div>

        <button type="button" className="btn btn-sm" onClick={() => setModaleAperta(true)}>
          + Fissa una lezione di gruppo
        </button>
      </div>

      {modaleAperta && (
        <ModaleCreaLezioneGruppo
          istruttoreId={istruttoreId}
          sport={sport}
          onChiudi={() => setModaleAperta(false)}
        />
      )}
    </>
  )
}

function ModaleCreaLezioneGruppo({
  istruttoreId,
  sport,
  onChiudi,
}: {
  istruttoreId: string
  sport: string
  onChiudi: () => void
}) {
  const [data, setData] = useState('')
  const [oraInizio, setOraInizio] = useState('09:00')
  const [oraFine, setOraFine] = useState('10:30')
  const [campoId, setCampoId] = useState('')
  const [campiDisponibili, setCampiDisponibili] = useState<Campo[]>([])
  const [verificando, setVerificando] = useState(false)
  const [verificato, setVerificato] = useState(false)
  const crea = useCreaLezioneGruppo(istruttoreId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onChiudi])

  const intervalloValido = !!data && oraFine > oraInizio

  function resetVerifica() {
    setVerificato(false)
    setCampoId('')
  }

  async function verificaDisponibilita() {
    if (!intervalloValido) return
    setVerificando(true)
    setCampoId('')
    try {
      const inizio = `${data}T${oraInizio}:00`
      const fine = `${data}T${oraFine}:00`
      const campi = await campiLiberi(sport as Sport, inizio, fine)
      setCampiDisponibili(campi)
      setVerificato(true)
    } finally {
      setVerificando(false)
    }
  }

  function handleCrea() {
    if (!campoId) return
    const inizio = `${data}T${oraInizio}:00`
    const fine = `${data}T${oraFine}:00`
    crea.mutate({ campoId, inizio, fine }, { onSuccess: onChiudi })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onChiudi}>
      <div className="card w-full max-w-md modale-leggibile" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="sezione-moderna-titolo" style={{ margin: 0 }}>Nuova lezione di gruppo</h3>
            <p className="sezione-moderna-sub" style={{ margin: '2px 0 0' }}>{etichettaSport(sport)}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onChiudi} aria-label="Chiudi">
            <IcoChiudi />
          </button>
        </div>

        <div className="dati-coppia" style={{ marginTop: '1rem' }}>
          <div>
            <span className="etichetta">Data</span>
            <input
              type="date"
              value={data}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => { setData(e.target.value); resetVerifica() }}
            />
          </div>
          <div className="durata-wrap" style={{ marginTop: '1.4rem' }}>
            <input type="time" value={oraInizio} onChange={(e) => { setOraInizio(e.target.value); resetVerifica() }} />
            <span className="durata-sep">–</span>
            <input type="time" value={oraFine} onChange={(e) => { setOraFine(e.target.value); resetVerifica() }} />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondario btn-sm mt-3"
          disabled={!intervalloValido || verificando}
          onClick={verificaDisponibilita}
        >
          {verificando ? 'Verifico…' : 'Verifica campi disponibili'}
        </button>

        {verificato && (
          campiDisponibili.length === 0 ? (
            <p className="msg-errore mt-2">Nessun campo libero in questo orario.</p>
          ) : (
            <div className="mt-3">
              <span className="etichetta">Campo</span>
              <select value={campoId} onChange={(e) => setCampoId(e.target.value)}>
                <option value="">Scegli il campo…</option>
                {campiDisponibili.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.nome}</option>
                ))}
              </select>
            </div>
          )
        )}

        {crea.error && <p className="msg-errore mt-2">{messaggioErrore(crea.error)}</p>}

        <button
          type="button"
          className="btn btn-sm mt-3"
          disabled={!campoId || crea.isPending}
          onClick={handleCrea}
        >
          {crea.isPending ? 'Creazione…' : 'Fissa la lezione'}
        </button>

        <button type="button" className="btn btn-secondario btn-block mt-4" onClick={onChiudi}>
          Chiudi
        </button>
      </div>
    </div>
  )
}
