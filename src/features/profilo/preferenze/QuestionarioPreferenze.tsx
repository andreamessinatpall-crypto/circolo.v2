import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { messaggioErrore } from '@/lib/errori'
import { ETICHETTA_ARTO, ETICHETTE_SPORT, GIORNI, ORARI, POSIZIONI } from './domande'
import type { Preferenze, Sport } from './domande'
import { usePreferenzeGiocatore } from './usePreferenzeGiocatore'

interface Props {
  socioId: string
  sport: Sport
  onChiudi: () => void
}

// Renderizzato con un portale su document.body: se restasse annidato dentro
// .account-schermo-vista-corpo erediterebbe lo stile "vetro" trasparente
// pensato per le card di quella schermata (bug osservato: il questionario
// appariva trasparente invece che bianco pieno).
export default function QuestionarioPreferenze({ socioId, sport, onChiudi }: Props) {
  // Il socio apre il questionario solo dopo che la riga in SezionePreferenze
  // ha già caricato "attuale" (stessa query key, cache condivisa), quindi qui
  // è già disponibile al primo render: nessun effetto per sincronizzarlo.
  const { attuale, salva } = usePreferenzeGiocatore(socioId, sport)
  const [arto, setArto] = useState<Preferenze['mano_piede_preferito']>(() => attuale?.mano_piede_preferito ?? null)
  const [posizione, setPosizione] = useState<string | null>(() => attuale?.posizione ?? null)
  const [orario, setOrario] = useState<Preferenze['orario_preferito']>(() => attuale?.orario_preferito ?? null)
  const [giorni, setGiorni] = useState<string[]>(() => attuale?.giorni_preferiti ?? [])
  const [salvato, setSalvato] = useState(false)

  useBloccaScrollBody()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onChiudi])

  function alternaGiorno(id: string) {
    setGiorni((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))
  }

  function salvaPreferenze() {
    salva.mutate(
      { mano_piede_preferito: arto, posizione, orario_preferito: orario, giorni_preferiti: giorni },
      { onSuccess: () => setSalvato(true) },
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <div className="card w-full max-w-lg questionario-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="questionario-chiudi" onClick={onChiudi} aria-label="Chiudi">
          ✕
        </button>

        {salvato ? (
          <div className="questionario-risultato">
            <p className="eyebrow" style={{ marginTop: 0 }}>Preferenze del giocatore · {ETICHETTE_SPORT[sport]}</p>
            <h2 className="questionario-risultato-livello">Salvate!</h2>
            <p className="sub mb-4">Puoi modificarle quando vuoi da questa stessa schermata.</p>
            <button type="button" className="btn btn-oro" onClick={onChiudi}>
              Fatto
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow" style={{ marginTop: 0 }}>Preferenze del giocatore · {ETICHETTE_SPORT[sport]}</p>

            <p className="pref-domanda-titolo">{ETICHETTA_ARTO[sport]}</p>
            <div className="pref-pill-group">
              {(['destra', 'sinistra'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={'pref-pill' + (arto === v ? ' attivo' : '')}
                  onClick={() => setArto(v)}
                >
                  {v === 'destra' ? 'Destra' : 'Sinistra'}
                </button>
              ))}
            </div>

            <p className="pref-domanda-titolo">Posizione in campo</p>
            <div className="pref-pill-group">
              {POSIZIONI[sport].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={'pref-pill' + (posizione === o.id ? ' attivo' : '')}
                  onClick={() => setPosizione(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <p className="pref-domanda-titolo">Orario preferito</p>
            <div className="pref-pill-group">
              {ORARI.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={'pref-pill' + (orario === o.id ? ' attivo' : '')}
                  onClick={() => setOrario(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <p className="pref-domanda-titolo">Giorni preferiti</p>
            <div className="pref-giorni-group">
              {GIORNI.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={'giorno-chip' + (giorni.includes(g.id) ? ' attivo' : '')}
                  title={g.label}
                  onClick={() => alternaGiorno(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {salva.error && <p className="msg-errore mt-3">{messaggioErrore(salva.error)}</p>}

            <button
              type="button"
              className="btn mt-5 w-full"
              disabled={salva.isPending}
              onClick={salvaPreferenze}
            >
              {salva.isPending ? 'Salvataggio…' : 'Salva preferenze'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
