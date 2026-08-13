import { useModalitaPremi } from '@/features/premi/datiPremi'
import { useModalitaClassifica } from './datiClassifica'
import AreaClubSchede from './pagine/AreaClubSchede'

// Area Club è la stessa griglia di schede per tutti i ruoli (socio,
// istruttore, collaboratore, admin) — le prime schede cambiano in base al
// ruolo, vedi la composizione in AreaClubSchede.tsx.
export default function ProfiloPage() {
  const { data: modalitaPremi } = useModalitaPremi()
  const { data: modalitaClassifica } = useModalitaClassifica()
  return (
    <AreaClubSchede modalitaPremi={!!modalitaPremi} modalitaClassifica={modalitaClassifica !== false} />
  )
}
