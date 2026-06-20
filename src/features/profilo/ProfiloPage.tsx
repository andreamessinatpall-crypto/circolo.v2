import { useState, type ReactNode } from 'react'
import RiepilogoProfilo from './RiepilogoProfilo'
import DatiProfilo from './DatiProfilo'

type SottoScheda = 'riepilogo' | 'dati'

export default function ProfiloPage() {
  const [scheda, setScheda] = useState<SottoScheda>('riepilogo')

  return (
    <div>
      <h1 className="mb-4 font-display text-3xl uppercase tracking-wide text-verde-800">
        Profilo
      </h1>

      {/* Sotto-schede */}
      <div className="mb-5 flex gap-2">
        <BottoneScheda
          attiva={scheda === 'riepilogo'}
          onClick={() => setScheda('riepilogo')}
        >
          Riepilogo
        </BottoneScheda>
        <BottoneScheda attiva={scheda === 'dati'} onClick={() => setScheda('dati')}>
          Dati
        </BottoneScheda>
      </div>

      {scheda === 'riepilogo' ? <RiepilogoProfilo /> : <DatiProfilo />}
    </div>
  )
}

function BottoneScheda({
  attiva,
  onClick,
  children,
}: {
  attiva: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-lg px-4 py-2 text-sm font-semibold transition ' +
        (attiva
          ? 'bg-verde-700 text-white'
          : 'bg-verde-50 text-ink-2 hover:bg-verde-100')
      }
    >
      {children}
    </button>
  )
}
