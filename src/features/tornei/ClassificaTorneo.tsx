import { calcolaClassifica, incontriDelGirone, mappaLoghi, nomeGirone, numGironi, squadreDelGirone, unitaTorneo } from './gironi'
import { NomeSquadra } from './NomeSquadra'
import { MedagliaPodio } from '@/components/MedagliaPodio'
import type { Incontro, Squadra, Torneo } from './tipi'

// (Fase 6c) Classifica all'italiana del torneo. Con più gironi mostra una
// tabella per ciascun girone; con girone unico una sola tabella.
// (Fase 7c) gironeFiltro: se valorizzato mostra solo quel girone (i tasti dei
// gironi stanno fuori, nella scheda "Risultati e Classifica").
export default function ClassificaTorneo({
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

  if (squadre.length === 0) {
    return (
      <p className="part-vuoto">
        La classifica comparirà quando ci saranno {unitaTorneo(torneo.sport, true)} iscritte.
      </p>
    )
  }

  if (n <= 1) {
    return <TabellaClassifica sport={torneo.sport} squadre={squadre} incontri={incontri} />
  }

  const gironi =
    gironeFiltro != null ? [gironeFiltro] : Array.from({ length: n }, (_, i) => i + 1)

  return (
    <div>
      {gironi.map((g) => {
        const sg = squadreDelGirone(torneo, squadre, g)
        return (
          <div key={g}>
            {/* Con "Tutti" mostro il nome del girone; se è filtrato lo indicano i tasti. */}
            {gironeFiltro == null && (
              <div className="eyebrow" style={{ marginTop: 18 }}>
                {nomeGirone(torneo, g)}
              </div>
            )}
            {sg.length ? (
              <TabellaClassifica
                sport={torneo.sport}
                squadre={sg}
                incontri={incontriDelGirone(incontri, g)}
              />
            ) : (
              <p className="sub">Nessuna {unitaTorneo(torneo.sport, false)} in questo girone.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TabellaClassifica({
  sport,
  squadre,
  incontri,
}: {
  sport: string
  squadre: Squadra[]
  incontri: Incontro[]
}) {
  const arr = calcolaClassifica(sport, squadre, incontri)
  const loghi = mappaLoghi(squadre)
  // Calcio: pareggi (N) e differenza reti (DR). Padel: niente pareggi, differenza set (DS).
  const intestazioni =
    sport === 'calcio'
      ? ['#', 'Squadra', 'G', 'V', 'N', 'P', 'DR', 'Pti']
      : ['#', 'Squadra', 'G', 'V', 'P', 'DS', 'Pti']

  return (
    <div className="classifica-wow">
      <table className="classifica">
        <thead>
          <tr>
            {intestazioni.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {arr.map((r, idx) => {
            const dd = (r.diff > 0 ? '+' : '') + r.diff
            const celle =
              sport === 'calcio'
                ? [r.nome, r.g, r.v, r.n, r.p, dd, r.pti]
                : [r.nome, r.g, r.v, r.p, dd, r.pti]
            return (
              <tr key={r.id}>
                <td>
                  {idx < 3 ? <MedagliaPodio pos={(idx + 1) as 1 | 2 | 3} /> : <span className="cl-rank">{idx + 1}</span>}
                </td>
                {celle.map((val, i) => (
                  <td
                    key={i}
                    className={i === 0 ? 'nome-cl' : i === celle.length - 1 ? 'pti' : undefined}
                  >
                    {i === 0 ? (
                      <NomeSquadra nome={r.nome} logoUrl={loghi[String(r.id)]} sport={sport} />
                    ) : (
                      val
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
