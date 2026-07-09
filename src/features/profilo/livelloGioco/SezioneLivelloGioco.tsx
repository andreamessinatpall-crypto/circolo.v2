import { useState } from 'react'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { ETICHETTE_LIVELLO } from './domande'
import { useLivelloGiocoPadel } from './useLivelliGioco'
import QuestionarioLivello from './QuestionarioLivello'

// Sezione "Livello di gioco" (Fase 3bis) dentro "I miei dati": solo padel
// (il calcio è escluso), visibile solo a chi ha come sport preferito
// "padel" o "entrambi". Separato dai punti/livelli di fedeltà del club
// (livelliPunti.ts), usato dal matchmaking di "Cerco compagno" (Fase 3).
// Stesso stile di titolo di "I tuoi dati" (richiesto esplicitamente): oro,
// niente icona/card a parte.
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
    <>
      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <h2 className="club-sez-titolo">Livello di gioco</h2>
      </div>
      <div className="card">
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
      </div>

      {questionario && (
        <QuestionarioLivello socioId={socioId} onChiudi={() => setQuestionario(false)} />
      )}
    </>
  )
}
