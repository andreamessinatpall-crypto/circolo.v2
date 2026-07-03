import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti } from '@/auth/ruoli'
import SportPage from './SportPage'
import type { Sport } from './tipi'
import { SportIcona } from '@/components/IconeSport'

const ETICHETTA: Record<Sport, string> = { padel: 'Padel', calcio: 'Calcio' }

// Tab unica "Prenota" del giocatore: raccoglie padel e calcio. Lo switch in
// alto appare solo a chi ha entrambi gli sport; chi ne ha uno solo vede
// direttamente la griglia di quello sport.
export default function PrenotaPage() {
  const { profilo } = useAuth()
  const sport: Sport[] = profilo ? sportConsentiti(profilo) : ['padel', 'calcio']
  const [sel, setSel] = useState<Sport>(sport[0] ?? 'padel')

  // Se la preferenza cambia e lo sport selezionato non è più consentito,
  // ripiega sul primo disponibile.
  const attivo = sport.includes(sel) ? sel : (sport[0] ?? 'padel')

  return (
    <div>
      {sport.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Scegli lo sport">
          {sport.map((s) => (
            <button
              key={s}
              type="button"
              className={'subtab-btn' + (s === attivo ? ' attivo' : '')}
              onClick={() => setSel(s)}
            >
              <SportIcona sport={s} />{ETICHETTA[s]}
            </button>
          ))}
        </nav>
      )}

      <SportPage sport={attivo} />
    </div>
  )
}
