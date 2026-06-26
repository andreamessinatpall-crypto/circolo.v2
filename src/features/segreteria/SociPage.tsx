import { useState } from 'react'
import GestioneGiocatori from './GestioneGiocatori'
import NuovoSocio from './NuovoSocio'

type Modo = 'elenco' | 'nuovo'

// Tab "Soci" dell'admin: l'elenco dei giocatori con, accanto, il pulsante per
// aggiungerne uno nuovo (prima era una scheda di segreteria a sé).
export default function SociPage() {
  const [modo, setModo] = useState<Modo>('elenco')

  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Sezioni soci">
        <button
          type="button"
          className={'subtab-btn' + (modo === 'elenco' ? ' attivo' : '')}
          onClick={() => setModo('elenco')}
        >
          Elenco
        </button>
        <button
          type="button"
          className={'subtab-btn' + (modo === 'nuovo' ? ' attivo' : '')}
          onClick={() => setModo('nuovo')}
        >
          ＋ Nuovo giocatore
        </button>
      </nav>

      {modo === 'elenco' ? <GestioneGiocatori /> : <NuovoSocio />}
    </div>
  )
}
