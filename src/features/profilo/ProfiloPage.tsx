import { useState } from 'react'
import RiepilogoProfilo from './RiepilogoProfilo'
import ClubProfilo from './ClubProfilo'
import DatiProfilo from './DatiProfilo'
import AmiciProfilo from './amici/AmiciProfilo'

type SottoScheda = 'riepilogo' | 'club' | 'dati' | 'amici'

const SCHEDE: { id: SottoScheda; label: string }[] = [
  { id: 'riepilogo', label: 'Riepilogo' },
  { id: 'club', label: 'Club' },
  { id: 'dati', label: 'I miei dati' },
  { id: 'amici', label: 'Amici' },
]

export default function ProfiloPage() {
  const [scheda, setScheda] = useState<SottoScheda>('riepilogo')

  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Sezioni profilo">
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
      </nav>

      {scheda === 'riepilogo' && <RiepilogoProfilo />}
      {scheda === 'club' && <ClubProfilo />}
      {scheda === 'dati' && <DatiProfilo />}
      {scheda === 'amici' && <AmiciProfilo />}
    </div>
  )
}
