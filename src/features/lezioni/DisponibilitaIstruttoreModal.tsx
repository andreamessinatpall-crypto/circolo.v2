import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '@/auth/useAuth'
import { dataEstesa, etichettaSport } from '@/lib/formato'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import type { Sport } from '@/features/prenotazioni/tipi'
import { useDisponibilita } from './useDisponibilita'
import { useImpegniIstruttore, useInviaRichiestaLezione } from './useRichiesteLezione'
import { generaSlotProposti, escludiSlotOccupati, type SlotProposto } from './slotLezione'

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

interface Props {
  istruttoreId: string
  nome: string
  onChiudi: () => void
}

function chiaveSlot(s: SlotProposto) {
  return `${s.data}_${s.oraInizio}`
}

// Consultazione delle disponibilità di un istruttore e richiesta di una
// lezione privata (Fase 5): un giocatore ci arriva cliccando il suo nome
// nella sezione Staff del club.
export default function DisponibilitaIstruttoreModal({ istruttoreId, nome, onChiudi }: Props) {
  const { profilo } = useAuth()
  const { fasce, caricamento, errore } = useDisponibilita(istruttoreId)
  const { data: impegni = [] } = useImpegniIstruttore(istruttoreId)
  const richiedi = useInviaRichiestaLezione(profilo?.id)

  const [sceltaSlot, setSceltaSlot] = useState('')
  const [inviata, setInviata] = useState(false)

  // Un istruttore è esclusivo per un solo sport (tappa70): tutte le sue
  // fasce lo riportano già, niente scelta da parte di chi richiede la lezione.
  const sport = (fasce[0]?.sport ?? 'padel') as Sport

  const slotProposti = useMemo(() => {
    const generati = generaSlotProposti(fasce)
    return escludiSlotOccupati(generati, impegni)
  }, [fasce, impegni])

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

  function handleInvia() {
    const slot = slotProposti.find((s) => chiaveSlot(s) === sceltaSlot)
    if (!slot) return
    richiedi.mutate(
      {
        istruttoreId,
        sport,
        inizio: `${slot.data}T${slot.oraInizio}:00`,
        fine: `${slot.data}T${slot.oraFine}:00`,
      },
      { onSuccess: () => setInviata(true) },
    )
  }

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

        {fasce.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {inviata ? (
              <p className="msg-ok">Richiesta inviata! Ti avviseremo quando {nome} risponde.</p>
            ) : (
              <>
                <span className="etichetta">Richiedi una lezione di {etichettaSport(sport)}</span>

                {slotProposti.length === 0 ? (
                  <p className="sub">Nessuno slot libero nelle prossime due settimane.</p>
                ) : (
                  <select value={sceltaSlot} onChange={(e) => setSceltaSlot(e.target.value)}>
                    <option value="">Scegli data e ora…</option>
                    {slotProposti.map((s) => (
                      <option key={chiaveSlot(s)} value={chiaveSlot(s)}>
                        {dataEstesa(s.data)} · {s.oraInizio}–{s.oraFine}
                      </option>
                    ))}
                  </select>
                )}

                {richiedi.error && <p className="msg-errore mt-2">{messaggioErrore(richiedi.error)}</p>}

                <button
                  type="button"
                  className="btn btn-sm mt-3"
                  onClick={handleInvia}
                  disabled={!sceltaSlot || richiedi.isPending}
                >
                  {richiedi.isPending ? 'Invio…' : 'Invia richiesta'}
                </button>
              </>
            )}
          </div>
        )}

        <button type="button" className="btn btn-secondario btn-block mt-4" onClick={onChiudi}>
          Chiudi
        </button>
      </div>
    </div>
  )
}
