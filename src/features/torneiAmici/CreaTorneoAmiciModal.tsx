import { useState } from 'react'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { messaggioErrore } from '@/lib/errori'
import type { Sport } from '@/features/prenotazioni/tipi'
import type { FormatoTorneoAmici } from './tipi'

export interface DatiNuovoTorneoAmici {
  nome: string
  sport: Sport
  formato: FormatoTorneoAmici
  andataRitorno: boolean
  finaleSecca: boolean
  terzoPosto: boolean
}

// Solo le impostazioni del torneo: gli amici si invitano dopo la creazione,
// con "+ Invita altri amici" nel dettaglio del torneo.
export default function CreaTorneoAmiciModal({
  crea,
  onChiudi,
}: {
  crea: {
    mutate: (dati: DatiNuovoTorneoAmici, opts: { onSuccess: () => void }) => void
    isPending: boolean
    error: unknown
  }
  onChiudi: () => void
}) {
  useBloccaScrollBody()
  const [nome, setNome] = useState('')
  const [sport, setSport] = useState<Sport>('padel')
  const [formato, setFormato] = useState<FormatoTorneoAmici>('girone')
  const [andataRitorno, setAndataRitorno] = useState(false)
  const [finaleSecca, setFinaleSecca] = useState(false)
  const [terzoPosto, setTerzoPosto] = useState(false)

  const valido = nome.trim().length > 0

  function handleCrea() {
    if (!valido) return
    crea.mutate(
      { nome: nome.trim(), sport, formato, andataRitorno, finaleSecca, terzoPosto },
      { onSuccess: onChiudi },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <div className="card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-xl">Nuovo torneo tra amici</h2>

        <div className="dati-coppia" style={{ marginTop: 0 }}>
          <div style={{ width: '100%' }}>
            <span className="etichetta">Nome del torneo</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Torneo d'estate"
            />
          </div>
        </div>

        <div className="seg-group mb-2 mt-2">
          <button type="button" className={'seg-btn' + (sport === 'padel' ? ' attivo' : '')} onClick={() => setSport('padel')}>
            Padel
          </button>
          <button type="button" className={'seg-btn' + (sport === 'calcio' ? ' attivo' : '')} onClick={() => setSport('calcio')}>
            Calcio
          </button>
        </div>

        <div className="seg-group mb-2">
          <button type="button" className={'seg-btn' + (formato === 'girone' ? ' attivo' : '')} onClick={() => setFormato('girone')}>
            Girone all'italiana
          </button>
          <button type="button" className={'seg-btn' + (formato === 'eliminazione' ? ' attivo' : '')} onClick={() => setFormato('eliminazione')}>
            Eliminazione diretta
          </button>
        </div>

        <div className="seg-group mb-2">
          <button type="button" className={'seg-btn' + (!andataRitorno ? ' attivo' : '')} onClick={() => { setAndataRitorno(false); setFinaleSecca(false) }}>
            Sola andata
          </button>
          <button type="button" className={'seg-btn' + (andataRitorno ? ' attivo' : '')} onClick={() => setAndataRitorno(true)}>
            Andata e ritorno
          </button>
        </div>

        {formato === 'eliminazione' && (
          <div className="seg-group mb-3">
            {andataRitorno && (
              <button type="button" className={'seg-btn' + (finaleSecca ? ' attivo' : '')} onClick={() => setFinaleSecca(!finaleSecca)}>
                Finale secca
              </button>
            )}
            <button type="button" className={'seg-btn' + (terzoPosto ? ' attivo' : '')} onClick={() => setTerzoPosto(!terzoPosto)}>
              3°/4° posto
            </button>
          </div>
        )}

        {crea.error ? <p className="msg-errore mb-2">{messaggioErrore(crea.error)}</p> : null}

        <div className="flex gap-2">
          <button type="button" className="btn flex-1" onClick={handleCrea} disabled={!valido || crea.isPending}>
            {crea.isPending ? 'Creo…' : 'Crea torneo'}
          </button>
          <button type="button" className="btn btn-secondario" onClick={onChiudi}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
