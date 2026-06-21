import { useState } from 'react'
import GrigliaPrenotazioni from './GrigliaPrenotazioni'
import MieAmichevoli from './MieAmichevoli'
import type { Sport } from './tipi'

export default function SportPage({ sport }: { sport: Sport }) {
  const [sub, setSub] = useState<'prenota' | 'mie'>('prenota')
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
          <div className="eyebrow">{label} · Prenota un campo</div>
          <div className="card">
            <GrigliaPrenotazioni sport={sport} />
          </div>
        </>
      )}

      {sub === 'mie' && (
        <>
          <div className="eyebrow">{label} · Le tue partite</div>
          <div className="card">
            <MieAmichevoli sport={sport} />
          </div>
        </>
      )}
    </div>
  )
}
