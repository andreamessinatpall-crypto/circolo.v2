import { useMemo } from 'react'
import { useSociEtichette } from '@/features/prenotazioni/datiAmichevoli'
import { incontroDisputato } from './calendario'
import {
  calcolaClassifica,
  gironeSquadra,
  incontriDelGirone,
  numGironi,
  puntiBase,
  puntiDelGirone,
  squadreDelGirone,
} from './gironi'
import { numTurniEliminazione, vincitoreEliminazione } from './eliminazione'
import { americanoDisputata, calcolaClassificaAmericano } from './americano'
import type { AmericanoPartita, Componente, Incontro, Squadra, Torneo } from './tipi'

export default function RiepilogoPunti({
  torneo,
  squadre,
  incontri,
  compBySquadra,
  americanoPartite = [],
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  compBySquadra: Record<string, Componente[]>
  americanoPartite?: AmericanoPartita[]
}) {
  // soci_etichette (non soci_pubblici): riepilogo punti di un torneo già
  // giocato, deve restare leggibile anche se un giocatore è stato nel
  // frattempo sospeso o ha cancellato l'account.
  const sociQuery = useSociEtichette()
  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    return m
  }, [sociQuery.data])

  // Queste variabili e hook devono stare PRIMA di qualsiasi early return
  // (Rules of Hooks: non si possono chiamare hook condizionalmente).
  const n = numGironi(torneo)
  const isEliminazione = torneo.formato === 'eliminazione'

  const vittoriePerSquadra = useMemo(() => {
    const w: Record<string, number> = {}
    for (const m of incontri) {
      if (m.punti_casa == null || m.punti_ospite == null) continue
      if (m.punti_casa > m.punti_ospite) w[String(m.casa_id)] = (w[String(m.casa_id)] ?? 0) + 1
      else if (m.punti_ospite > m.punti_casa) w[String(m.ospite_id)] = (w[String(m.ospite_id)] ?? 0) + 1
    }
    return w
  }, [incontri])

  const vincitoriGirone = useMemo(() => {
    const ids = new Set<string>()
    if (isEliminazione) {
      const vincId = vincitoreEliminazione(incontri, numTurniEliminazione(squadre.length))
      if (vincId != null) ids.add(String(vincId))
    } else {
      for (let g = 1; g <= n; g++) {
        const ig = incontriDelGirone(incontri, g)
        if (!ig.length || !ig.every(incontroDisputato)) continue
        const classifica = calcolaClassifica(torneo.sport, squadreDelGirone(torneo, squadre, g), ig)
        if (classifica.length) ids.add(String(classifica[0].id))
      }
    }
    return ids
  }, [torneo, squadre, incontri, n, isEliminazione])

  // ── Ramo AMERICANO ──────────────────────────────────────────────────────
  if (torneo.formato === 'americano') {
    const ptIscr = torneo.punti_iscrizione ?? 0
    const ptPos = torneo.punti_posizioni ?? {}
    const haQualcosa = ptIscr > 0 || Object.values(ptPos).some((v) => v > 0)

    if (!haQualcosa) {
      return (
        <p className="sub">
          Questo torneo non assegna punti. Imposta i valori in "Modifica regole del torneo".
        </p>
      )
    }
    if (!squadre.length) {
      return <p className="sub">Il riepilogo comparirà quando iscrivi i giocatori.</p>
    }

    // Classifica finale (disponibile solo se tutte le partite sono giocate).
    const tutteGiocate = americanoPartite.length > 0 && americanoPartite.every(americanoDisputata)
    const classifica = tutteGiocate ? calcolaClassificaAmericano(squadre, americanoPartite) : null

    const righe = squadre.flatMap((s) => {
      const comp = compBySquadra[String(s.id)] ?? []
      const pos = classifica
        ? classifica.findIndex((r) => String(r.id) === String(s.id)) + 1
        : null
      const puntiPosizione = pos ? (ptPos[String(pos)] ?? 0) : null
      return comp.filter((c) => c.socio_id).map((c) => ({
        socioId: c.socio_id!,
        nome: etichette.get(c.socio_id!) ?? '—',
        iscr: ptIscr,
        pos,
        puntiPosizione,
        totale: ptIscr + (puntiPosizione ?? 0),
      }))
    })
    righe.sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999) || a.nome.localeCompare(b.nome, 'it'))

    return (
      <div>
        <p className="sub mb-2">
          Punti assegnati per iscrizione e posizione finale in classifica.
          {!tutteGiocate && ' La posizione verrà assegnata a torneo concluso.'}
        </p>
        <div className="classifica-wow">
          <table className="classifica classifica-riep">
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Iscr.</th>
                <th>Posizione</th>
                <th>Totale</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.socioId}>
                  <td className="nome-cl">{r.nome}</td>
                  <td>{r.iscr}</td>
                  <td>
                    {r.pos
                      ? `${r.pos}° (${r.puntiPosizione} pt)`
                      : <span className="sub" style={{ fontSize: '0.8rem' }}>a conclusione</span>}
                  </td>
                  <td className="pti">{r.pos ? r.totale : r.iscr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {Object.keys(ptPos).length > 0 && (
          <p className="sub mt-2 text-xs">
            Struttura premi: {Object.entries(ptPos).sort(([a], [b]) => Number(a) - Number(b))
              .map(([pos, pt]) => `${pos}° posto → ${pt} pt`).join(' · ')}
          </p>
        )}
      </div>
    )
  }

  // ── Ramo GIRONE / ELIMINAZIONE ──────────────────────────────────────────
  const righe = squadre.flatMap((s) => {
    const comp = compBySquadra[String(s.id)] ?? []
    const pts = isEliminazione ? puntiBase(torneo) : puntiDelGirone(torneo, gironeSquadra(torneo, s))
    const vinte = vittoriePerSquadra[String(s.id)] ?? 0
    const vinceTorneo = vincitoriGirone.has(String(s.id))
    return comp.filter((c) => c.socio_id).map((c) => {
      const puntiPartite = pts.vittoria * vinte
      const puntiTorneo = vinceTorneo ? pts.torneo : 0
      return {
        socioId: c.socio_id!,
        nome: etichette.get(c.socio_id!) ?? '—',
        iscr: pts.iscrizione,
        puntiPartite,
        puntiTorneo,
        totale: pts.iscrizione + puntiPartite + puntiTorneo,
      }
    })
  })
  righe.sort((a, b) => b.totale - a.totale || a.nome.localeCompare(b.nome, 'it'))

  const assegnaQualcosa = isEliminazione
    ? (() => { const p = puntiBase(torneo); return p.iscrizione > 0 || p.vittoria > 0 || p.torneo > 0 })()
    : Array.from({ length: n }, (_, i) => i + 1).some((g) => {
        const p = puntiDelGirone(torneo, g)
        return p.iscrizione > 0 || p.vittoria > 0 || p.torneo > 0
      })

  if (!assegnaQualcosa) {
    return (
      <p className="sub">
        Questo torneo non assegna punti. Imposta i valori in "Modifica regole del torneo".
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
        {isEliminazione
          ? 'Punti che questo torneo assegna a ogni giocatore (iscrizione, partita vinta, vittoria finale).'
          : n > 1
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
        I punti vengono accreditati automaticamente sul saldo dei soci: iscrizione (all'ingresso in
        squadra), partita vinta (al salvataggio del risultato) e vittoria torneo (a calendario
        completo, al primo di ogni girone).
      </p>
    </div>
  )
}
