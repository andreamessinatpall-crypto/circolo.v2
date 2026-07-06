import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { messaggioErrore } from '@/lib/errori'
import { ETICHETTE_LIVELLO } from '@/features/profilo/livelloGioco/domande'
import { useLivelloGiocoPadel } from '@/features/profilo/livelloGioco/useLivelliGioco'
import QuestionarioLivello from '@/features/profilo/livelloGioco/QuestionarioLivello'
import type { RichiestaPartner, Sport, useRichiestePartner } from './useRichiestePartner'

interface Props {
  crea: ReturnType<typeof useRichiestePartner>['crea']
  aggiorna: ReturnType<typeof useRichiestePartner>['aggiorna']
  onChiudi: () => void
  // Se presente, il modale modifica questo annuncio invece di crearne uno nuovo.
  modifica?: RichiestaPartner
}

// Riceve "crea"/"aggiorna" dalla pagina invece di richiamare useRichiestePartner:
// quella hook apre un canale realtime, e una seconda istanza con lo stesso nome
// canale manderebbe in crash l'app (visto già in Fase 2 con la chat).
export default function NuovaRichiestaModal({ crea, aggiorna, onChiudi, modifica }: Props) {
  useBloccaScrollBody()
  const { profilo } = useAuth()
  const { attuale: livelloPadel, caricamento: caricamentoLivello } = useLivelloGiocoPadel(profilo?.id)

  const [sport, setSport] = useState<Sport>(modifica?.sport ?? 'padel')
  const [giorno, setGiorno] = useState(modifica?.giorno ?? '')
  const [oraInizio, setOraInizio] = useState(modifica?.ora_inizio?.slice(0, 5) ?? '19:00')
  const [giocatoriMancanti, setGiocatoriMancanti] = useState(modifica?.giocatori_mancanti ?? 1)
  const [questionario, setQuestionario] = useState(false)

  if (!profilo) return null

  const maxMancanti = sport === 'padel' ? 3 : 13
  const puoPubblicare = giorno && oraInizio && (sport === 'calcio' || (sport === 'padel' && !!livelloPadel))
  const mutazione = modifica ? aggiorna : crea

  function cambiaSport(s: Sport) {
    setSport(s)
    setGiocatoriMancanti(1)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!puoPubblicare) return
    const dati = {
      sport,
      livello: sport === 'padel' ? (livelloPadel?.livello ?? null) : null,
      giocatori_mancanti: giocatoriMancanti,
      giorno,
      ora_inizio: oraInizio,
    }
    if (modifica) {
      aggiorna.mutate({ id: modifica.id, dati }, { onSuccess: onChiudi })
    } else {
      crea.mutate(dati, { onSuccess: onChiudi })
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <form onSubmit={onSubmit} className="card w-full max-w-md form-verde" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3">{modifica ? 'Modifica annuncio' : 'Nuovo annuncio'}</h2>

        <span className="etichetta">Sport</span>
        <div className="seg-group">
          <button
            type="button"
            className={'seg-btn' + (sport === 'padel' ? ' attivo' : '')}
            onClick={() => cambiaSport('padel')}
          >
            Padel
          </button>
          <button
            type="button"
            className={'seg-btn' + (sport === 'calcio' ? ' attivo' : '')}
            onClick={() => cambiaSport('calcio')}
          >
            Calcio
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
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
            <span className="etichetta">Ora</span>
            <input
              type="time"
              value={oraInizio}
              onChange={(e) => setOraInizio(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mt-3">
          <span className="etichetta">Quanti giocatori mancano?</span>
          <input
            type="number"
            min={1}
            max={maxMancanti}
            value={giocatoriMancanti}
            onChange={(e) => setGiocatoriMancanti(Math.min(maxMancanti, Math.max(1, Number(e.target.value))))}
            className="casella-num"
          />
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
              <div className="livello-cta">
                <span className="livello-cta-testo">
                  Non hai ancora fatto il questionario del livello di gioco.
                </span>
                <button type="button" className="btn btn-oro btn-sm" onClick={() => setQuestionario(true)}>
                  Fai il questionario
                </button>
              </div>
            )}
          </div>
        )}

        {mutazione.error && <p className="msg-errore mt-3">{messaggioErrore(mutazione.error)}</p>}

        <div className="flex gap-2 mt-4">
          <button type="submit" className="btn flex-1" disabled={!puoPubblicare || mutazione.isPending}>
            {mutazione.isPending
              ? (modifica ? 'Salvo…' : 'Pubblico…')
              : (modifica ? 'Salva modifiche' : 'Pubblica annuncio')}
          </button>
          <button type="button" className="btn btn-secondario" onClick={onChiudi}>
            Annulla
          </button>
        </div>

        {!modifica && <p className="sub mt-2">L'annuncio scade automaticamente dopo 48 ore.</p>}
      </form>
      </div>

      {questionario && <QuestionarioLivello socioId={profilo.id} onChiudi={() => setQuestionario(false)} />}
    </>
  )
}
