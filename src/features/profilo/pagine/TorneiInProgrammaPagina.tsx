import TornaAreaClub from './TornaAreaClub'
import { TorneiInProgramma } from '../TorneiClub'

export default function TorneiInProgrammaPagina() {
  return (
    <div>
      <TornaAreaClub titolo="Tornei in programma" />
      <div className="card">
        <TorneiInProgramma />
      </div>
    </div>
  )
}
