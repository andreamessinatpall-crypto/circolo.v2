import { useState, type ReactNode } from 'react'
import RiepilogoProfilo from './RiepilogoProfilo'
import DatiProfilo from './DatiProfilo'
import AmiciProfilo from './amici/AmiciProfilo'
import ClassificaProfilo from './ClassificaProfilo'

type SottoScheda = 'riepilogo' | 'dati' | 'amici' | 'classifica'

const SCHEDE: { id: SottoScheda; label: string }[] = [
  { id: 'riepilogo', label: 'Riepilogo' },
  { id: 'dati', label: 'Dati' },
  { id: 'amici', label: 'Amici' },
  { id: 'classifica', label: 'Classifica' },
]

export default function ProfiloPage() {
  const [scheda, setScheda] = useState<SottoScheda>('riepilogo')

  return (
    <div>
      <h1 className="mb-4 font-display text-3xl uppercase tracking-wide text-verde-800">
        Profilo
      </h1>

      <div className="mb-5 flex flex-wrap gap-2">
        {SCHEDE.map((s) => (
          <BottoneScheda
            key={s.id}
            attiva={scheda === s.id}
            onClick={() => setScheda(s.id)}
          >
            {s.label}
          </BottoneScheda>
        ))}
      </div>

      {scheda === 'riepilogo' && <RiepilogoProfilo />}
      {scheda === 'dati' && <DatiProfilo />}
      {scheda === 'amici' && <AmiciProfilo />}
      {scheda === 'classifica' && <ClassificaProfilo />}
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
