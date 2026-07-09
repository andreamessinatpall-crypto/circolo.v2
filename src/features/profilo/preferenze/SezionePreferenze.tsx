import { useState } from 'react'
import { ETICHETTE_SPORT, preferenzeImpostate } from './domande'
import type { Sport } from './domande'
import { usePreferenzeGiocatore } from './usePreferenzeGiocatore'
import QuestionarioPreferenze from './QuestionarioPreferenze'

function RigaPreferenzeSport({ socioId, sport }: { socioId: string; sport: Sport }) {
  const { attuale, caricamento } = usePreferenzeGiocatore(socioId, sport)
  const [aperto, setAperto] = useState(false)

  if (caricamento) return null
  const impostate = preferenzeImpostate(attuale)

  return (
    <div className="livello-gioco-riga">
      <div className="livello-gioco-info">
        <span className="livello-gioco-sport">{ETICHETTE_SPORT[sport]}</span>
        {impostate ? (
          <span className="livello-pill livello-avanzato">Impostate</span>
        ) : (
          <span className="livello-gioco-stato">Non impostate</span>
        )}
      </div>
      <button type="button" className="btn btn-secondario btn-sm" onClick={() => setAperto(true)}>
        {impostate ? 'Modifica' : 'Imposta'}
      </button>

      {aperto && (
        <QuestionarioPreferenze socioId={socioId} sport={sport} onChiudi={() => setAperto(false)} />
      )}
    </div>
  )
}

// Fase C (Modifica profilo): preferenze del giocatore divise per sport
// (padel/calcio indipendenti). Se il socio segue entrambi gli sport, mostra
// una riga per ciascuno, altrimenti solo quello preferito. Stesso stile di
// titolo di "I tuoi dati" (richiesto esplicitamente): oro, niente icona/card
// a parte.
export default function SezionePreferenze({
  socioId,
  sportPreferito,
}: {
  socioId: string
  sportPreferito: string | null
}) {
  return (
    <>
      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <h2 className="club-sez-titolo">Preferenze del giocatore</h2>
      </div>
      <div className="card">
        <div className="flex flex-col gap-2">
          {(sportPreferito === 'padel' || sportPreferito === 'entrambi') && (
            <RigaPreferenzeSport socioId={socioId} sport="padel" />
          )}
          {(sportPreferito === 'calcio' || sportPreferito === 'entrambi') && (
            <RigaPreferenzeSport socioId={socioId} sport="calcio" />
          )}
        </div>
      </div>
    </>
  )
}
