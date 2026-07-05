import { useState } from 'react'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { dataEstesa } from '@/lib/formato'
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

// Sezione dentro VistaLezioni.tsx: l'istruttore aggiunge/rimuove le proprie
// fasce di disponibilità per lezioni private (usate dalla prenotazione
// lezioni, Fase 5). Nessuna modifica diretta: solo aggiungere/rimuovere.
export default function GestioneDisponibilita({ istruttoreId }: { istruttoreId: string }) {
  const { fasce, caricamento, errore, aggiungi, rimuovi } = useDisponibilita(istruttoreId)
  const [tipo, setTipo] = useState<Tipo>('ricorrente')
  const [giornoSettimana, setGiornoSettimana] = useState(1)
  const [data, setData] = useState('')
  const [oraInizio, setOraInizio] = useState('09:00')
  const [oraFine, setOraFine] = useState('12:00')

  if (errore) {
    return (
      <p className="msg-errore">
        {mancaTabella(errore, 'disponibilita_maestri')
          ? 'Esegui lo script tappa51-disponibilita-maestri.sql su Supabase per attivare questa sezione.'
          : messaggioErrore(errore)}
      </p>
    )
  }

  const valida = oraFine > oraInizio && (tipo === 'ricorrente' || !!data)

  function handleAggiungi() {
    if (!valida) return
    aggiungi.mutate(
      {
        giorno_settimana: tipo === 'ricorrente' ? giornoSettimana : null,
        data: tipo === 'specifica' ? data : null,
        ora_inizio: oraInizio,
        ora_fine: oraFine,
      },
      { onSuccess: () => setData('') },
    )
  }

  return (
    <div className="card sezione-moderna" style={{ marginTop: '0.75rem' }}>
      <div className="sezione-moderna-head">
        <span className="sezione-moderna-icona"><IcoOrologio /></span>
        <div className="sezione-moderna-testi">
          <h3 className="sezione-moderna-titolo">Le tue disponibilità</h3>
          <p className="sezione-moderna-sub">Fasce orarie per lezioni private</p>
        </div>
        {fasce.length > 0 && <span className="sezione-moderna-pill off">{fasce.length}</span>}
      </div>

      {caricamento ? (
        <p className="sub">Caricamento…</p>
      ) : fasce.length === 0 ? (
        <p className="sub mb-3">Non hai ancora indicato nessuna disponibilità.</p>
      ) : (
        <table className="tabella-disponibilita mb-3">
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
    </div>
  )
}
