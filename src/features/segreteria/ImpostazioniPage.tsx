import { useState } from 'react'
import GestioneCampi from './GestioneCampi'
import ValoriPunti from './ValoriPunti'
import IntervalliCrediti from './IntervalliCrediti'
import RigeneraPunti from './RigeneraPunti'
import RigeneraCrediti from './RigeneraCrediti'
import GestionePremi from './GestionePremi'
import GestioneLivelli from './GestioneLivelli'

type Scheda = 'campi' | 'punti' | 'premi'

const SCHEDE: { id: Scheda; label: string }[] = [
  { id: 'campi', label: 'Campi e regole' },
  { id: 'punti', label: 'Punti e crediti' },
  { id: 'premi', label: 'Premi' },
]

export default function ImpostazioniPage() {
  const [scheda, setScheda] = useState<Scheda>('campi')

  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Sezioni impostazioni">
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

      {scheda === 'campi' && <GestioneCampi />}
      {scheda === 'punti' && (
        <>
          <ValoriPunti />
          <RigeneraPunti />
          <IntervalliCrediti />
          <RigeneraCrediti />
          <GestioneLivelli />
        </>
      )}
      {scheda === 'premi' && <GestionePremi />}
    </div>
  )
}
