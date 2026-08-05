import { useLayoutEffect, useRef } from 'react'
import { incontroDisputato } from '@/features/tornei/calendario'
import {
  calcolaVincitoriEliminazione,
  calcolaVincitoriEliminazioneAR,
  dbRoundAndata,
  dbRoundRitorno,
  nomeRound,
  turnoCorrenteEliminazione,
  vincitoreEliminazione,
  vincitoreEliminazioneAR,
} from '@/features/tornei/eliminazione'
import type { Incontro } from '@/features/tornei/tipi'
import type { IncontroAmici, TorneoAmici } from './tipi'

// Tabellone grafico dell'eliminazione diretta per i tornei tra amici — stessa
// resa visiva del bracket dei tornei ufficiali (TabelloneEliminazione.tsx,
// riusa le stesse classi CSS bs-*), ma in versione lineare (un turno per
// colonna, nessuno split a metà che converge al centro): con i piccoli
// numeri di squadre di un torneo tra amici non serve la gestione di bracket
// larghissimi per cui esiste lo split. Il calcolo dei turni/vincitori riusa
// le funzioni pure di eliminazione.ts, già condivise con eliminazioneAmici.ts.
// Sola visualizzazione: l'inserimento risultati resta nella sezione Partite
// già presente sotto (stesso pattern del componente ufficiale, che separa il
// bracket grafico dal calendario con i form).

type SlotInfo = {
  casaNome: string | null
  ospiteNome: string | null
  puntiCasa: number | null
  puntiOspite: number | null
  isPlayed: boolean
  isBye: boolean
  vincCasa: boolean
  isGhost: boolean
}

function buildSlotInfo(
  round: number,
  slot: number,
  seed: (string | null)[],
  incontri: IncontroAmici[],
  nomi: Record<string, string>,
  allVin: Map<number, Map<number, number | string>>,
): SlotInfo {
  const incontro = incontri.find((m) => m.round === round && Number(m.girone) === slot)

  if (incontro) {
    const isPlayed = incontroDisputato(incontro)
    return {
      casaNome: nomi[incontro.casa_id] ?? '?',
      ospiteNome: nomi[incontro.ospite_id] ?? '?',
      puntiCasa: incontro.punti_casa,
      puntiOspite: incontro.punti_ospite,
      isPlayed,
      isBye: false,
      vincCasa: isPlayed ? incontro.punti_casa! > incontro.punti_ospite! : false,
      isGhost: false,
    }
  }

  if (round === 1) {
    const i = (slot - 1) * 2
    const a = seed[i] ?? null
    const b = seed[i + 1] ?? null
    if (a == null && b == null) {
      return { casaNome: null, ospiteNome: null, puntiCasa: null, puntiOspite: null, isPlayed: false, isBye: false, vincCasa: false, isGhost: true }
    }
    const isBye = (a != null && b == null) || (a == null && b != null)
    return {
      casaNome: a != null ? (nomi[a] ?? '?') : null,
      ospiteNome: b != null ? (nomi[b] ?? '?') : null,
      puntiCasa: null, puntiOspite: null,
      isPlayed: false, isBye, vincCasa: false, isGhost: false,
    }
  }

  const prevVin = allVin.get(round - 1)
  const casaId = prevVin?.get((slot - 1) * 2 + 1) ?? null
  const ospiteId = prevVin?.get((slot - 1) * 2 + 2) ?? null
  return {
    casaNome: casaId != null ? (nomi[String(casaId)] ?? '?') : null,
    ospiteNome: ospiteId != null ? (nomi[String(ospiteId)] ?? '?') : null,
    puntiCasa: null, puntiOspite: null,
    isPlayed: false, isBye: false, vincCasa: false, isGhost: false,
  }
}

