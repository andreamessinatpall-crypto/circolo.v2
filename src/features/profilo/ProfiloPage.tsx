import { useState } from 'react'
import RiepilogoProfilo from './RiepilogoProfilo'
import DatiProfilo from './DatiProfilo'
import AmiciProfilo from './amici/AmiciProfilo'
import ClassificaProfilo from './ClassificaProfilo'
import BadgeProfilo from './badge/BadgeProfilo'

type SottoScheda = 'riepilogo' | 'dati' | 'amici' | 'classifica' | 'badge'

const SCHEDE: { id: SottoScheda; label: string }[] = [
  { id: 'riepilogo', label: 'Riepilogo' },
  { id: 'dati', label: 'Dati' },
  { id: 'amici', label: 'Amici' },
  { id: 'classifica', label: 'Classifica' },
  { id: 'badge', label: 'Badge' },
]

export default function ProfiloPage() {
  const [scheda, setScheda] = useState<SottoScheda>('riepilogo')

  return (
    <div>
      <h1 className="mb-1 text-3xl">Profilo</h1>

      <div className="mb-5 flex flex-wrap gap-1.5 pt-2">
        {SCHEDE.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScheda(s.id)}
            className={'subtab-btn' + (scheda === s.id ? ' attivo' : '')}
          >
            {s.label}
          </button>
        ))}
      </div>

      {scheda === 'riepilogo' && <RiepilogoProfilo />}
      {scheda === 'dati' && <DatiProfilo />}
      {scheda === 'amici' && <AmiciProfilo />}
      {scheda === 'classifica' && <ClassificaProfilo />}
      {scheda === 'badge' && <BadgeProfilo />}
    </div>
  )
}
