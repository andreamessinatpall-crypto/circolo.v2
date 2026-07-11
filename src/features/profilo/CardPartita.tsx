import { dataEstesa } from '@/lib/formato'
import { oraLocale } from '@/features/prenotazioni/orari'
import type { DettaglioRisultato } from './datiRisultato'

// Cartellino di una partita, taglio "marcatore": intestazione con data/ora e
// campo separata da una riga sottile, poi le due squadre su due righe divise
// da un'altra riga sottile — come un vero tabellone. Chi vince è in nero
// pieno, chi perde si smorza in grigio; il risultato finale è in grassetto
// (oro solo per chi ha vinto). Niente etichette HOME/AWAY — usato sia nella
// scheda giocatore (DettaglioAmicoModal) sia in Storico/Concluse
// (AttivitaConcluse), stesso taglio ovunque compaia un risultato. Se il
// risultato non è ancora stato inserito, i campi mancanti (nomi e punteggio)
// restano dei trattini invece di sparire.
export default function CardPartita({
  inizio,
  fine,
  campoNome,
  dettaglio,
}: {
  inizio: string
  fine: string
  campoNome: string | null
  dettaglio: DettaglioRisultato | null
}) {
  const casaVince = !!dettaglio && dettaglio.puntiCasa > dettaglio.puntiOspite
  const ospiteVince = !!dettaglio && dettaglio.puntiOspite > dettaglio.puntiCasa

  return (
    <div className="ris-card">
      <div className="ris-card-quando">
        <span>{dataEstesa(inizio.slice(0, 10))}, {oraLocale(new Date(inizio))}–{oraLocale(new Date(fine))}</span>
        {campoNome && <strong>{campoNome}</strong>}
      </div>
      {!dettaglio ? (
        <div className="ris-card-corpo">
          <div className="ris-card-riga">
            <span className="ris-card-nome ris-card-vuoto">–</span>
            <span className="ris-card-finale ris-card-vuoto">–</span>
          </div>
          <span className="ris-card-divider" />
          <div className="ris-card-riga">
            <span className="ris-card-nome ris-card-vuoto">–</span>
            <span className="ris-card-finale ris-card-vuoto">–</span>
          </div>
        </div>
      ) : (
        <div className="ris-card-corpo">
          <div className={'ris-card-riga' + (casaVince ? ' vince' : '')}>
            <span className="ris-card-nome">{dettaglio.squadraCasa.join(' / ') || '—'}</span>
            {dettaglio.set && dettaglio.set.length > 0 && (
              <span className="ris-card-set">
                {dettaglio.set.map((s, i) => <span key={i}>{s.casa}</span>)}
              </span>
            )}
            <span className="ris-card-finale">{dettaglio.puntiCasa}</span>
          </div>
          <span className="ris-card-divider" />
          <div className={'ris-card-riga' + (ospiteVince ? ' vince' : '')}>
            <span className="ris-card-nome">{dettaglio.squadraOspite.join(' / ') || '—'}</span>
            {dettaglio.set && dettaglio.set.length > 0 && (
              <span className="ris-card-set">
                {dettaglio.set.map((s, i) => <span key={i}>{s.ospite}</span>)}
              </span>
            )}
            <span className="ris-card-finale">{dettaglio.puntiOspite}</span>
          </div>
        </div>
      )}
    </div>
  )
}
