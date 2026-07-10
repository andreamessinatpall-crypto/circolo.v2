import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti } from '@/auth/ruoli'
import { SportIcona } from '@/components/IconeSport'
import MieAmichevoli from '@/features/prenotazioni/MieAmichevoli'
import type { Sport } from '@/features/prenotazioni/tipi'
import TornaAreaClub from './TornaAreaClub'

const ETICHETTA: Record<Sport, string> = { padel: 'Padel', calcio: 'Calcio' }

// Gestione delle proprie prenotazioni (partite/allenamenti, con possibilità di
// annullare): prima era una sotto-tab della pagina Prenota, ora vive qui in
// Area Club, separata dal flusso di prenotazione vero e proprio.
export default function MiePrenotazioniPagina() {
  const { profilo } = useAuth()
  const sport: Sport[] = profilo ? sportConsentiti(profilo) : ['padel', 'calcio']
  const [sel, setSel] = useState<Sport>(sport[0] ?? 'padel')
  const attivo = sport.includes(sel) ? sel : (sport[0] ?? 'padel')

  return (
    <div>
      <TornaAreaClub titolo="Le mie prenotazioni" />

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

      <div className="card">
        <MieAmichevoli sport={attivo} />
      </div>
    </div>
  )
}
