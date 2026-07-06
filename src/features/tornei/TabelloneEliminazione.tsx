import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import {
  formattaSet,
  incontroDisputato,
  mancaColonnaRisultato,
  SCRIPT_RISULTATO,
  setVinti,
} from './calendario'
import { azzeraChiave } from '@/lib/punti'
import { assegnaPuntiPartita, assegnaPuntiVittoriaAuto } from './punti'
import {
  bracketRoundDaDb,
  calcolaVincitoriEliminazione,
  calcolaVincitoriEliminazioneAR,
  dbRoundAndata,
  dbRoundRitorno,
  incontriProssimoTurno,
  isLegAndata,
  numDbRoundsAR,
  nomeRound,
  nomeRoundCorto,
  nomeRoundDb,
  numTurniEliminazione,
  prossimaPotenzaDi2,
  turnoCorrenteEliminazione,
  vincitoreEliminazione,
  vincitoreEliminazioneAR,
} from './eliminazione'
import { NomeSquadra } from './NomeSquadra'
import { BottoneAnnullaProgrammazione, BottoneProgramma } from './ProgrammaIncontro'
import { ICO_CAL, ICO_TROFEO } from './icone'
import type { Componente, Incontro, SetPunteggio, Squadra, Torneo } from './tipi'

// ---------------------------------------------------------------------------
// Dati per ogni slot del bracket grafico
// ---------------------------------------------------------------------------
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
  seed: (number | string | null)[],
  incontri: Incontro[],
  nomi: Record<string, string>,
  allVin: Map<number, Map<number, number | string>>,
): SlotInfo {
  const incontro = incontri.find((m) => m.round === round && Number(m.girone) === slot)

  if (incontro) {
    const isPlayed = incontroDisputato(incontro)
    return {
      casaNome: nomi[String(incontro.casa_id)] ?? '?',
      ospiteNome: nomi[String(incontro.ospite_id)] ?? '?',
      puntiCasa: incontro.punti_casa,
      puntiOspite: incontro.punti_ospite,
      isPlayed,
      isBye: false,
      vincCasa: isPlayed ? incontro.punti_casa! > incontro.punti_ospite! : false,
      isGhost: false,
    }
  }

  // Ricava le squadre attese da seed (round 1) o dai vincitori precedenti.
  if (round === 1) {
    const i = (slot - 1) * 2
    const a = seed[i] ?? null
    const b = seed[i + 1] ?? null
    if (a == null && b == null) {
      return {
        casaNome: null, ospiteNome: null, puntiCasa: null, puntiOspite: null,
        isPlayed: false, isBye: false, vincCasa: false, isGhost: true,
      }
    }
    const isBye = (a != null && b == null) || (a == null && b != null)
    return {
      casaNome: a != null ? (nomi[String(a)] ?? '?') : null,
      ospiteNome: b != null ? (nomi[String(b)] ?? '?') : null,
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

// ---------------------------------------------------------------------------
// Colori per round (0 = Finale, 1 = Semi, 2 = Quarti, …)
// ---------------------------------------------------------------------------
const ROUND_BG_DARK = ['#073d27', '#0d5233', '#166641', '#1f7a4e', '#28935b']
const ROUND_BG_LIGHT = ['#0a5c38', '#147a4a', '#1e985d', '#28b670', '#32d083']
const ROUND_CIRCLE = ['#0a5c38', '#147a4a', '#1e985d', '#28b670', '#32d083']

function roundHeaderBg(daFine: number): string {
  if (daFine === 0) return 'linear-gradient(135deg, #5a3d09 0%, #c49520 100%)'
  const i = Math.min(daFine - 1, 4)
  return `linear-gradient(135deg, ${ROUND_BG_DARK[i]} 0%, ${ROUND_BG_LIGHT[i]} 100%)`
}

function roundCircleColor(daFine: number): string {
  if (daFine === 0) return '#c49520'
  return ROUND_CIRCLE[Math.min(daFine - 1, 4)]
}

// ---------------------------------------------------------------------------
// buildSlotInfo AR: bracket round (non db round), mostra aggregato
// ---------------------------------------------------------------------------
function buildSlotInfoAR(
  bracketRound: number,
  slot: number,
  seed: (number | string | null)[],
  incontri: Incontro[],
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
      return { casaNome: a != null ? (nomi[String(a)] ?? '?') : null, ospiteNome: b != null ? (nomi[String(b)] ?? '?') : null, puntiCasa: null, puntiOspite: null, isPlayed: false, isBye, vincCasa: false, isGhost: false }
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
  let isPlayed = false

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
  return { casaNome: nomi[String(andataM.casa_id)] ?? '?', ospiteNome: nomi[String(andataM.ospite_id)] ?? '?', puntiCasa: isPlayed ? puntiCasa : null, puntiOspite: isPlayed ? puntiOspite : null, isPlayed, isBye: false, vincCasa, isGhost: false }
}

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------
export default function TabelloneEliminazione({
  torneo,
  squadre,
  incontri,
  gestore,
  prenByIncontro,
  miaSquadraId,
  compBySquadra,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  gestore: boolean
  prenByIncontro: Record<string, string>
  miaSquadraId?: number | string
  compBySquadra: Record<string, Componente[]>
}) {
  const N = squadre.length
  const ar = !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno
  const finaleSecca = !!(torneo as { finale_secca?: boolean | null }).finale_secca
  const hasTerzoPosto = !!(torneo as { terzo_posto?: boolean | null }).terzo_posto
  // Il seed dev'essere calcolato prima di totRound (e prima dell'early return)
  // per usare seed.length come misura canonica del bracket size.
  const seed = (torneo.bracket_seed ?? []) as (number | string | null)[]
  const bracketSize = seed.length || prossimaPotenzaDi2(N)
  const totRound = seed.length > 0
    ? Math.round(Math.log2(seed.length))
    : N >= 2 ? numTurniEliminazione(N) : 0
  const totDbRounds = ar ? numDbRoundsAR(totRound, finaleSecca) : totRound

  // Larghezza esplicita del bracket — bypassa il bug di Safari mobile dove
  // width:max-content su flex con figli overflow:hidden restituisce quasi 0.
  const BS_COL = 162, BS_FINAL = 172, BS_GAP = 48, BS_PAD = 28
  const numHalfCols = Math.max(totRound - 1, 0)
  const halfW = numHalfCols * BS_COL + Math.max(numHalfCols - 1, 0) * BS_GAP
  const bracketW = BS_FINAL + (numHalfCols > 0 ? 2 * (halfW + BS_GAP) : 0) + 2 * BS_PAD
  // Escludi il terzo posto (girone=0) dal calcolo del turno corrente.
  const bracketIncontri = incontri.filter((m) => Number(m.girone || 0) !== 0)
  const turnoAtt = turnoCorrenteEliminazione(bracketIncontri)
  const vincId = ar
    ? vincitoreEliminazioneAR(bracketIncontri, totRound, finaleSecca)
    : vincitoreEliminazione(bracketIncontri, totRound)
  const allVin = seed.length
    ? (ar
        ? calcolaVincitoriEliminazioneAR(seed, bracketIncontri, finaleSecca)
        : calcolaVincitoriEliminazione(seed, bracketIncontri))
    : new Map()

  // Tutti i hook PRIMA di qualsiasi return condizionale (Hooks rules)
  const qcMain = useQueryClient()
  const leftColRefs = useRef<(HTMLDivElement | null)[]>([])
  const finalColRef = useRef<HTMLDivElement | null>(null)
  const rightColRefs = useRef<(HTMLDivElement | null)[]>([])
  const [roundFiltro, setRoundFiltro] = useState<number | null>(null)
  // Catch-up: se la pagina si carica con l'andata completa ma il ritorno ancora assente,
  // lo genera automaticamente. Richiede tappa32-ar-constraint-coppia.sql applicata.
  const insertAttemptedRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (!ar || !gestore || !seed.length) return
    for (let br = 1; br <= totRound; br++) {
      if (br === totRound && finaleSecca) break
      const dbAnd = dbRoundAndata(br)
      const dbRit = dbRoundRitorno(br)
      const andataMs = bracketIncontri.filter((m) => m.round === dbAnd)
      if (andataMs.length === 0 || !andataMs.every(incontroDisputato)) continue
      if (bracketIncontri.some((m) => m.round === dbRit)) continue
      if (insertAttemptedRef.current.has(dbRit)) break
      insertAttemptedRef.current.add(dbRit)
      supabase
        .from('incontri')
        .insert(
          andataMs.map((a) => ({
            torneo_id: torneo.id,
            round: dbRit,
            casa_id: a.ospite_id,
            ospite_id: a.casa_id,
            girone: Number(a.girone),
          })),
        )
        .then(() => qcMain.invalidateQueries({ queryKey: ['tornei'] }))
      break
    }
  }, [bracketIncontri])

  // Bug Safari mobile: align-items:stretch non propaga alle colonne fuori dal
  // viewport iniziale (quelle a x > larghezza schermo). Le colonne esterne
  // (Finale, Semi) rimangono alla loro altezza minima invece di estendersi come
  // la colonna R16. useLayoutEffect è sincrono (prima del paint) → nessun flash.
  useLayoutEffect(() => {
    const finalEl = finalColRef.current
    if (!finalEl) return
    const grafEl = finalEl.parentElement
    if (!grafEl) return
    const cols = Array.from(grafEl.querySelectorAll<HTMLElement>('.bs-col'))
    if (cols.length === 0) return
    const maxH = Math.max(...cols.map(c => c.offsetHeight))
    if (maxH > 0) cols.forEach(c => { c.style.height = maxH + 'px' })
  }, [])

  // Centra il Finale nella finestra scorrevole all'apertura
  useEffect(() => {
    const finalEl = finalColRef.current
    if (!finalEl) return
    requestAnimationFrame(() => {
      const scrollEl = finalEl.closest('.bs-scroll') as HTMLElement | null
      if (!scrollEl) return
      const finalRect = finalEl.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      const relLeft = finalRect.left - scrollRect.left + scrollEl.scrollLeft
      scrollEl.scrollLeft = relLeft - (scrollEl.clientWidth - finalEl.offsetWidth) / 2
    })
  }, [])

  const nomi: Record<string, string> = {}
  const loghi: Record<string, string | null> = {}
  for (const s of squadre) {
    nomi[String(s.id)] = s.nome
    loghi[String(s.id)] = s.logo_url
  }

  if (!incontri.length) {
    return (
      <p className="part-vuoto">
        {gestore
          ? 'Tabellone non ancora generato. Vai in "Gestione torneo" → "Tabellone" e genera il bracket.'
          : 'Tabellone non ancora disponibile.'}
      </p>
    )
  }

  return (
    <div>
      {vincId && (
        <div className="podio">
          <div className="podio-corona">🏆</div>
          <div className="podio-eyebrow">Vincitore del torneo</div>
          <div className="podio-vincitore">
            <NomeSquadra
              nome={nomi[String(vincId)] ?? '?'}
              logoUrl={loghi[String(vincId)]}
              sport={torneo.sport}
            />
          </div>
        </div>
      )}

      {/* ── 1. BRACKET GRAFICO (SPLIT) ─────────────────────────────── */}
      <div className="bs-scroll">
      <div className="bs-grafico" style={{ width: bracketW }}>
        {/* Metà sinistra: round 1 → round N-1 */}
        {Array.from({ length: Math.max(totRound - 1, 0) }, (_, i) => i + 1).map((round) => {
            const numSlotsTotal = bracketSize / Math.pow(2, round)
            const halfSlots = numSlotsTotal / 2
            // In AR mode: "in corso" se siamo ancora nei db-round di questo bracket round
            const dbRoundCorrentePerBracket = ar ? dbRoundAndata(round) : round
            const isUpcoming = ar
              ? turnoAtt < dbRoundCorrentePerBracket
              : round > turnoAtt
            const usesStraightArm = halfSlots === 1
            const daFine = totRound - round
            return (
              <div
                key={`L${round}`}
                ref={(el) => { leftColRefs.current[round - 1] = el }}
                id={`bsr-${round}`}
                className={`bs-col${isUpcoming ? ' bs-col-upcoming' : ''}`}
              >
                <div className="bs-col-header" style={{ background: roundHeaderBg(daFine) }}>{nomeRound(round, totRound)}</div>
                <div className="bs-col-slots">
                  {Array.from({ length: halfSlots }, (_, j) => j + 1).map((slot) => {
                    const info = ar
                      ? buildSlotInfoAR(round, slot, seed, bracketIncontri, nomi, allVin, finaleSecca, totRound)
                      : buildSlotInfo(round, slot, seed, bracketIncontri, nomi, allVin)
                    const isCima = slot % 2 === 1
                    const isFondo = slot % 2 === 0
                    return (
                      <div key={slot} className={`bs-slot${info.isGhost ? ' bs-ghost' : ''}`}>
                        {round > 1 && !info.isGhost && <div className="bs-entry" />}
                        {info.isGhost ? (
                          <div className="bs-ghost-spacer" />
                        ) : (
                          <div className={`bs-match-box${info.isPlayed ? ' giocata' : ''}`}>
                            <BsTeamRow
                              nome={info.casaNome}
                              score={info.isPlayed ? info.puntiCasa : null}
                              isWinner={info.isPlayed ? info.vincCasa : null}
                            />
                            {info.isBye ? (
                              <div className="bs-bye-row">BYE</div>
                            ) : (
                              <BsTeamRow
                                nome={info.ospiteNome}
                                score={info.isPlayed ? info.puntiOspite : null}
                                isWinner={info.isPlayed ? !info.vincCasa : null}
                              />
                            )}
                          </div>
                        )}
                        {!usesStraightArm && !info.isGhost && isCima && <div className="bs-arm-top" />}
                        {!usesStraightArm && !info.isGhost && isFondo && <div className="bs-arm-bottom" />}
                        {usesStraightArm && !info.isGhost && <div className="bs-arm-straight" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

        {/* Finale: colonna centrale */}
        {totRound > 0 && (() => {
          const info = ar
            ? buildSlotInfoAR(totRound, 1, seed, bracketIncontri, nomi, allVin, finaleSecca, totRound)
            : buildSlotInfo(totRound, 1, seed, bracketIncontri, nomi, allVin)
          const finaleDbRound = ar ? dbRoundAndata(totRound) : totRound
          const finaleUpcoming = turnoAtt < finaleDbRound
          return (
            <div
              ref={(el) => { finalColRef.current = el }}
              id="bsr-final"
              className={`bs-col bs-col-final${finaleUpcoming ? ' bs-col-upcoming' : ''}`}
            >
              <div className="bs-col-header">
                <span aria-hidden>{ICO_TROFEO}</span>
                {nomeRound(totRound, totRound)}
              </div>
              <div className="bs-col-slots">
                <div className="bs-slot">
                  {totRound > 1 && <div className="bs-entry" />}
                  {totRound > 1 && <div className="bs-entry-r" />}
                  {info.isGhost ? (
                    <div className="bs-ghost-spacer" />
                  ) : (
                    <div className={`bs-match-box${info.isPlayed ? ' giocata' : ''}`}>
                      <BsTeamRow
                        nome={info.casaNome}
                        score={info.isPlayed ? info.puntiCasa : null}
                        isWinner={info.isPlayed ? info.vincCasa : null}
                      />
                      {info.isBye ? (
                        <div className="bs-bye-row">BYE</div>
                      ) : (
                        <BsTeamRow
                          nome={info.ospiteNome}
                          score={info.isPlayed ? info.puntiOspite : null}
                          isWinner={info.isPlayed ? !info.vincCasa : null}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Metà destra: round N-1 → round 1 (ordine DOM: interno → esterno) */}
        {Array.from({ length: Math.max(totRound - 1, 0) }, (_, i) => totRound - 1 - i).map((round) => {
            const numSlotsTotal = bracketSize / Math.pow(2, round)
            const halfSlots = numSlotsTotal / 2
            const startSlot = halfSlots + 1
            const dbRoundCorrentePerBracketR = ar ? dbRoundAndata(round) : round
            const isUpcoming = ar
              ? turnoAtt < dbRoundCorrentePerBracketR
              : round > turnoAtt
            const isOutermost = round === 1
            const usesStraightArm = halfSlots === 1
            const daFine = totRound - round
            return (
              <div
                key={`R${round}`}
                ref={(el) => { rightColRefs.current[round - 1] = el }}
                className={`bs-col${isUpcoming ? ' bs-col-upcoming' : ''}`}
              >
                <div className="bs-col-header" style={{ background: roundHeaderBg(daFine) }}>{nomeRound(round, totRound)}</div>
                <div className="bs-col-slots">
                  {Array.from({ length: halfSlots }, (_, j) => {
                    const slot = startSlot + j
                    const info = ar
                      ? buildSlotInfoAR(round, slot, seed, bracketIncontri, nomi, allVin, finaleSecca, totRound)
                      : buildSlotInfo(round, slot, seed, bracketIncontri, nomi, allVin)
                    const isCima = slot % 2 === 1
                    const isFondo = slot % 2 === 0
                    return (
                      <div key={slot} className={`bs-slot${info.isGhost ? ' bs-ghost' : ''}`}>
                        {!isOutermost && !info.isGhost && <div className="bs-entry-r" />}
                        {info.isGhost ? (
                          <div className="bs-ghost-spacer" />
                        ) : (
                          <div className={`bs-match-box${info.isPlayed ? ' giocata' : ''}`}>
                            <BsTeamRow
                              nome={info.casaNome}
                              score={info.isPlayed ? info.puntiCasa : null}
                              isWinner={info.isPlayed ? info.vincCasa : null}
                            />
                            {info.isBye ? (
                              <div className="bs-bye-row">BYE</div>
                            ) : (
                              <BsTeamRow
                                nome={info.ospiteNome}
                                score={info.isPlayed ? info.puntiOspite : null}
                                isWinner={info.isPlayed ? !info.vincCasa : null}
                              />
                            )}
                          </div>
                        )}
                        {!usesStraightArm && !info.isGhost && isCima && <div className="bs-arm-top-r" />}
                        {!usesStraightArm && !info.isGhost && isFondo && <div className="bs-arm-bottom-r" />}
                        {usesStraightArm && !info.isGhost && <div className="bs-arm-straight-r" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>
      </div>{/* /bs-scroll */}

      {/* ── Barra navigazione fasi (cerchi simmetrici) ──────────────── */}
      {totRound > 1 && (
        <div className="bs-nav">
          {/* Cerchi lato sinistro: dal primo round verso la finale */}
          {Array.from({ length: totRound - 1 }, (_, i) => i + 1).map((round) => (
            <button
              key={`nL${round}`}
              type="button"
              className="bs-nav-chip"
              style={{ background: roundCircleColor(totRound - round) }}
              title={nomeRound(round, totRound)}
              onClick={() =>
                leftColRefs.current[round - 1]?.scrollIntoView({
                  behavior: 'smooth',
                  inline: 'center',
                  block: 'nearest',
                })
              }
            />
          ))}
          {/* Cerchio Finale (al centro, più grande) */}
          <button
            type="button"
            className="bs-nav-chip bs-nav-chip-final"
            style={{ background: roundCircleColor(0) }}
            title="Finale"
            onClick={() =>
              finalColRef.current?.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
              })
            }
          />
          {/* Cerchi lato destro: dalla finale verso il primo round */}
          {Array.from({ length: totRound - 1 }, (_, i) => totRound - 1 - i).map((round) => (
            <button
              key={`nR${round}`}
              type="button"
              className="bs-nav-chip"
              style={{ background: roundCircleColor(totRound - round) }}
              title={nomeRound(round, totRound)}
              onClick={() =>
                rightColRefs.current[round - 1]?.scrollIntoView({
                  behavior: 'smooth',
                  inline: 'center',
                  block: 'nearest',
                })
              }
            />
          ))}
        </div>
      )}

      {/* ── 2. CALENDARIO CON RISULTATI ────────────────────────────── */}
      <div className="mt-6">
        {/* Filtri per round (db rounds in AR mode) */}
        {totDbRounds > 1 && (
          <div className="round-filtri">
            <button
              type="button"
              className={`round-chip${roundFiltro === null ? ' attivo' : ''}`}
              onClick={() => setRoundFiltro(null)}
            >
              Tutti
            </button>
            {Array.from({ length: totDbRounds }, (_, i) => i + 1).map((r) => (
              <button
                key={r}
                type="button"
                className={`round-chip${roundFiltro === r ? ' attivo' : ''}`}
                onClick={() => setRoundFiltro(roundFiltro === r ? null : r)}
              >
                {ar ? nomeRoundDb(r, totRound, ar, finaleSecca, totDbRounds) : nomeRoundCorto(r, totRound)}
              </button>
            ))}
            {hasTerzoPosto && (
              <button
                type="button"
                className={`round-chip${roundFiltro === -1 ? ' attivo' : ''}`}
                onClick={() => setRoundFiltro(roundFiltro === -1 ? null : -1)}
              >
                3°/4° posto
              </button>
            )}
          </div>
        )}

        {/* Bracket rounds (db rounds in AR mode) */}
        {Array.from({ length: totDbRounds }, (_, i) => i + 1)
          .filter((round) => roundFiltro === null || round === roundFiltro)
          .map((dbRound) => {
          const bracketRound = ar ? bracketRoundDaDb(dbRound) : dbRound
          const roundIncontri = bracketIncontri
            .filter((m) => m.round === dbRound)
            .sort((a, b) => (Number(a.girone) || 0) - (Number(b.girone) || 0))
          const isGenerato = roundIncontri.length > 0
          const giocate = roundIncontri.filter(incontroDisputato).length
          const numSlotsRound = bracketSize / Math.pow(2, bracketRound)
          const roundLabel = ar
            ? nomeRoundDb(dbRound, totRound, ar, finaleSecca, totDbRounds)
            : nomeRound(dbRound, totRound)

          return (
            <div key={dbRound}>
              <div className="giornata-band">
                <div className="g-lab" style={{ flex: 1 }}>
                  <b>{roundLabel}</b>
                </div>
                <span className="g-stato">
                  {!isGenerato
                    ? 'In attesa'
                    : giocate === roundIncontri.length
                      ? 'Completato'
                      : `${giocate}/${roundIncontri.length} giocati`}
                </span>
              </div>
              {isGenerato
                ? roundIncontri.map((m) => (
                    <RigaMatch
                      key={m.id}
                      torneo={torneo}
                      m={m}
                      nomi={nomi}
                      loghi={loghi}
                      gestore={gestore}
                      prenByIncontro={prenByIncontro}
                      miaSquadraId={miaSquadraId}
                      squadreTorneo={squadre}
                      incontriTorneo={incontri}
                      compBySquadra={compBySquadra}
                      ar={ar}
                      finaleSecca={finaleSecca}
                      hasTerzoPosto={hasTerzoPosto}
                    />
                  ))
                : Array.from({ length: numSlotsRound }, (_, j) => j + 1).map((slot) => {
                    let casaId: number | string | null = null
                    let ospiteId: number | string | null = null
                    if (ar && !isLegAndata(dbRound)) {
                      // Ritorno: stesse squadre dell'andata ma con ruoli invertiti
                      const andataM = bracketIncontri.find(
                        (x) => x.round === dbRoundAndata(bracketRound) && Number(x.girone) === slot,
                      )
                      if (andataM) { casaId = andataM.ospite_id; ospiteId = andataM.casa_id }
                    } else {
                      const prevWins = ar ? allVin.get(bracketRound - 1) : allVin.get(dbRound - 1)
                      casaId = prevWins?.get((slot - 1) * 2 + 1) ?? null
                      ospiteId = prevWins?.get((slot - 1) * 2 + 2) ?? null
                    }
                    return (
                      <RigaTBD
                        key={slot}
                        casaNome={casaId != null ? (nomi[String(casaId)] ?? '?') : null}
                        ospiteNome={ospiteId != null ? (nomi[String(ospiteId)] ?? '?') : null}
                      />
                    )
                  })}
            </div>
          )
        })}

        {/* Sezione 3°/4° posto */}
        {hasTerzoPosto && (roundFiltro === null || roundFiltro === -1) && (() => {
          const terzoPosMatch = incontri.find((m) => Number(m.girone) === 0)
          return (
            <div>
              <div className="giornata-band">
                <div className="g-lab" style={{ flex: 1 }}><b>3°/4° posto</b></div>
                <span className="g-stato">
                  {!terzoPosMatch ? 'In attesa' : incontroDisputato(terzoPosMatch) ? 'Completato' : '0/1 giocati'}
                </span>
              </div>
              {terzoPosMatch ? (
                <RigaMatch
                  torneo={torneo}
                  m={terzoPosMatch}
                  nomi={nomi}
                  loghi={loghi}
                  gestore={gestore}
                  prenByIncontro={prenByIncontro}
                  miaSquadraId={miaSquadraId}
                  squadreTorneo={squadre}
                  incontriTorneo={incontri}
                  compBySquadra={compBySquadra}
                  ar={ar}
                  finaleSecca={finaleSecca}
                  hasTerzoPosto={hasTerzoPosto}
                />
              ) : (
                <RigaTBD casaNome={null} ospiteNome={null} />
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Riga singola nel bracket grafico
// ---------------------------------------------------------------------------
function BsTeamRow({
  nome,
  score,
  isWinner,
}: {
  nome: string | null
  score: number | null
  isWinner: boolean | null
}) {
  const cls =
    'bs-team-row' +
    (isWinner === true ? ' vincitore' : isWinner === false ? ' perdente' : '')
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

// ---------------------------------------------------------------------------
// Incontro nel calendario (programmazione + inserimento risultato)
// ---------------------------------------------------------------------------
function RigaMatch({
  torneo,
  m,
  nomi,
  loghi,
  gestore,
  prenByIncontro,
  miaSquadraId,
  squadreTorneo,
  incontriTorneo,
  compBySquadra,
  ar,
  finaleSecca,
  hasTerzoPosto,
}: {
  torneo: Torneo
  m: Incontro
  nomi: Record<string, string>
  loghi: Record<string, string | null>
  gestore: boolean
  prenByIncontro: Record<string, string>
  miaSquadraId?: number | string
  squadreTorneo: Squadra[]
  incontriTorneo: Incontro[]
  compBySquadra: Record<string, Componente[]>
  ar: boolean
  finaleSecca: boolean
  hasTerzoPosto: boolean
}) {
  const qc = useQueryClient()
  const disputata = incontroDisputato(m)
  const iso = prenByIncontro[String(m.id)]
  const dPren = iso ? new Date(iso) : null

  const vincitore =
    disputata
      ? m.punti_casa! > m.punti_ospite!
        ? m.casa_id
        : m.ospite_id
      : null

  const sonoNellaPartita =
    miaSquadraId != null &&
    (String(m.casa_id) === String(miaSquadraId) || String(m.ospite_id) === String(miaSquadraId))
  const puoSfidare =
    !gestore &&
    sonoNellaPartita &&
    torneo.sport === 'padel' &&
    torneo.stato === 'in_corso' &&
    !disputata &&
    !dPren

  const salva = useMutation({
    mutationFn: async (patch: Partial<Incontro>) => {
      const { error } = await supabase.from('incontri').update(patch).eq('id', m.id)
      if (error) throw error
      const dataEvento = iso ?? patch.data_disputata ?? m.data_disputata ?? null
      const aggiornato = { ...m, ...patch }
      await assegnaPuntiPartita(torneo, aggiornato, dataEvento)
      const incontriAgg = incontriTorneo.map((x) => (x.id === m.id ? aggiornato : x))
      await assegnaPuntiVittoriaAuto(torneo, squadreTorneo, incontriAgg, compBySquadra)

      const seedArr = (torneo.bracket_seed ?? []) as (number | string | null)[]
      const totBracketRound = seedArr.length > 0
        ? Math.round(Math.log2(seedArr.length))
        : numTurniEliminazione(squadreTorneo.length)
      const totDbRoundsLocal = ar ? numDbRoundsAR(totBracketRound, finaleSecca) : totBracketRound
      const slotCorr = Number(m.girone)
      const isTerzoPosto = slotCorr === 0

      if (isTerzoPosto || m.round > totDbRoundsLocal) return // nulla da propagare per 3° posto

      if (!ar) {
        // ── Logica NON-AR ────────────────────────────────────────────────
        if (slotCorr > 0 && m.round < totBracketRound) {
          const nuovoVinc =
            aggiornato.punti_casa != null && aggiornato.punti_ospite != null
              ? aggiornato.punti_casa > aggiornato.punti_ospite
                ? aggiornato.casa_id
                : aggiornato.ospite_id
              : null
          const slotSucc = Math.ceil(slotCorr / 2)
          const eCasa = slotCorr % 2 === 1
          const roundSucc = m.round + 1
          const matchSucc = incontriTorneo.find(
            (x) => x.round === roundSucc && Number(x.girone) === slotSucc,
          )
          if (nuovoVinc != null) {
            if (matchSucc) {
              const vecchio = eCasa ? matchSucc.casa_id : matchSucc.ospite_id
              if (String(vecchio) !== String(nuovoVinc)) {
                if (matchSucc.punti_casa != null) await azzeraChiave(`partita:${matchSucc.id}`)
                await supabase
                  .from('incontri')
                  .update({
                    ...(eCasa ? { casa_id: nuovoVinc } : { ospite_id: nuovoVinc }),
                    punti_casa: null,
                    punti_ospite: null,
                    set_punteggi: null,
                  })
                  .eq('id', matchSucc.id)
              }
            } else {
              const tuttiCompleti = incontriAgg
                .filter((x) => x.round === m.round && Number(x.girone || 0) !== 0)
                .every(incontroDisputato)
              if (tuttiCompleti) {
                const prossimi = incontriProssimoTurno(seedArr, incontriAgg, m.round)
                if (prossimi?.length) {
                  await supabase.from('incontri').insert(
                    prossimi.map((p) => ({
                      torneo_id: torneo.id,
                      round: roundSucc,
                      casa_id: p.casa,
                      ospite_id: p.ospite,
                      girone: p.slot,
                    })),
                  )
                }
              }
            }
          }
        }
        // Terzo posto (non-AR): dopo le semifinali genera la finalina.
        if (hasTerzoPosto && slotCorr > 0 && m.round === totBracketRound - 1) {
          const semiCompleti = incontriAgg
            .filter((x) => x.round === m.round && Number(x.girone || 0) !== 0)
            .every(incontroDisputato)
          if (semiCompleti) {
            const { count: tpCount } = await supabase
              .from('incontri').select('id', { count: 'exact', head: true })
              .eq('torneo_id', torneo.id).eq('girone', 0)
            if ((tpCount ?? 0) === 0) {
              const semiIncontri = incontriAgg.filter((x) => x.round === m.round && Number(x.girone || 0) !== 0)
              const perdenti: (number | string)[] = semiIncontri
                .filter((x) => x.punti_casa != null && x.punti_ospite != null)
                .map((x) => (x.punti_casa! > x.punti_ospite! ? x.ospite_id : x.casa_id))
              if (perdenti.length === 2) {
                await supabase.from('incontri').insert([{
                  torneo_id: torneo.id,
                  round: totBracketRound + 1,
                  casa_id: perdenti[0],
                  ospite_id: perdenti[1],
                  girone: 0,
                }])
              }
            }
          }
        }
      } else {
        // ── Logica AR ───────────────────────────────────────────────────
        const dbRound = m.round
        const bracketRound = bracketRoundDaDb(dbRound)
        const isAndata = isLegAndata(dbRound)
        const isFinaleBracket = bracketRound === totBracketRound
        const isSecca = isFinaleBracket && finaleSecca

        // Controlla con dati freschi dal DB se il round corrente è completo.
        const { data: roundRows } = await supabase
          .from('incontri')
          .select('id, punti_casa, punti_ospite, casa_id, ospite_id, girone')
          .eq('torneo_id', torneo.id)
          .eq('round', dbRound)
          .neq('girone', 0)
        const roundCompleto = roundRows != null
          && roundRows.length > 0
          && roundRows.every((r) => r.punti_casa != null && r.punti_ospite != null)
        if (!roundCompleto) return

        if (isAndata && !isSecca) {
          // Genera i match di ritorno (home/away scambiati) se non esistono già.
          const dbRit = dbRoundRitorno(bracketRound)
          const { count: ritCount } = await supabase
            .from('incontri').select('id', { count: 'exact', head: true })
            .eq('torneo_id', torneo.id).eq('round', dbRit)
          if ((ritCount ?? 0) === 0 && roundRows.length > 0) {
            await supabase.from('incontri').insert(
              roundRows.map((a) => ({
                torneo_id: torneo.id,
                round: dbRit,
                casa_id: a.ospite_id,
                ospite_id: a.casa_id,
                girone: a.girone,
              })),
            )
          }
        } else {
          // Ritorno (o finale secca) completato → propaga al prossimo bracket round.
          // Usa dati freschi dal DB (non il prop stale) per calcolare i vincitori.
          const { data: freshRows } = await supabase
            .from('incontri')
            .select('id, round, punti_casa, punti_ospite, casa_id, ospite_id, girone, set_punteggi')
            .eq('torneo_id', torneo.id)
            .not('girone', 'is', null)
            .neq('girone', 0)
          const bracketIncontriAgg = (freshRows ?? []) as Incontro[]
          const allVinAR = calcolaVincitoriEliminazioneAR(seedArr, bracketIncontriAgg, finaleSecca)

          if (!isFinaleBracket) {
            // Genera (o completa) l'andata del bracket round successivo slot per slot.
            // Il check per-slot consente di inserire i match mancanti anche se alcuni
            // slot erano già stati creati da un salvataggio precedente con vincitori noti.
            const nextBracket = bracketRound + 1
            const nextDbRound = dbRoundAndata(nextBracket)
            const winsThisRound = allVinAR.get(bracketRound)
            if (winsThisRound) {
              const numSlotsNext = seedArr.length / Math.pow(2, nextBracket)
              for (let s = 1; s <= numSlotsNext; s++) {
                const casaId = winsThisRound.get((s - 1) * 2 + 1)
                const ospiteId = winsThisRound.get((s - 1) * 2 + 2)
                if (casaId == null || ospiteId == null) continue
                const { data: existing } = await supabase
                  .from('incontri').select('id, casa_id, ospite_id, punti_casa')
                  .eq('torneo_id', torneo.id).eq('round', nextDbRound).eq('girone', s)
                  .maybeSingle()
                if (!existing) {
                  await supabase.from('incontri').insert({
                    torneo_id: torneo.id, round: nextDbRound,
                    casa_id: casaId, ospite_id: ospiteId, girone: s,
                  })
                } else if (existing.punti_casa == null) {
                  // Match non ancora giocato: aggiorna i team se il vincitore è cambiato.
                  const upd: Record<string, unknown> = {}
                  if (String(existing.casa_id) !== String(casaId)) upd.casa_id = casaId
                  if (String(existing.ospite_id) !== String(ospiteId)) upd.ospite_id = ospiteId
                  if (Object.keys(upd).length > 0)
                    await supabase.from('incontri').update(upd).eq('id', existing.id)
                }
                // Se già giocato non si tocca.
              }
            }

            // Terzo posto AR: generato dopo i semifinali.
            // Il perdente di ogni slot è ricavato da allVinAR (include tiebreaker game)
            // confrontandolo con le squadre dell'andata: l'altra è il perdente.
            if (hasTerzoPosto && bracketRound === totBracketRound - 1) {
              const semiWins = allVinAR.get(bracketRound)
              const semifinalDbAndata = dbRoundAndata(bracketRound)
              const semiAndataIncontri = bracketIncontriAgg.filter((x) => x.round === semifinalDbAndata)
              const perdenti: (number | string)[] = []
              for (const andataS of semiAndataIncontri) {
                const slot = Number(andataS.girone)
                const winner = semiWins?.get(slot)
                if (winner == null) continue
                const loser = String(andataS.casa_id) === String(winner)
                  ? andataS.ospite_id
                  : andataS.casa_id
                perdenti.push(loser)
              }
              if (perdenti.length === 2) {
                const { data: tpExisting } = await supabase
                  .from('incontri').select('id, casa_id, ospite_id, punti_casa')
                  .eq('torneo_id', torneo.id).eq('girone', 0)
                  .maybeSingle()
                if (!tpExisting) {
                  await supabase.from('incontri').insert([{
                    torneo_id: torneo.id,
                    round: totDbRoundsLocal + 1,
                    casa_id: perdenti[0],
                    ospite_id: perdenti[1],
                    girone: 0,
                  }])
                } else if (tpExisting.punti_casa == null) {
                  const upd: Record<string, unknown> = {}
                  if (String(tpExisting.casa_id) !== String(perdenti[0])) upd.casa_id = perdenti[0]
                  if (String(tpExisting.ospite_id) !== String(perdenti[1])) upd.ospite_id = perdenti[1]
                  if (Object.keys(upd).length > 0)
                    await supabase.from('incontri').update(upd).eq('id', tpExisting.id)
                }
              }
            }
          }
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei'] }),
    onError: (e: unknown) =>
      window.alert(
        mancaColonnaRisultato(e)
          ? SCRIPT_RISULTATO
          : 'Salvataggio non riuscito: ' + messaggioErrore(e),
      ),
  })

  const casaClass =
    'match-side' +
    (vincitore != null
      ? String(vincitore) === String(m.casa_id)
        ? ' vincitore'
        : ' perdente'
      : '')
  const ospiteClass =
    'match-side' +
    (vincitore != null
      ? String(vincitore) === String(m.ospite_id)
        ? ' vincitore'
        : ' perdente'
      : '')

  return (
    <div className={'match' + (disputata ? ' giocata' : '')}>
      <div className="match-row">
        <div className={casaClass}>
          <NomeSquadra
            nome={nomi[String(m.casa_id)] ?? '?'}
            logoUrl={loghi[String(m.casa_id)]}
            sport={torneo.sport}
          />
        </div>
        <div className="match-ris">
          {disputata ? (
            <>
              {m.punti_casa}–{m.punti_ospite}
              {torneo.sport === 'padel' && m.set_punteggi?.length ? (
                <span className="set-line">{formattaSet(m.set_punteggi)}</span>
              ) : null}
            </>
          ) : (
            <span className="vs">vs</span>
          )}
        </div>
        <div className={ospiteClass}>
          <NomeSquadra
            nome={nomi[String(m.ospite_id)] ?? '?'}
            logoUrl={loghi[String(m.ospite_id)]}
            sport={torneo.sport}
          />
        </div>
      </div>

      <div className="match-meta">
        {dPren ? (
          <span className={'chip-data' + (disputata ? '' : ' prog')}>
            {!disputata && ICO_CAL}
            {dPren.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }) +
              ' · ' +
              dPren.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : m.data_disputata ? (
          <span className="chip-data">
            {new Date(m.data_disputata + 'T00:00:00').toLocaleDateString('it-IT', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        ) : (
          <span className="chip-data attesa">Da programmare</span>
        )}
        {puoSfidare && (
          <BottoneProgramma
            torneo={torneo}
            m={m}
            nomi={nomi}
            compCasa={compBySquadra[String(m.casa_id)] ?? []}
            compOspite={compBySquadra[String(m.ospite_id)] ?? []}
            etichetta="Sfida"
            titolo="Organizza la sfida"
          />
        )}
      </div>

      {gestore && !disputata && (
        <div className="match-prog">
          <BottoneProgramma
            torneo={torneo}
            m={m}
            nomi={nomi}
            compCasa={compBySquadra[String(m.casa_id)] ?? []}
            compOspite={compBySquadra[String(m.ospite_id)] ?? []}
            etichetta={dPren ? 'Riprogramma' : 'Programma'}
          />
          {dPren && <BottoneAnnullaProgrammazione m={m} />}
        </div>
      )}

      {gestore && dPren ? (
        torneo.sport === 'padel' ? (
          <EditorPadel m={m} salva={salva.mutate} inSalvataggio={salva.isPending} />
        ) : (
          <EditorCalcio m={m} salva={salva.mutate} inSalvataggio={salva.isPending} />
        )
      ) : gestore && !dPren ? (
        <p className="match-avviso">Programma l'incontro prima di inserire il risultato.</p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Riga TBD: match non ancora generato nel turno (anteprima del calendario)
// ---------------------------------------------------------------------------
function RigaTBD({
  casaNome,
  ospiteNome,
}: {
  casaNome: string | null
  ospiteNome: string | null
}) {
  return (
    <div className="match" style={{ opacity: 0.45 }}>
      <div className="match-row">
        <div className="match-side">
          <span>{casaNome ?? 'TBD'}</span>
        </div>
        <div className="match-ris">
          <span className="vs">vs</span>
        </div>
        <div className="match-side">
          <span>{ospiteNome ?? 'TBD'}</span>
        </div>
      </div>
      <div className="match-meta">
        <span className="chip-data attesa">In attesa del turno precedente</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor calcio (no pareggi)
// ---------------------------------------------------------------------------
function EditorCalcio({
  m,
  salva,
  inSalvataggio,
}: {
  m: Incontro
  salva: (patch: Partial<Incontro>) => void
  inSalvataggio: boolean
}) {
  const [casa, setCasa] = useState(m.punti_casa == null ? '' : String(m.punti_casa))
  const [ospite, setOspite] = useState(m.punti_ospite == null ? '' : String(m.punti_ospite))

  function onSalva() {
    if (casa.trim() === '' && ospite.trim() === '') {
      salva({ punti_casa: null, punti_ospite: null })
      return
    }
    const a = parseInt(casa, 10)
    const b = parseInt(ospite, 10)
    if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) {
      window.alert('Inserisci due punteggi validi (numeri ≥ 0).')
      return
    }
    if (a === b) {
      window.alert("Nell'eliminazione diretta non sono ammessi pareggi.")
      return
    }
    salva({ punti_casa: a, punti_ospite: b })
  }

  return (
    <div className="match-admin">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={casa}
        onChange={(e) => setCasa(e.target.value)}
      />
      <span>–</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={ospite}
        onChange={(e) => setOspite(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-secondario"
        onClick={onSalva}
        disabled={inSalvataggio}
      >
        Salva
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor padel (set by set)
// ---------------------------------------------------------------------------
function EditorPadel({
  m,
  salva,
  inSalvataggio,
}: {
  m: Incontro
  salva: (patch: Partial<Incontro>) => void
  inSalvataggio: boolean
}) {
  type RigaSet = { casa: string; ospite: string }
  const iniziali: RigaSet[] =
    m.set_punteggi?.length
      ? m.set_punteggi.map((s) => ({ casa: String(s.casa), ospite: String(s.ospite) }))
      : [{ casa: '', ospite: '' }]
  const [sets, setSets] = useState<RigaSet[]>(iniziali)

  const aggiorna = (i: number, campo: 'casa' | 'ospite', val: string) =>
    setSets((prev) => prev.map((r, j) => (j === i ? { ...r, [campo]: val } : r)))
  const togliSet = (i: number) => setSets((prev) => prev.filter((_, j) => j !== i))
  const aggiungiSet = () => setSets((prev) => [...prev, { casa: '', ospite: '' }])

  function onSalva() {
    const nonVuoti = sets.filter((s) => s.casa.trim() !== '' || s.ospite.trim() !== '')
    if (!nonVuoti.length) {
      salva({ punti_casa: null, punti_ospite: null, set_punteggi: null })
      return
    }
    const validi: SetPunteggio[] = []
    for (let i = 0; i < nonVuoti.length; i++) {
      const c = parseInt(nonVuoti[i].casa, 10)
      const o = parseInt(nonVuoti[i].ospite, 10)
      if (Number.isNaN(c) || Number.isNaN(o) || c < 0 || o < 0) {
        window.alert('Set ' + (i + 1) + ': inserisci i game di entrambe le coppie (numeri ≥ 0).')
        return
      }
      if (c === o) {
        window.alert('Set ' + (i + 1) + ': un set di padel non può finire in parità.')
        return
      }
      validi.push({ casa: c, ospite: o })
    }
    const v = setVinti(validi)
    if (v.casa === v.ospite) {
      window.alert('Risultato in parità di set: nel padel deve esserci una coppia vincitrice.')
      return
    }
    salva({ punti_casa: v.casa, punti_ospite: v.ospite, set_punteggi: validi })
  }

  return (
    <div className="match-admin">
      <div className="set-editor">
        {sets.map((r, i) => (
          <div key={i} className="set-riga">
            <span className="set-et">Set {i + 1}</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="set-game"
              value={r.casa}
              onChange={(e) => aggiorna(i, 'casa', e.target.value)}
            />
            <span>–</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="set-game"
              value={r.ospite}
              onChange={(e) => aggiorna(i, 'ospite', e.target.value)}
            />
            {sets.length > 1 && (
              <button
                type="button"
                className="x"
                title="Togli set"
                onClick={() => togliSet(i)}
              >
                ×
              </button>
            )}
            {i === 0 && (
              <button
                type="button"
                className="btn btn-secondario set-piu"
                onClick={aggiungiSet}
              >
                + Set
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondario"
        onClick={onSalva}
        disabled={inSalvataggio}
      >
        Salva
      </button>
    </div>
  )
}
