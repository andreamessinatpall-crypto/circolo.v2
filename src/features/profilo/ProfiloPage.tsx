import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import RiepilogoProfilo from './RiepilogoProfilo'
import ClubProfilo from './ClubProfilo'
import DatiProfilo from './DatiProfilo'
import AmiciProfilo from './amici/AmiciProfilo'
import SociPage from '@/features/segreteria/SociPage'

type SottoScheda = 'riepilogo' | 'club' | 'dati' | 'amici' | 'giocatori'

const BASE: { id: SottoScheda; label: string }[] = [
  { id: 'riepilogo', label: 'Riepilogo' },
  { id: 'club',      label: 'Club' },
  { id: 'dati',      label: 'I miei dati' },
]

export default function ProfiloPage() {
  const { profilo } = useAuth()
  const [scheda, setScheda] = useState<SottoScheda>('riepilogo')

  const collaboratore = !!profilo?.is_allenatore && !profilo?.is_admin
  const istruttore    = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin
  const regolare      = !collaboratore && !istruttore && !profilo?.is_admin

  const schede = [
    ...BASE,
    ...(collaboratore ? [{ id: 'giocatori' as SottoScheda, label: 'Giocatori' }] : []),
    ...(regolare      ? [{ id: 'amici'     as SottoScheda, label: 'Amici'      }] : []),
  ]

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
