import { useMemo } from 'react'
import { useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { incontroDisputato } from './calendario'
import { calcolaClassifica } from './gironi'
import type { Componente, Incontro, Squadra, Torneo } from './tipi'

// (Fase 7a) Riepilogo dei punti che QUESTO torneo assegna a ogni giocatore,
// secondo le sue regole (iscrizione, partita vinta, vittoria torneo). È un
// calcolo trasparente: l'accredito vero sul saldo dei soci arriva nel passo
// successivo della Fase 7. Vive nella scheda "Gestione torneo".
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

  const pIscr = torneo.punti_iscrizione ?? 0
  const pVin = torneo.punti_vittoria ?? 0
  const pTor = torneo.punti_torneo ?? 0

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

  // Vincitore del torneo: solo a calendario completo (stessa regola del podio).
  const completo = incontri.length > 0 && incontri.every(incontroDisputato)
  const classifica = completo ? calcolaClassifica(torneo.sport, squadre, incontri) : []
  const idVincitore = classifica.length ? String(classifica[0].id) : null

  // Una riga per ogni giocatore iscritto, col dettaglio dei punti.
  const righe = squadre.flatMap((s) => {
    const comp = compBySquadra[String(s.id)] ?? []
    const vinte = vittoriePerSquadra[String(s.id)] ?? 0
    const vinceTorneo = idVincitore === String(s.id)
    return comp.map((c) => {
      const puntiPartite = pVin * vinte
      const puntiTorneo = vinceTorneo ? pTor : 0
      return {
        socioId: c.socio_id,
        nome: etichette.get(c.socio_id) ?? '—',
        iscr: pIscr,
        puntiPartite,
        puntiTorneo,
        totale: pIscr + puntiPartite + puntiTorneo,
      }
    })
  })
  righe.sort((a, b) => b.totale - a.totale || a.nome.localeCompare(b.nome, 'it'))

  if (pIscr === 0 && pVin === 0 && pTor === 0) {
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
        Punti che questo torneo assegna a ogni giocatore (iscrizione {pIscr}, partita vinta{' '}
        {pVin}, vittoria torneo {pTor}).
        {!completo && pTor > 0
          ? ' La vittoria del torneo verrà conteggiata a calendario completo.'
          : ''}
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
        Nota: per ora è solo il calcolo. L’accredito automatico sul saldo dei soci arriverà nel
        prossimo passo della Fase 7.
      </p>
    </div>
  )
}
