import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti, puoGestirePrenotazioni } from '@/auth/ruoli'
import SportPage from './SportPage'
import PrenotaWizard from './PrenotaWizard'
import type { Sport } from './tipi'
import { SportIcona } from '@/components/IconeSport'

const ETICHETTA: Record<Sport, string> = { padel: 'Padel', calcio: 'Calcio' }

// Tab "Prenota": per admin/collaboratore/istruttore resta la griglia per-campo
// (SportPage → GrigliaPrenotazioni, con la scelta "Prenotazione campo /
// Allenamento"). Per il giocatore normale è il flusso guidato PrenotaWizard
// (calendario → sport → orari liberi → campo → conferma).
export default function PrenotaPage() {
  const { profilo } = useAuth()
  const sport: Sport[] = profilo ? sportConsentiti(profilo) : ['padel', 'calcio']
  const [sel, setSel] = useState<Sport>(sport[0] ?? 'padel')

  // Se la preferenza cambia e lo sport selezionato non è più consentito,
  // ripiega sul primo disponibile.
  const attivo = sport.includes(sel) ? sel : (sport[0] ?? 'padel')

  const staff = !!(profilo && (puoGestirePrenotazioni(profilo) || profilo.e_allenatore))
  if (!staff) return <PrenotaWizard sportOptions={sport} />

  return (
    <div>
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

      <SportPage sport={attivo} />
    </div>
  )
}
