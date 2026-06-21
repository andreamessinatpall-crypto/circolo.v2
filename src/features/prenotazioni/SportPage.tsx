import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import GrigliaPrenotazioni from './GrigliaPrenotazioni'
import MieAmichevoli from './MieAmichevoli'
import MieLezioni from './MieLezioni'
import type { Sport } from './tipi'

type Sub = 'prenota' | 'mie' | 'lezioni'

export default function SportPage({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
  const [sub, setSub] = useState<Sub>('prenota')
  const label = sport === 'padel' ? 'Padel' : 'Calcio'
  const istruttore = !!(profilo?.e_allenatore && !profilo.is_admin)

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
        {istruttore && (
          <button
            type="button"
            className={'subtab-btn' + (sub === 'lezioni' ? ' attivo' : '')}
            onClick={() => setSub('lezioni')}
          >
            Le mie lezioni
          </button>
        )}
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

      {sub === 'lezioni' && istruttore && (
        <>
          <div className="eyebrow">{label} · Le mie lezioni</div>
          <div className="card">
            <MieLezioni sport={sport} />
          </div>
        </>
      )}
    </div>
  )
}