function buildSlotInfoAR(
  bracketRound: number,
  slot: number,
  seed: (string | null)[],
  incontri: IncontroAmici[],
  nomi: Record<string, string>,
  allVin: Map<number, Map<number, number | string>>,
  finaleSecca: boolean,
  totBracketRound: number,
): SlotInfo {
  const dbAndata = dbRoundAndata(bracketRound)
  const isSecca = finaleSecca && bracketRound === totBracketRound
  const andataM = incontri.find((m) => m.round === dbAndata && Number(m.girone) === slot)

  if (!andataM) {
    if (bracketRound === 1) {
      const i = (slot - 1) * 2
      const a = seed[i] ?? null
      const b = seed[i + 1] ?? null
      if (a == null && b == null) return { casaNome: null, ospiteNome: null, puntiCasa: null, puntiOspite: null, isPlayed: false, isBye: false, vincCasa: false, isGhost: true }
      const isBye = (a != null && b == null) || (a == null && b != null)
      return { casaNome: a != null ? (nomi[a] ?? '?') : null, ospiteNome: b != null ? (nomi[b] ?? '?') : null, puntiCasa: null, puntiOspite: null, isPlayed: false, isBye, vincCasa: false, isGhost: false }
    }
    const prevVin = allVin.get(bracketRound - 1)
    const casaId = prevVin?.get((slot - 1) * 2 + 1) ?? null
    const ospiteId = prevVin?.get((slot - 1) * 2 + 2) ?? null
    return { casaNome: casaId != null ? (nomi[String(casaId)] ?? '?') : null, ospiteNome: ospiteId != null ? (nomi[String(ospiteId)] ?? '?') : null, puntiCasa: null, puntiOspite: null, isPlayed: false, isBye: false, vincCasa: false, isGhost: false }
  }

  const andataGiocata = incontroDisputato(andataM)
  let puntiCasa: number | null = null
  let puntiOspite: number | null = null
  let vincCasa = false
  let isPlayed: boolean

  if (isSecca) {
    isPlayed = andataGiocata
    if (isPlayed) { puntiCasa = andataM.punti_casa; puntiOspite = andataM.punti_ospite; vincCasa = puntiCasa! > puntiOspite! }
  } else {
    const ritornoM = incontri.find((m) => m.round === dbRoundRitorno(bracketRound) && Number(m.girone) === slot)
    const ritornoGiocata = ritornoM ? incontroDisputato(ritornoM) : false
    isPlayed = andataGiocata && ritornoGiocata
    if (isPlayed) {
      puntiCasa = (andataM.punti_casa ?? 0) + (ritornoM?.punti_ospite ?? 0)
      puntiOspite = (andataM.punti_ospite ?? 0) + (ritornoM?.punti_casa ?? 0)
      vincCasa = puntiCasa > puntiOspite
    }
  }
  return { casaNome: nomi[andataM.casa_id] ?? '?', ospiteNome: nomi[andataM.ospite_id] ?? '?', puntiCasa: isPlayed ? puntiCasa : null, puntiOspite: isPlayed ? puntiOspite : null, isPlayed, isBye: false, vincCasa, isGhost: false }
}

// Stesse gradazioni di verde del bracket ufficiale, così i due tabelloni
// (club e amici) sono visivamente coerenti tra loro.
const ROUND_BG_DARK = ['#073d27', '#0d5233', '#166641', '#1f7a4e', '#28935b']
const ROUND_BG_LIGHT = ['#0a5c38', '#147a4a', '#1e985d', '#28b670', '#32d083']

function roundHeaderBg(daFine: number): string {
  const i = Math.min(daFine - 1, 4)
  return `linear-gradient(135deg, ${ROUND_BG_DARK[i]} 0%, ${ROUND_BG_LIGHT[i]} 100%)`
}

function BsTeamRow({ nome, score, isWinner }: { nome: string | null; score: number | null; isWinner: boolean | null }) {
  const cls = 'bs-team-row' + (isWinner === true ? ' vincitore' : isWinner === false ? ' perdente' : '')
  return (
    <div className={cls}>
      {nome != null ? (
        <>
          <span className="bs-team-nome">{nome}</span>
          {score != null && <span className="bs-team-score">{score}</span>}
        </>
      ) : (
        <span className="bs-team-tbd">—</span>
      )}
    </div>
  )
}

const BS_COL = 162, BS_FINAL = 172, BS_GAP = 48, BS_PAD = 28

