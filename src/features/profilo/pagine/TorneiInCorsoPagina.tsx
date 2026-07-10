import TornaAreaClub from './TornaAreaClub'
import { TorneiInCorso } from '../TorneiClub'

export default function TorneiInCorsoPagina() {
  return (
    <div>
      <TornaAreaClub titolo="Tornei in corso" />
      <div className="card">
        <TorneiInCorso />
      </div>
    </div>
  )
}
