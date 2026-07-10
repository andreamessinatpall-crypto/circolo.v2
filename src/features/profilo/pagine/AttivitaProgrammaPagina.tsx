import TornaAreaClub from './TornaAreaClub'
import AttivitaInProgramma from '../AttivitaInProgramma'
import { RichiesteLezioneInviate } from '../RiepilogoProfilo'

export default function AttivitaProgrammaPagina() {
  return (
    <div>
      <TornaAreaClub titolo="Attività in programma" />
      <RichiesteLezioneInviate />
      <div className="card">
        <AttivitaInProgramma />
      </div>
    </div>
  )
}
