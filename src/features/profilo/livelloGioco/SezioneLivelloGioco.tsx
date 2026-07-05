import { useState } from 'react'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { ETICHETTE_LIVELLO } from './domande'
import { useLivelloGiocoPadel } from './useLivelliGioco'
import QuestionarioLivello from './QuestionarioLivello'

function IcoLivello() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="9" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  )
}

// Sezione "Livello di gioco" (Fase 3bis) dentro "I miei dati": solo padel
// (il calcio è escluso), visibile solo a chi ha come sport preferito
// "padel" o "entrambi". Separato dai punti/livelli di fedeltà del club
// (livelliPunti.ts), usato dal matchmaking di "Cerco compagno" (Fase 3).
export default function SezioneLivelloGioco({
  socioId,
  sportPreferito,
}: {
  socioId: string
  sportPreferito: string | null
}) {
  const { attuale, caricamento, errore } = useLivelloGiocoPadel(socioId)
  const [questionario, setQuestionario] = useState(false)

  if (sportPreferito === 'calcio') return null
  if (caricamento) return null

  return (
    <div className="card sezione-moderna" style={{ marginTop: '0.75rem' }}>
      <div className="sezione-moderna-head">
        <span className="sezione-moderna-icona"><IcoLivello /></span>
        <div className="sezione-moderna-testi">
          <h3 className="sezione-moderna-titolo">Livello di gioco</h3>
          <p className="sezione-moderna-sub">Per trovare compagni di padel al tuo livello</p>
        </div>
      </div>

      {errore ? (
        <p className="msg-errore">
          {mancaTabella(errore, 'livelli_gioco')
            ? 'Esegui lo script tappa48-livelli-gioco.sql su Supabase per attivare questa sezione.'
            : messaggioErrore(errore)}
        </p>
      ) : (
        <div className="livello-gioco-riga">
          <div className="livello-gioco-info">
            <span className="livello-gioco-sport">Padel</span>
            {attuale ? (
              <span className={`livello-pill livello-${attuale.livello}`}>
                {ETICHETTE_LIVELLO[attuale.livello]}
              </span>
            ) : (
              <span className="livello-gioco-stato">Non impostato</span>
            )}
          </div>
          <button type="button" className="btn btn-secondario btn-sm" onClick={() => setQuestionario(true)}>
            {attuale ? 'Rifai' : 'Fai il questionario'}
          </button>
        </div>
      )}

      {questionario && (
        <QuestionarioLivello socioId={socioId} onChiudi={() => setQuestionario(false)} />
      )}
    </div>
  )
}
