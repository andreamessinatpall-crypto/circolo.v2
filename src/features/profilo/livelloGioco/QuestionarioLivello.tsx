import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { messaggioErrore } from '@/lib/errori'
import { DOMANDE_PADEL, calcolaMedia, livelloDaMedia, ETICHETTE_LIVELLO, ETICHETTE_AREA } from './domande'
import { useLivelloGiocoPadel } from './useLivelliGioco'

interface Props {
  socioId: string
  onChiudi: () => void
}

// Renderizzato con un portale su document.body: se restasse annidato dentro
// .account-schermo-vista-corpo erediterebbe lo stile "vetro" trasparente
// pensato per le card di quella schermata.
export default function QuestionarioLivello({ socioId, onChiudi }: Props) {
  const [passo, setPasso] = useState(0)
  const [risposte, setRisposte] = useState<(number | null)[]>(() => new Array(DOMANDE_PADEL.length).fill(null))
  const [risultato, setRisultato] = useState<string | null>(null)
  const { salva } = useLivelloGiocoPadel(socioId)

  useBloccaScrollBody()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onChiudi])

  const domanda = DOMANDE_PADEL[passo]
  const rispostaScelta = risposte[passo]
  const ultimoPasso = passo === DOMANDE_PADEL.length - 1

  function scegli(indice: number) {
    setRisposte((prev) => prev.map((r, k) => (k === passo ? indice : r)))
  }

  function avanti() {
    if (rispostaScelta === null) return
    if (!ultimoPasso) {
      setPasso((p) => p + 1)
      return
    }
    const media = calcolaMedia(risposte as number[])
    const livello = livelloDaMedia(media)
    salva.mutate(livello, { onSuccess: () => setRisultato(ETICHETTE_LIVELLO[livello]) })
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <div className="card w-full max-w-lg questionario-modal" onClick={(e) => e.stopPropagation()}>
        {!risultato && (
          <button type="button" className="questionario-chiudi" onClick={onChiudi} aria-label="Annulla">
            ✕
          </button>
        )}
        {risultato ? (
          <div className="questionario-risultato">
            <p className="eyebrow" style={{ marginTop: 0 }}>Livello di gioco · Padel</p>
            <p className="questionario-risultato-intro">Il tuo livello è:</p>
            <h2 className="questionario-risultato-livello">{risultato.toUpperCase()}</h2>
            <p className="sub mb-4">Puoi rifare il questionario quando vuoi per aggiornare il tuo livello.</p>
            <button type="button" className="btn btn-oro" onClick={onChiudi}>
              Fatto
            </button>
          </div>
        ) : (
          <>
            <div className="questionario-progresso">
              <span>Domanda {passo + 1} di {DOMANDE_PADEL.length}</span>
              <div className="questionario-barra">
                <div
                  className="questionario-barra-fill"
                  style={{ width: `${((passo + 1) / DOMANDE_PADEL.length) * 100}%` }}
                />
              </div>
            </div>

            <span className="questionario-area">{ETICHETTE_AREA[domanda.area]}</span>
            <h2 className="questionario-domanda">{domanda.testo}</h2>

            <div className="flex flex-col gap-0.5">
              {domanda.opzioni.map((o, j) => (
                <label
                  key={j}
                  className={'questionario-opzione' + (rispostaScelta === j ? ' selezionata' : '')}
                >
                  <input
                    type="radio"
                    name={domanda.id}
                    className="sr-only"
                    checked={rispostaScelta === j}
                    onChange={() => scegli(j)}
                  />
                  {o.testo}
                </label>
              ))}
            </div>

            {salva.error && <p className="msg-errore mt-3">{messaggioErrore(salva.error)}</p>}

            <div className="flex gap-2 mt-5">
              {passo > 0 && (
                <button type="button" className="btn btn-secondario" onClick={() => setPasso((p) => p - 1)}>
                  ‹ Indietro
                </button>
              )}
              <button
                type="button"
                className="btn flex-1"
                disabled={rispostaScelta === null || salva.isPending}
                onClick={avanti}
              >
                {ultimoPasso ? (salva.isPending ? 'Salvataggio…' : 'Scopri il tuo livello') : 'Avanti ›'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
