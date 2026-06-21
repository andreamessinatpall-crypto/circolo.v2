import { incontroDisputato } from './calendario'
import { calcolaClassifica, mappaLoghi } from './gironi'
import { NomeSquadra } from './NomeSquadra'
import type { Incontro, Squadra, Torneo } from './tipi'

// (Fase 6e) Podio: quando il calendario è completo (tutti gli incontri
// disputati) mostra il vincitore del torneo, i punti che conquista con la
// vittoria e il podio (1º/2º/3º). Per i gironi multipli usa la classifica
// complessiva (somma dei punti di tutti gli incontri).
export default function PodioTorneo({
  torneo,
  squadre,
  incontri,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
}) {
  // Serve almeno un incontro e tutti devono essere disputati.
  const completo = incontri.length > 0 && incontri.every(incontroDisputato)
  if (!completo) return null

  const classifica = calcolaClassifica(torneo.sport, squadre, incontri)
  if (!classifica.length) return null

  const loghi = mappaLoghi(squadre)
  const podio = classifica.slice(0, 3)
  const medaglie = ['🥇', '🥈', '🥉']
  const vincitore = podio[0]

  return (
    <div className="podio">
      <div className="podio-corona">🏆</div>
      <div className="podio-eyebrow">Vincitore del torneo</div>
      <div className="podio-vincitore">
        <NomeSquadra nome={vincitore.nome} logoUrl={loghi[String(vincitore.id)]} sport={torneo.sport} />
      </div>
      {torneo.punti_torneo ? (
        <div className="podio-punti">+{torneo.punti_torneo} punti per la vittoria del torneo</div>
      ) : null}

      {podio.length > 1 && (
        <div className="podio-lista">
          {podio.map((r, i) => (
            <div key={r.id} className="podio-riga">
              <span className="podio-medaglia">{medaglie[i]}</span>
              <span className="podio-nome">
                <NomeSquadra nome={r.nome} logoUrl={loghi[String(r.id)]} sport={torneo.sport} />
              </span>
              <span className="podio-pti">{r.pti} pti</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
