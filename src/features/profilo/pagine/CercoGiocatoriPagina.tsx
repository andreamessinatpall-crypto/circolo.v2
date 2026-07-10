import TornaAreaClub from './TornaAreaClub'
import SezioneCompagni from '@/features/compagni/SezioneCompagni'

export default function CercoGiocatoriPagina() {
  return (
    <div>
      <TornaAreaClub titolo="Cerco giocatori" />
      <SezioneCompagni />
    </div>
  )
}
