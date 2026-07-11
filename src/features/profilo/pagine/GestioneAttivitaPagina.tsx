import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti } from '@/auth/ruoli'
import { SportIcona } from '@/components/IconeSport'
import AttivitaInProgramma from '@/features/profilo/AttivitaInProgramma'
import AttivitaConcluse from '@/features/profilo/AttivitaConcluse'
import { RichiesteLezioneInviate } from '@/features/profilo/RiepilogoProfilo'
import type { Sport } from '@/features/prenotazioni/tipi'
import TornaAreaClub from './TornaAreaClub'

const ETICHETTA: Record<Sport, string> = { padel: 'Padel', calcio: 'Calcio' }

// Sport da scegliere sempre in cima, poi due liste distinte: le attività
// ancora in programma (con "Annulla la prenotazione" per le proprie) e
// quelle concluse negli ultimi 7 giorni (non più annullabili — chi ha
// giocato una partita può inserirne il risultato). Oltre i 7 giorni le
// stesse partite restano visibili solo nello Storico attività, col
// risultato se inserito.
export default function GestioneAttivitaPagina() {
  const { profilo } = useAuth()
  const sport: Sport[] = profilo ? sportConsentiti(profilo) : ['padel', 'calcio']
  const [sel, setSel] = useState<Sport>(sport[0] ?? 'padel')
  const attivo = sport.includes(sel) ? sel : (sport[0] ?? 'padel')

  return (
    <div>
      <TornaAreaClub titolo="Attività" />

      <RichiesteLezioneInviate />

      {sport.length > 1 && (
        <nav className="sport-selettore" aria-label="Scegli lo sport">
          {sport.map((s) => (
            <button
              key={s}
              type="button"
              className={'sport-rett' + (s === attivo ? ' attivo' : '')}
              onClick={() => setSel(s)}
            >
              <SportIcona sport={s} size={18} />{ETICHETTA[s]}
            </button>
          ))}
        </nav>
      )}

      <div className="eyebrow" style={{ marginTop: 0 }}>In programma</div>
      <AttivitaInProgramma sport={attivo} />

      <div className="eyebrow">Concluse questa settimana</div>
      <div className="card card-trasparente">
        <AttivitaConcluse sport={attivo} />
      </div>
    </div>
  )
}
