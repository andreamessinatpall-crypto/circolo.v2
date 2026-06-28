import { calcolaClassificaAmericano, formatNomeAmericano } from './americano'
import type { AmericanoPartita, Squadra } from './tipi'

export default function ClassificaAmericano({
  giocatori,
  partite,
}: {
  giocatori: Squadra[]
  partite: AmericanoPartita[]
}) {
  if (giocatori.length === 0) {
    return <p className="part-vuoto">Nessun giocatore iscritto.</p>
  }

  const arr = calcolaClassificaAmericano(giocatori, partite)

  return (
    <div className="classifica-wow">
      <table className="classifica">
        <thead>
          <tr>
            {['#', 'Giocatore', 'G', 'V', 'P', 'Diff', 'Punti'].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {arr.map((r, idx) => (
            <tr key={r.id}>
              <td>
                <span className={'cl-rank' + (idx < 3 ? ' m' + (idx + 1) : '')}>{idx + 1}</span>
              </td>
              <td className="nome-cl">{formatNomeAmericano(r.nome)}</td>
              <td>{r.g}</td>
              <td>{r.v}</td>
              <td>{r.p}</td>
              <td>{(r.diff > 0 ? '+' : '') + r.diff}</td>
              <td className="pti">{r.pti}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
