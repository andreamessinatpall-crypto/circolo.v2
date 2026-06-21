import { useMemo } from 'react'
import { useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { incontroDisputato } from './calendario'
import {
  calcolaClassifica,
  gironeSquadra,
  incontriDelGirone,
  numGironi,
  puntiDelGirone,
  squadreDelGirone,
} from './gironi'
import type { Componente, Incontro, Squadra, Torneo } from './tipi'

// (Fase 7a) Riepilogo dei punti che QUESTO torneo assegna a ogni giocatore,
// secondo le sue regole (iscrizione, partita vinta, vittoria torneo).
// (Fase 7b) Con più gironi i punti possono variare per girone: l'iscrizione e
// la partita usano i punti del girone della squadra; la vittoria premia il
// primo di ogni girone, con i punti di quel girone.
export default function RiepilogoPunti({
  torneo,
  squadre,
  incontri,
  compBySquadra,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  compBySquadra: Record<string, Componente[]>
}) {
  const sociQuery = useSociPubblici()
  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    return m
  }, [sociQuery.data])

  const n = numGironi(torneo)

  // Quante partite ha vinto ciascuna squadra (un risultato inserito decide il vincitore).
  const vittoriePerSquadra = useMemo(() => {
    const w: Record<string, number> = {}
    for (const m of incontri) {
      if (m.punti_casa == null || m.punti_ospite == null) continue
      if (m.punti_casa > m.punti_ospite) w[String(m.casa_id)] = (w[String(m.casa_id)] ?? 0) + 1
      else if (m.punti_ospite > m.punti_casa) w[String(m.ospite_id)] = (w[String(m.ospite_id)] ?? 0) + 1
    }
    return w
  }, [incontri])

  // Vincitore di ogni girone: solo a calendario del girone completo (come il podio).
  const vincitoriGirone = useMemo(() => {
    const ids = new Set<string>()
    for (let g = 1; g <= n; g++) {
      const ig = incontriDelGirone(incontri, g)
      if (!ig.length || !ig.every(incontroDisputato)) continue
      const classifica = calcolaClassifica(torneo.sport, squadreDelGirone(torneo, squadre, g), ig)
      if (classifica.length) ids.add(String(classifica[0].id))
    }
    return ids
  }, [torneo, squadre, incontri, n])

  // Una riga per ogni giocatore iscritto, col dettaglio dei punti del suo girone.
  const righe = squadre.flatMap((s) => {
    const comp = compBySquadra[String(s.id)] ?? []
    const pts = puntiDelGirone(torneo, gironeSquadra(torneo, s))
    const vinte = vittoriePerSquadra[String(s.id)] ?? 0
    const vinceTorneo = vincitoriGirone.has(String(s.id))
    return comp.map((c) => {
      const puntiPartite = pts.vittoria * vinte
      const puntiTorneo = vinceTorneo ? pts.torneo : 0
      return {
        socioId: c.socio_id,
        nome: etichette.get(c.socio_id) ?? '—',
        iscr: pts.iscrizione,
        puntiPartite,
        puntiTorneo,
        totale: pts.iscrizione + puntiPartite + puntiTorneo,
      }
    })
  })
  righe.sort((a, b) => b.totale - a.totale || a.nome.localeCompare(b.nome, 'it'))

  // Il torneo assegna qualcosa se almeno un girone ha una voce di punti > 0.
  const assegnaQualcosa = Array.from({ length: n }, (_, i) => i + 1).some((g) => {
    const p = puntiDelGirone(torneo, g)
    return p.iscrizione > 0 || p.vittoria > 0 || p.torneo > 0
  })

  if (!assegnaQualcosa) {
    return (
      <p className="sub">
        Questo torneo non assegna punti. Imposta i valori in “Modifica regole del torneo”.
      </p>
    )
  }
  if (!righe.length) {
    return <p className="sub">Il riepilogo comparirà quando iscrivi i giocatori.</p>
  }

  const totaleGenerale = righe.reduce((acc, r) => acc + r.totale, 0)

  return (
    <div>
      <p className="sub mb-2">
        {n > 1
          ? 'Punti che ogni giocatore guadagna, in base alle regole del suo girone.'
          : 'Punti che questo torneo assegna a ogni giocatore (iscrizione, partita vinta, vittoria torneo).'}
      </p>
      <div className="classifica-wow">
        <table className="classifica classifica-riep">
          <thead>
            <tr>
              <th>Giocatore</th>
              <th>Iscr.</th>
              <th>Part.</th>
              <th>Torneo</th>
              <th>Totale</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r.socioId}>
                <td className="nome-cl">{r.nome}</td>
                <td>{r.iscr}</td>
                <td>{r.puntiPartite}</td>
                <td>{r.puntiTorneo}</td>
                <td className="pti">{r.totale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub mt-2">
        Totale punti distribuiti dal torneo: <strong>{totaleGenerale}</strong>.
      </p>
      <p className="sub mt-1 text-xs">
        I punti vengono accreditati automaticamente sul saldo dei soci: iscrizione (all’ingresso in
        squadra), partita vinta (al salvataggio del risultato) e vittoria torneo (a calendario
        completo, al primo di ogni girone).
      </p>
    </div>
  )
}
