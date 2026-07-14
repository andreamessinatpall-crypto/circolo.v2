import { useEffect, useState } from 'react'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { dataEstesa, etichettaSport } from '@/lib/formato'
import { useDisponibilita } from './useDisponibilita'

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const ORDINE_GIORNI = [1, 2, 3, 4, 5, 6, 0]

type Tipo = 'ricorrente' | 'specifica'

function IcoOrologio() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
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

// Sezione dentro VistaLezioni.tsx: card riassuntiva (solo testo delle
// fasce + "Modifica"), sempre in fondo alla pagina — l'istruttore aggiunge/
// rimuove le proprie fasce di disponibilità per lezioni private dal modulo
// che si apre cliccando "Modifica", non più espanso di default nella pagina.
// Un istruttore è esclusivo per un solo sport (tappa70): ogni fascia lo
// riporta esplicitamente, niente scelta perché non ce n'è bisogno.
export default function GestioneDisponibilita({
  istruttoreId,
  sport,
}: {
  istruttoreId: string
  sport: string
}) {
  const disponibilita = useDisponibilita(istruttoreId)
  const { fasce, caricamento, errore } = disponibilita
  const [modaleAperta, setModaleAperta] = useState(false)

  if (errore) {
    return (
      <p className="msg-errore">
        {mancaTabella(errore, 'disponibilita_maestri')
          ? 'Esegui lo script tappa51-disponibilita-maestri.sql su Supabase per attivare questa sezione.'
          : messaggioErrore(errore)}
      </p>
    )
  }

  return (
    <>
      <div className="card sezione-moderna" style={{ marginTop: '0.75rem' }}>
        <div className="sezione-moderna-head">
          <span className="sezione-moderna-icona"><IcoOrologio /></span>
          <div className="sezione-moderna-testi">
            <h3 className="sezione-moderna-titolo">Le tue disponibilità</h3>
            <p className="sezione-moderna-sub">Fasce orarie per lezioni private di {etichettaSport(sport)}</p>
          </div>
          {fasce.length > 0 && <span className="sezione-moderna-pill off">{fasce.length}</span>}
        </div>

        {caricamento ? (
          <p className="sub mb-3">Caricamento…</p>
        ) : fasce.length === 0 ? (
          <p className="sub mb-3">Non hai ancora indicato nessuna disponibilità.</p>
        ) : (
          <div className="flex flex-col gap-1.5 mb-3">
            {fasce.map((f) => (
              <div key={f.id} className="disponibilita-riga">
                <span>
                  {f.giorno_settimana !== null ? `Ogni ${GIORNI[f.giorno_settimana]}` : dataEstesa(f.data)}
                  {' · '}
                  {f.ora_inizio.slice(0, 5)}–{f.ora_fine.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn btn-secondario btn-mini" onClick={() => setModaleAperta(true)}>
          Modifica
        </button>
      </div>

      {modaleAperta && (
        <ModaleDisponibilita
          sport={sport}
          disponibilita={disponibilita}
          onChiudi={() => setModaleAperta(false)}
        />
      )}
    </>
  )
}

// Form vero e proprio (aggiungi/rimuovi fasce): prima viveva sempre espanso
// nella pagina, ora si apre solo da "Modifica" — stesso overlay a comparsa
// già usato per le altre schede (es. DisponibilitaIstruttoreModal).
function ModaleDisponibilita({
  sport,
  disponibilita,
  onChiudi,
}: {
  sport: string
  disponibilita: ReturnType<typeof useDisponibilita>
  onChiudi: () => void
}) {
  const { fasce, caricamento, aggiungi, rimuovi } = disponibilita
  const [tipo, setTipo] = useState<Tipo>('ricorrente')
  const [giornoSettimana, setGiornoSettimana] = useState(1)
  const [data, setData] = useState('')
  const [oraInizio, setOraInizio] = useState('09:00')
  const [oraFine, setOraFine] = useState('12:00')

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

  const valida = oraFine > oraInizio && (tipo === 'ricorrente' || !!data)

  function handleAggiungi() {
    if (!valida) return
    aggiungi.mutate(
      {
        giorno_settimana: tipo === 'ricorrente' ? giornoSettimana : null,
        data: tipo === 'specifica' ? data : null,
        ora_inizio: oraInizio,
        ora_fine: oraFine,
        sport,
      },
      { onSuccess: () => setData('') },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onChiudi}>
      <div className="card w-full max-w-md modale-leggibile" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="sezione-moderna-titolo" style={{ margin: 0 }}>Le tue disponibilità</h3>
            <p className="sezione-moderna-sub" style={{ margin: '2px 0 0' }}>
              Fasce orarie per lezioni private di {etichettaSport(sport)}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onChiudi} aria-label="Chiudi">
            <IcoChiudi />
          </button>
        </div>

        {caricamento ? (
          <p className="sub mt-3">Caricamento…</p>
        ) : fasce.length === 0 ? (
          <p className="sub mt-3 mb-3">Non hai ancora indicato nessuna disponibilità.</p>
        ) : (
          <table className="tabella-disponibilita mt-3 mb-3">
            <tbody>
              {fasce.map((f) => (
                <tr key={f.id}>
                  <td className="tabella-disponibilita-quando">
                    {f.giorno_settimana !== null ? GIORNI[f.giorno_settimana] : dataEstesa(f.data)}
                  </td>
                  <td className="tabella-disponibilita-orario">
                    {f.ora_inizio.slice(0, 5)}–{f.ora_fine.slice(0, 5)}
                  </td>
                  <td className="tabella-disponibilita-azione">
                    <button
                      type="button"
                      className="icon-btn icon-btn-pericolo"
                      title="Rimuovi"
                      onClick={() => rimuovi.mutate(f.id)}
                      disabled={rimuovi.isPending}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="seg-group mb-2">
          <button type="button" className={'seg-btn' + (tipo === 'ricorrente' ? ' attivo' : '')} onClick={() => setTipo('ricorrente')}>
            Ricorrente
          </button>
          <button type="button" className={'seg-btn' + (tipo === 'specifica' ? ' attivo' : '')} onClick={() => setTipo('specifica')}>
            Data specifica
          </button>
        </div>

        <div className="dati-coppia" style={{ marginTop: 0 }}>
          {tipo === 'ricorrente' ? (
            <div>
              <span className="etichetta">Giorno</span>
              <select value={giornoSettimana} onChange={(e) => setGiornoSettimana(Number(e.target.value))}>
                {ORDINE_GIORNI.map((g) => (
                  <option key={g} value={g}>{GIORNI[g]}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <span className="etichetta">Data</span>
              <input
                type="date"
                value={data}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          )}
          <div className="durata-wrap" style={{ marginTop: '1.4rem' }}>
            <input type="time" value={oraInizio} onChange={(e) => setOraInizio(e.target.value)} />
            <span className="durata-sep">–</span>
            <input type="time" value={oraFine} onChange={(e) => setOraFine(e.target.value)} />
          </div>
        </div>

        {aggiungi.error && <p className="msg-errore mt-2">{messaggioErrore(aggiungi.error)}</p>}

        <button
          type="button"
          className="btn btn-sm mt-3"
          onClick={handleAggiungi}
          disabled={!valida || aggiungi.isPending}
        >
          {aggiungi.isPending ? 'Aggiungo…' : '+ Aggiungi fascia'}
        </button>

        <button type="button" className="btn btn-secondario btn-block mt-4" onClick={onChiudi}>
          Chiudi
        </button>
      </div>
    </div>
  )
}
