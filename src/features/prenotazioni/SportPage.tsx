import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import GrigliaPrenotazioni from './GrigliaPrenotazioni'
import MieAmichevoli from './MieAmichevoli'
import VistaLezioni from './VistaLezioni'
import type { Sport } from './tipi'

type Sub = 'prenota' | 'mie'
type FiltroMie = 'tutte' | 'lezioni'

export default function SportPage({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
  const [sub, setSub] = useState<Sub>('prenota')
  const [filtroMie, setFiltroMie] = useState<FiltroMie>('tutte')
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
          <div className="eyebrow">
            {label} · {filtroMie === 'lezioni' ? 'Le tue lezioni' : 'Le tue partite'}
          </div>

          {/* Filtro riservato all'istruttore: alterna tutte le prenotazioni e
              i soli allenamenti di cui è istruttore (in sola lettura). */}
          {istruttore && (
            <nav className="mb-3 flex flex-wrap gap-1.5" aria-label="Filtro prenotazioni">
              <button
                type="button"
                className={'subtab-btn' + (filtroMie === 'tutte' ? ' attivo' : '')}
                onClick={() => setFiltroMie('tutte')}
              >
                Tutte
              </button>
              <button
                type="button"
                className={'subtab-btn' + (filtroMie === 'lezioni' ? ' attivo' : '')}
                onClick={() => setFiltroMie('lezioni')}
              >
                Lezioni
              </button>
            </nav>
          )}

          <div className="card">
            {istruttore && filtroMie === 'lezioni' ? (
              <VistaLezioni sport={sport} />
            ) : (
              <MieAmichevoli sport={sport} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