export default function TabelloneAmici({
  torneo,
  incontri,
  nomi,
}: {
  torneo: TorneoAmici
  incontri: IncontroAmici[]
  nomi: Record<string, string>
}) {
  const ar = torneo.andata_ritorno
  const finaleSecca = torneo.finale_secca
  const seed = torneo.bracket_seed ?? []
  const bracketSize = seed.length
  const totRound = bracketSize > 0 ? Math.round(Math.log2(bracketSize)) : 0

  const finalColRef = useRef<HTMLDivElement | null>(null)

  // Bug Safari mobile: align-items:stretch non propaga alle colonne fuori dal
  // viewport iniziale, che restano alla loro altezza minima invece di
  // estendersi come le altre — stessa correzione del bracket ufficiale.
  useLayoutEffect(() => {
    const finalEl = finalColRef.current
    if (!finalEl) return
    const grafEl = finalEl.parentElement
    if (!grafEl) return
    const cols = Array.from(grafEl.querySelectorAll<HTMLElement>('.bs-col'))
    if (cols.length === 0) return
    const maxH = Math.max(...cols.map((c) => c.offsetHeight))
    if (maxH > 0) cols.forEach((c) => { c.style.height = maxH + 'px' })
  }, [])

  if (!bracketSize || !incontri.length) {
    return <p className="part-vuoto">Tabellone non ancora disponibile.</p>
  }

  const bracketIncontri = incontri.filter((m) => Number(m.girone || 0) !== 0)
  const allVin = ar
    ? calcolaVincitoriEliminazioneAR(seed, bracketIncontri as unknown as Incontro[], finaleSecca)
    : calcolaVincitoriEliminazione(seed, bracketIncontri as unknown as Incontro[])
  const vincId = ar
    ? vincitoreEliminazioneAR(bracketIncontri as unknown as Incontro[], totRound, finaleSecca)
    : vincitoreEliminazione(bracketIncontri as unknown as Incontro[], totRound)
  const turnoAtt = turnoCorrenteEliminazione(bracketIncontri as unknown as Incontro[])

  const bracketW = (totRound - 1) * BS_COL + BS_FINAL + Math.max(totRound - 1, 0) * BS_GAP + 2 * BS_PAD

  return (
    <div>
      {vincId != null && (
        <div className="podio mb-3">
          <div className="podio-corona">🏆</div>
          <div className="podio-eyebrow">Vincitore del torneo</div>
          <div className="podio-vincitore">{nomi[String(vincId)] ?? '?'}</div>
        </div>
      )}

      <div className="bs-scroll">
        <div className="bs-grafico" style={{ width: bracketW }}>
          {Array.from({ length: totRound }, (_, i) => i + 1).map((round) => {
            const numSlots = bracketSize / Math.pow(2, round)
            const isFinal = round === totRound
            const daFine = totRound - round
            const dbRoundCorrente = ar ? dbRoundAndata(round) : round
            const isUpcoming = ar ? turnoAtt < dbRoundCorrente : round > turnoAtt
            return (
              <div
                key={round}
                ref={isFinal ? (el) => { finalColRef.current = el } : undefined}
                className={`bs-col${isFinal ? ' bs-col-final' : ''}${isUpcoming ? ' bs-col-upcoming' : ''}`}
              >
                <div className="bs-col-header" style={isFinal ? undefined : { background: roundHeaderBg(daFine) }}>
                  {nomeRound(round, totRound)}
                </div>
                <div className="bs-col-slots">
                  {Array.from({ length: numSlots }, (_, j) => j + 1).map((slot) => {
                    const info = ar
                      ? buildSlotInfoAR(round, slot, seed, bracketIncontri, nomi, allVin, finaleSecca, totRound)
                      : buildSlotInfo(round, slot, seed, bracketIncontri, nomi, allVin)
                    const isCima = slot % 2 === 1
                    return (
                      <div key={slot} className={`bs-slot${info.isGhost ? ' bs-ghost' : ''}`}>
                        {round > 1 && !info.isGhost && <div className="bs-entry" />}
                        {info.isGhost ? (
                          <div className="bs-ghost-spacer" />
                        ) : (
                          <div className={`bs-match-box${info.isPlayed ? ' giocata' : ''}`}>
                            <BsTeamRow nome={info.casaNome} score={info.isPlayed ? info.puntiCasa : null} isWinner={info.isPlayed ? info.vincCasa : null} />
                            {info.isBye ? (
                              <div className="bs-bye-row">BYE</div>
                            ) : (
                              <BsTeamRow nome={info.ospiteNome} score={info.isPlayed ? info.puntiOspite : null} isWinner={info.isPlayed ? !info.vincCasa : null} />
                            )}
                          </div>
                        )}
                        {!isFinal && !info.isGhost && (isCima ? <div className="bs-arm-top" /> : <div className="bs-arm-bottom" />)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
