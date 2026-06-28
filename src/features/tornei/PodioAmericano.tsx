import { americanoDisputata, calcolaClassificaAmericano, formatNomeAmericano } from './americano'
import type { AmericanoPartita, Squadra } from './tipi'

export default function PodioAmericano({
  giocatori,
  partite,
}: {
  giocatori: Squadra[]
  partite: AmericanoPartita[]
}) {
  if (!partite.length || !partite.every(americanoDisputata)) return null

  const classifica = calcolaClassificaAmericano(giocatori, partite)
  if (!classifica.length) return null

  const podio = classifica.slice(0, 3)
  const medaglie = ['🥇', '🥈', '🥉']

  return (
    <div className="podio">
      <div className="podio-corona">🏆</div>
      <div className="podio-eyebrow">Vincitore del torneo</div>
      <div className="podio-vincitore">{formatNomeAmericano(podio[0].nome)}</div>

      {podio.length > 1 && (
        <div className="podio-lista">
          {podio.map((r, i) => (
            <div key={r.id} className="podio-riga">
              <span className="podio-medaglia">{medaglie[i]}</span>
              <span className="podio-nome">{formatNomeAmericano(r.nome)}</span>
              <span className="podio-pti">{r.pti} pt</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
