import TornaAreaClub from './TornaAreaClub'
import VistaLezioni from '@/features/prenotazioni/VistaLezioni'

export default function GestioneLezioniPagina() {
  return (
    <div>
      <TornaAreaClub titolo="Le tue lezioni" />
      <VistaLezioni />
    </div>
  )
}
