import { useState } from 'react'
import GrigliaPrenotazioni from './GrigliaPrenotazioni'
import MieAmichevoli from './MieAmichevoli'
import type { Sport } from './tipi'

type Sub = 'prenota' | 'mie'

const ICO_CAMPO = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const ICO_LIST = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M12 12h4M12 16h4M8 12h.01M8 16h.01"/>
  </svg>
)

export default function SportPage({ sport }: { sport: Sport }) {
  const [sub, setSub] = useState<Sub>('prenota')
  const label = sport === 'padel' ? 'Padel' : 'Calcio'

  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label={'Sezioni ' + sport}>
        <button
          type="button"
          className={'subtab-btn' + (sub === 'prenota' ? ' attivo' : '')}
          onClick={() => setSub('prenota')}
        >
          Prenota un campo
        </button>
        <button
          type="button"
          className={'subtab-btn' + (sub === 'mie' ? ' attivo' : '')}
          onClick={() => setSub('mie')}
        >
          Le mie prenotazioni
        </button>
      </nav>

      {sub === 'prenota' && (
        <>
          <div className="club-sez-header">
            <span className="club-sez-icona">{ICO_CAMPO}</span>
            <h2 className="club-sez-titolo">{label} · Prenota un campo</h2>
          </div>
          <GrigliaPrenotazioni sport={sport} />
        </>
      )}

      {sub === 'mie' && (
        <>
          <div className="club-sez-header">
            <span className="club-sez-icona">{ICO_LIST}</span>
            <h2 className="club-sez-titolo">{label} · Le tue partite</h2>
          </div>

          <div className="card">
            <MieAmichevoli sport={sport} />
          </div>
        </>
      )}
    </div>
  )
}
