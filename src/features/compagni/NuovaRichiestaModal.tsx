import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { messaggioErrore } from '@/lib/errori'
import { ETICHETTE_LIVELLO } from '@/features/profilo/livelloGioco/domande'
import { useLivelloGiocoPadel } from '@/features/profilo/livelloGioco/useLivelliGioco'
import type { FasciaOraria, Sport, useRichiestePartner } from './useRichiestePartner'

const ETICHETTE_FASCIA: Record<FasciaOraria, string> = {
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
}

interface Props {
  crea: ReturnType<typeof useRichiestePartner>['crea']
  onChiudi: () => void
}

// Riceve "crea" dalla pagina invece di richiamare useRichiestePartner: quella
// hook apre un canale realtime, e una seconda istanza con lo stesso nome
// canale manderebbe in crash l'app (visto già in Fase 2 con la chat).
export default function NuovaRichiestaModal({ crea, onChiudi }: Props) {
  const { profilo } = useAuth()
  const { attuale: livelloPadel, caricamento: caricamentoLivello } = useLivelloGiocoPadel(profilo?.id)

  const [sport, setSport] = useState<Sport>('padel')
  const [giorno, setGiorno] = useState('')
  const [fasciaOraria, setFasciaOraria] = useState<FasciaOraria>('sera')
  const [giocatoriMancanti, setGiocatoriMancanti] = useState(1)

  if (!profilo) return null

  const puoPubblicare = giorno && (sport === 'calcio' || (sport === 'padel' && !!livelloPadel))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!puoPubblicare) return
    crea.mutate(
      {
        sport,
        livello: sport === 'padel' ? (livelloPadel?.livello ?? null) : null,
        giocatori_mancanti: sport === 'calcio' ? giocatoriMancanti : null,
        giorno,
        fascia_oraria: fasciaOraria,
      },
      { onSuccess: onChiudi },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <form onSubmit={onSubmit} className="card w-full max-w-md form-verde" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3">Nuovo annuncio</h2>

        <span className="etichetta">Sport</span>
        <div className="seg-group">
          <button
            type="button"
            className={'seg-btn' + (sport === 'padel' ? ' attivo' : '')}
            onClick={() => setSport('padel')}
          >
            Padel
          </button>
          <button
            type="button"
            className={'seg-btn' + (sport === 'calcio' ? ' attivo' : '')}
            onClick={() => setSport('calcio')}
          >
            Calcio
          </button>
        </div>

        {sport === 'padel' && (
          <div className="mt-3">
            <span className="etichetta">Il tuo livello</span>
            {caricamentoLivello ? (
              <p className="sub">Caricamento…</p>
            ) : livelloPadel ? (
              <p className="sub">
                {ETICHETTE_LIVELLO[livelloPadel.livello]} — verrà mostrato nell'annuncio così i compagni sanno cosa aspettarsi.
              </p>
            ) : (
              <p className="msg-errore">
                Devi prima fare il questionario "Livello di gioco" in Profilo → I tuoi dati.
              </p>
            )}
          </div>
        )}

        {sport === 'calcio' && (
          <div className="mt-3">
            <span className="etichetta">Quanti giocatori mancano?</span>
            <input
              type="number"
              min={1}
              max={13}
              value={giocatoriMancanti}
              onChange={(e) => setGiocatoriMancanti(Math.max(1, Number(e.target.value)))}
              className="casella-num"
            />
          </div>
        )}

        <div className="dati-coppia mt-3">
          <div>
            <span className="etichetta">Giorno</span>
            <input
              type="date"
              value={giorno}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setGiorno(e.target.value)}
              required
            />
          </div>
          <div>
            <span className="etichetta">Fascia oraria</span>
            <select value={fasciaOraria} onChange={(e) => setFasciaOraria(e.target.value as FasciaOraria)}>
              {(Object.entries(ETICHETTE_FASCIA) as [FasciaOraria, string][]).map(([valore, testo]) => (
                <option key={valore} value={valore}>{testo}</option>
              ))}
            </select>
          </div>
        </div>

        {crea.error && <p className="msg-errore mt-3">{messaggioErrore(crea.error)}</p>}

        <div className="flex gap-2 mt-4">
          <button type="submit" className="btn flex-1" disabled={!puoPubblicare || crea.isPending}>
            {crea.isPending ? 'Pubblico…' : 'Pubblica annuncio'}
          </button>
          <button type="button" className="btn btn-secondario" onClick={onChiudi}>
            Annulla
          </button>
        </div>

        <p className="sub mt-2">L'annuncio scade automaticamente dopo 48 ore.</p>
      </form>
    </div>
  )
}
