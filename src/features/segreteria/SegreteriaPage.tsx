import { useState } from 'react'
import Segnaposto from '@/components/Segnaposto'
import NuovoSocio from './NuovoSocio'

// Pannello amministratori. Come nella v1 raccoglie più sezioni; qui sono
// sotto-schede. Vengono riempite una alla volta lungo la Fase 8.
type SottoScheda = 'nuovo' | 'giocatori' | 'campi' | 'punti' | 'premi'

const SCHEDE: { id: SottoScheda; label: string }[] = [
  { id: 'nuovo', label: 'Nuovo giocatore' },
  { id: 'giocatori', label: 'Giocatori' },
  { id: 'campi', label: 'Campi e regole' },
  { id: 'punti', label: 'Punti e crediti' },
  { id: 'premi', label: 'Premi' },
]

export default function SegreteriaPage() {
  const [scheda, setScheda] = useState<SottoScheda>('nuovo')

  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Sezioni segreteria">
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

      {scheda === 'nuovo' && <NuovoSocio />}
      {scheda === 'giocatori' && (
        <Segnaposto descrizione="Elenco giocatori, ruoli e saldi — in arrivo nella Fase 8b." />
      )}
      {scheda === 'campi' && (
        <Segnaposto descrizione="Campi, orari e regole di prenotazione — in arrivo nella Fase 8c." />
      )}
      {scheda === 'punti' && (
        <Segnaposto descrizione="Valori dei punti, crediti e ricalcoli — in arrivo nella Fase 8d." />
      )}
      {scheda === 'premi' && (
        <Segnaposto descrizione="Modalità premi, catalogo e richieste — in arrivo nella Fase 8f." />
      )}
    </div>
  )
}
