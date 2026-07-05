import { useEffect } from 'react'
import { dataEstesa } from '@/lib/formato'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { useDisponibilita } from './useDisponibilita'

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

interface Props {
  istruttoreId: string
  nome: string
  onChiudi: () => void
}

// Consultazione (sola lettura) delle disponibilità di un istruttore: un
// giocatore ci arriva cliccando il suo nome nella sezione Staff del club.
// Usata anche dalla prenotazione lezioni (Fase 5) per scegliere uno slot.
export default function DisponibilitaIstruttoreModal({ istruttoreId, nome, onChiudi }: Props) {
  const { fasce, caricamento, errore } = useDisponibilita(istruttoreId)

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3">Disponibilità di {nome}</h2>

        {errore ? (
          <p className="msg-errore">
            {mancaTabella(errore, 'disponibilita_maestri')
              ? 'Nessuna disponibilità impostata.'
              : messaggioErrore(errore)}
          </p>
        ) : caricamento ? (
          <p className="sub">Caricamento…</p>
        ) : fasce.length === 0 ? (
          <p className="sub">Non ha ancora indicato disponibilità per lezioni private.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
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

        <button type="button" className="btn btn-secondario btn-block mt-4" onClick={onChiudi}>
          Chiudi
        </button>
      </div>
    </div>
  )
}
