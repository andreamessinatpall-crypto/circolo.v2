import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import RiepilogoProfilo from './RiepilogoProfilo'
import ClubProfilo from './ClubProfilo'
import DatiProfilo from './DatiProfilo'
import VistaLezioni from '@/features/prenotazioni/VistaLezioni'
import AttivitaPage from './AttivitaPage'
import ImpostazioniAccountPage from './ImpostazioniAccountPage'
import AreaClubSchede from './pagine/AreaClubSchede'

type SottoScheda = 'riepilogo' | 'club' | 'dati' | 'lezioni' | 'attivita' | 'impostazioni-account'

export default function ProfiloPage() {
  const { profilo } = useAuth()
  const [searchParams] = useSearchParams()
  const [scheda, setScheda] = useState<SottoScheda>('riepilogo')
  const { data: modalitaPremi } = useModalitaPremi()

  useEffect(() => {
    const sezione = searchParams.get('sezione') as SottoScheda | null
    if (sezione) setScheda(sezione)
  }, [searchParams])

  const istruttore = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin

  // Area Club è la stessa griglia di schede per tutti (socio, collaboratore,
  // admin) — richiesto esplicitamente di uniformare, con "Statistiche" e
  // "Giocatori" in più per chi gestisce il circolo (vedi AreaClubSchede.tsx).
  // Solo l'istruttore resta sulle tab testuali qui sotto, pensate per la
  // gestione delle lezioni, non per la vetrina del socio.
  if (!istruttore) {
    return <AreaClubSchede modalitaPremi={!!modalitaPremi} />
  }

  const schede: { id: SottoScheda; label: string }[] = [
    { id: 'riepilogo', label: 'Bacheca' },
    { id: 'lezioni',   label: 'Lezioni' },
    { id: 'club',      label: 'Club' },
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
      {scheda === 'lezioni'    && <VistaLezioni />}
      {scheda === 'attivita'   && <AttivitaPage />}
      {scheda === 'impostazioni-account' && <ImpostazioniAccountPage />}
    </div>
  )
}
