import { incontroDisputato } from './calendario'
import {
  calcolaClassifica,
  incontriDelGirone,
  mappaLoghi,
  nomeGirone,
  numGironi,
  squadreDelGirone,
} from './gironi'
import { NomeSquadra } from './NomeSquadra'
import type { Incontro, RigaClassifica, Squadra, Torneo } from './tipi'

// (Fase 6e) Podio di fine torneo, mostrato a calendario completo.
// (Fase 7c) Reagisce al filtro dei gironi della scheda "Risultati e Classifica":
//  - "Tutti" (più gironi): il vincitore di ciascun girone completo;
//  - un girone scelto: il podio 1º/2º/3º di quel girone;
//  - girone unico: il podio del torneo.
// (Fase 7b) I punti vittoria vengono accreditati automaticamente, qui si mostra
// solo il risultato.
export default function PodioTorneo({
  torneo,
  squadre,
  incontri,
  gironeFiltro = null,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  gironeFiltro?: number | null
}) {
  const n = numGironi(torneo)
  const loghi = mappaLoghi(squadre)

  // Classifica di un girone (o del torneo) solo se il calendario è completo.
  function classificaCompleta(sg: Squadra[], ig: Incontro[]): RigaClassifica[] | null {
    if (!ig.length || !ig.every(incontroDisputato)) return null
    const c = calcolaClassifica(torneo.sport, sg, ig)
    return c.length ? c : null
  }

  // Vista "Tutti" con più gironi: un campione per ogni girone completo.
  if (n > 1 && gironeFiltro == null) {
    const campioni: { g: number; vincitore: RigaClassifica }[] = []
    for (let g = 1; g <= n; g++) {
      const c = classificaCompleta(
        squadreDelGirone(torneo, squadre, g),
        incontriDelGirone(incontri, g),
      )
      if (c) campioni.push({ g, vincitore: c[0] })
    }
    if (!campioni.length) return null
    return (
      <div className="podio">
        <div className="podio-corona">🏆</div>
        <div className="podio-eyebrow">
          {campioni.length > 1 ? 'Vincitori dei gironi' : 'Vincitore del girone'}
        </div>
        <div className="podio-campioni">
          {campioni.map(({ g, vincitore }) => (
            <div key={g} className="podio-campione">
              <span className="podio-campione-medaglia">🥇</span>
              <span className="podio-campione-girone">{nomeGirone(torneo, g)}</span>
              <span className="podio-campione-nome">
                <NomeSquadra
                  nome={vincitore.nome}
                  logoUrl={loghi[String(vincitore.id)]}
                  sport={torneo.sport}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Vista singolo girone (o torneo a girone unico): podio 1º / 2º / 3º.
  const sg = n > 1 ? squadreDelGirone(torneo, squadre, gironeFiltro!) : squadre
  const ig = n > 1 ? incontriDelGirone(incontri, gironeFiltro!) : incontri
  const classifica = classificaCompleta(sg, ig)
  if (!classifica) return null

  const podio = classifica.slice(0, 3)
  const medaglie = ['🥇', '🥈', '🥉']
  const vincitore = podio[0]

  return (
    <div className="podio">
      <div className="podio-corona">🏆</div>
      <div className="podio-eyebrow">
        {n > 1 ? 'Vincitore · ' + nomeGirone(torneo, gironeFiltro!) : 'Vincitore del torneo'}
      </div>
      <div className="podio-vincitore">
        <NomeSquadra nome={vincitore.nome} logoUrl={loghi[String(vincitore.id)]} sport={torneo.sport} />
      </div>

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
