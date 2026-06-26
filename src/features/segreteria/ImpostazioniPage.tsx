import { useState } from 'react'
import GestioneCampi from './GestioneCampi'
import ValoriPunti from './ValoriPunti'
import IntervalliCrediti from './IntervalliCrediti'
import RigeneraPunti from './RigeneraPunti'
import RigeneraCrediti from './RigeneraCrediti'
import GestionePremi from './GestionePremi'
import GestioneLivelli from './GestioneLivelli'
import GestioneTraguardi from './GestioneTraguardi'

// Tab "Impostazioni" dell'admin: raccoglie tutta la configurazione del circolo
// che prima stava sparsa in segreteria (campi, valori punti/crediti, catalogo
// premi, livelli e traguardi).
type Scheda = 'campi' | 'punti' | 'premi' | 'livelli'

const SCHEDE: { id: Scheda; label: string }[] = [
  { id: 'campi', label: 'Campi e regole' },
  { id: 'punti', label: 'Punti e crediti' },
  { id: 'premi', label: 'Premi' },
  { id: 'livelli', label: 'Livelli e traguardi' },
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
        </>
      )}
      {scheda === 'premi' && <GestionePremi />}
      {scheda === 'livelli' && (
        <>
          <GestioneLivelli />
          <GestioneTraguardi />
        </>
      )}
    </div>
  )
}
