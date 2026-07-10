import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import RiepilogoProfilo from './RiepilogoProfilo'
import ClubProfilo from './ClubProfilo'
import DatiProfilo from './DatiProfilo'
import SociPage from '@/features/segreteria/SociPage'
import VistaLezioni from '@/features/prenotazioni/VistaLezioni'
import GestionePremi from '@/features/segreteria/GestionePremi'
import AttivitaPage from './AttivitaPage'
import ImpostazioniAccountPage from './ImpostazioniAccountPage'
import AreaClubSchede from './pagine/AreaClubSchede'

type SottoScheda =
  | 'riepilogo' | 'club' | 'dati' | 'giocatori' | 'lezioni' | 'premi'
  | 'attivita' | 'impostazioni-account'

export default function ProfiloPage() {
  const { profilo } = useAuth()
  const [searchParams] = useSearchParams()
  const [scheda, setScheda] = useState<SottoScheda>('riepilogo')
  const { data: modalitaPremi } = useModalitaPremi()

  useEffect(() => {
    const sezione = searchParams.get('sezione') as SottoScheda | null
    if (sezione) setScheda(sezione)
  }, [searchParams])

  const collaboratore = !!profilo?.is_allenatore && !profilo?.is_admin
  const istruttore    = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin

  // Giocatore regolare: Area Club è una griglia di schede che aprono pagine
  // vere e proprie (vedi src/features/profilo/pagine/), non più tab interne
  // — richiesto esplicitamente. Collaboratore/istruttore restano sulle tab
  // esistenti qui sotto, pensate per la gestione, non per l'uso da socio.
  if (!collaboratore && !istruttore) {
    return <AreaClubSchede modalitaPremi={!!modalitaPremi} />
  }

  let schede: { id: SottoScheda; label: string }[]
  if (collaboratore) {
    schede = [
      { id: 'riepilogo', label: 'Bacheca' },
      { id: 'giocatori', label: 'Giocatori' },
      { id: 'club',      label: 'Club' },
      { id: 'premi',     label: 'Premi' },
    ]
  } else {
    schede = [
      { id: 'riepilogo', label: 'Bacheca' },
      { id: 'lezioni',   label: 'Lezioni' },
      { id: 'club',      label: 'Club' },
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
      {scheda === 'giocatori'  && <SociPage />}
      {scheda === 'lezioni'    && <VistaLezioni />}
      {scheda === 'premi'      && <GestionePremi />}
      {scheda === 'attivita'   && <AttivitaPage />}
      {scheda === 'impostazioni-account' && <ImpostazioniAccountPage />}
    </div>
  )
}
