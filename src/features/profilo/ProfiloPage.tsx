import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import RiepilogoProfilo from './RiepilogoProfilo'
import ClubProfilo from './ClubProfilo'
import DatiProfilo from './DatiProfilo'
import AmiciProfilo from './amici/AmiciProfilo'
import SociPage from '@/features/segreteria/SociPage'

type SottoScheda = 'riepilogo' | 'club' | 'dati' | 'amici' | 'giocatori'

export default function ProfiloPage() {
  const { profilo } = useAuth()
  const [scheda, setScheda] = useState<SottoScheda>('riepilogo')

  const collaboratore = !!profilo?.is_allenatore && !profilo?.is_admin
  const istruttore    = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin

  let schede: { id: SottoScheda; label: string }[]
  if (collaboratore) {
    schede = [
      { id: 'riepilogo', label: 'Riepilogo' },
      { id: 'giocatori', label: 'Giocatori' },
      { id: 'dati',      label: 'I miei dati' },
      { id: 'club',      label: 'Club' },
    ]
  } else if (istruttore) {
    schede = [
      { id: 'riepilogo', label: 'Riepilogo' },
      { id: 'dati',      label: 'I miei dati' },
      { id: 'club',      label: 'Club' },
    ]
  } else {
    schede = [
      { id: 'riepilogo', label: 'Riepilogo' },
      { id: 'amici',     label: 'Amici' },
      { id: 'club',      label: 'Club' },
      { id: 'dati',      label: 'I miei dati' },
    ]
  }

  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Sezioni profilo">
        {schede.map((s) => (
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

      {scheda === 'riepilogo'  && <RiepilogoProfilo />}
      {scheda === 'club'       && <ClubProfilo />}
      {scheda === 'dati'       && <DatiProfilo />}
      {scheda === 'amici'      && <AmiciProfilo />}
      {scheda === 'giocatori'  && <SociPage />}
    </div>
  )
}
