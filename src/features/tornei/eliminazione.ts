// Logica del tabellone ad eliminazione diretta.
//
// Il campo "girone" degli incontri viene riusato come "slot" (posizione) all'interno
// del turno: slot 1, 2, 3, …  Dal turno K slot S il vincitore va al turno K+1
// slot ceil(S/2), come casa se S è dispari, come ospite se S è pari.
//
// bracket_seed (salvato su tornei.bracket_seed): array di lunghezza = prossima
// potenza di 2 rispetto alle squadre. Ogni coppia adiacente (seed[0],seed[1]),
// (seed[2],seed[3]), … rappresenta un accoppiamento del 1° turno.
// null = bye (quella squadra avanza senza giocare).
// Con N non potenza di 2, i null vengono aggiunti in coda: le ultime coppie che
// hanno un solo elemento reale generano bye automatici.

import type { Incontro, SetPunteggio } from './tipi'
import { incontroDisputato } from './calendario'

function sumGames(sets: SetPunteggio[] | null | undefined, side: 'casa' | 'ospite'): number {
  return (sets ?? []).reduce((acc, s) => acc + s[side], 0)
}

// Prossima potenza di 2 ≥ n.
export function prossimaPotenzaDi2(n: number): number {
  if (n <= 1) return 1
  let p = 1
  while (p < n) p *= 2
  return p
}

// Totale turni nel bracket per N squadre (= log2 della dimensione del bracket).
export function numTurniEliminazione(numSquadre: number): number {
  return Math.log2(prossimaPotenzaDi2(numSquadre))
}

// Simboli standard andata / ritorno usati in tutti i filtri e le etichette AR.
export const SIMBOLO_ANDATA = '(A)'
export const SIMBOLO_RITORNO = '(R)'

// Nome completo di un turno (usato nelle intestazioni del tabellone grafico).
export function nomeRound(round: number, totRound: number): string {
  const daFine = totRound - round
  if (daFine === 0) return 'Finale'
  if (daFine === 1) return 'Semifinali'
  if (daFine === 2) return 'Quarti di finale'
  if (daFine === 3) return 'Ottavi di finale'
  if (daFine === 4) return 'Sedicesimi di finale'
  return 'Turno ' + round
}

// Nome breve di un turno (usato nei filtri e nelle etichette AR compatte).
export function nomeRoundCorto(bracketRound: number, totRound: number): string {
  const daFine = totRound - bracketRound
  if (daFine === 0) return 'Finale'
  if (daFine === 1) return 'Semi'
  if (daFine === 2) return 'Quarti'
  if (daFine === 3) return 'Ottavi'
  if (daFine === 4) return 'Sedicesimi'
  return 'T' + bracketRound
}

// Genera il seed iniziale con distribuzione corretta dei bye.
//
// Il problema del vecchio approccio (null in coda) era che con N non potenza
// di 2 si creano coppie (null, null) = slot "fantasma": il team in coda
// al gruppo di bye superava 2 turni consecutivi arrivando diretto in finale.
//
// Soluzione: calcoliamo quanti incontri reali ci sono nel 1° turno e
// quanti team ottengono il bye, poi costruiamo il seed così:
//   [bye₁, null, bye₂, null, …, casa₁, ospite₁, casa₂, ospite₂, …]
// In questo modo ogni null è sempre affiancato a un team reale → zero slot
// fantasma → nessun team salta più di un turno per bye.
export function generaBracketSeed(
  teamIds: (number | string)[],
): (number | string | null)[] {
  const N = teamIds.length
  const bracketSize = prossimaPotenzaDi2(N)
  const shuffled = teamIds.slice().sort(() => Math.random() - 0.5)

  // Incontri reali nel 1° turno e team che ottengono bye
  const numIncontriR1 = N - bracketSize / 2   // ≥ 0
  const matchTeams = shuffled.slice(0, numIncontriR1 * 2)
  const byeTeams = shuffled.slice(numIncontriR1 * 2)

  // Prima i bye (ognuno affiancato a null), poi le coppie degli incontri reali
  const seed: (number | string | null)[] = []
  for (const t of byeTeams) seed.push(t, null)
  for (let i = 0; i < matchTeams.length; i += 2) seed.push(matchTeams[i], matchTeams[i + 1])
  return seed
}

// Dal seed iniziale produce le descrizioni degli incontri del 1° turno.
// Le coppie con un null (bye) non generano un incontro.
export function incontriDaSeed(
  seed: (number | string | null)[],
): { casa: number | string; ospite: number | string; slot: number }[] {
  const out: { casa: number | string; ospite: number | string; slot: number }[] = []
  for (let i = 0; i < seed.length; i += 2) {
    const a = seed[i]
    const b = seed[i + 1]
    if (a != null && b != null) out.push({ casa: a, ospite: b, slot: i / 2 + 1 })
  }
  return out
}

// Calcola i vincitori di ogni slot in ogni turno, inclusi i bye.
// Restituisce Map<turno, Map<slot, teamId>>.
export function calcolaVincitoriEliminazione(
  seed: (number | string | null)[],
  incontri: Incontro[],
): Map<number, Map<number, number | string>> {
  const allVin = new Map<number, Map<number, number | string>>()
  const bracketSize = seed.length
  const totRound = Math.log2(bracketSize)

  for (let round = 1; round <= totRound; round++) {
    const slotsPrev = bracketSize / Math.pow(2, round - 1)
    const roundIncontri = incontri.filter((m) => m.round === round)
    const vin = new Map<number, number | string>()

    for (const m of roundIncontri) {
      const slot = Number(m.girone) || 0
      if (!slot || !incontroDisputato(m)) continue
      vin.set(slot, m.punti_casa! > m.punti_ospite! ? m.casa_id : m.ospite_id)
    }

    if (round === 1) {
      // Bye da seed: coppia (team, null) → team avanza senza giocare.
      for (let i = 0; i < seed.length; i += 2) {
        const slot = i / 2 + 1
        if (vin.has(slot)) continue
        const a = seed[i], b = seed[i + 1]
        if (a != null && b == null) vin.set(slot, a)
        else if (a == null && b != null) vin.set(slot, b)
      }
    } else {
      const precVin = allVin.get(round - 1)!
      // Propaghiamo il bye SOLO se lo slot opposto non ha mai avuto un incontro
      // generato nel DB (slot strutturalmente vuoto per via del bracket).
      // Se lo slot opposto ha un match ma non è ancora stato giocato, w2 sarà
      // null ma NON dobbiamo propagare: altrimenti il vincitore del primo quarto
      // compare già in semifinale e finale prima di averli giocati.
      const slotsConMatch = new Set(
        incontri.filter((m) => m.round === round - 1).map((m) => Number(m.girone)),
      )
      for (let s = 1; s <= slotsPrev; s += 2) {
        const newSlot = Math.ceil(s / 2)
        if (vin.has(newSlot)) continue
        const w1 = precVin.get(s)
        const w2 = precVin.get(s + 1)
        // Propaga solo verso slot la cui coppia non ha un match in DB
        if (w1 != null && w2 == null && !slotsConMatch.has(s + 1)) vin.set(newSlot, w1)
        else if (w1 == null && w2 != null && !slotsConMatch.has(s)) vin.set(newSlot, w2)
      }
    }

    allVin.set(round, vin)
  }
  return allVin
}

// Dato il turno corrente completo, genera gli incontri per il turno successivo.
// Restituisce null se non tutti gli incontri del turno corrente sono stati disputati.
export function incontriProssimoTurno(
  seed: (number | string | null)[],
  incontri: Incontro[],
  turnoCorrente: number,
): { casa: number | string; ospite: number | string; slot: number }[] | null {
  const bracketSize = seed.length
  const slotsCorrente = bracketSize / Math.pow(2, turnoCorrente)

  const incontriTurno = incontri.filter((m) => m.round === turnoCorrente)
  if (!incontriTurno.length || !incontriTurno.every(incontroDisputato)) return null

  const allVin = calcolaVincitoriEliminazione(seed, incontri)
  const vinCorrente = allVin.get(turnoCorrente)
  if (!vinCorrente) return null

  const out: { casa: number | string; ospite: number | string; slot: number }[] = []
  for (let s = 1; s <= slotsCorrente; s += 2) {
    const w1 = vinCorrente.get(s)
    const w2 = vinCorrente.get(s + 1)
    if (w1 != null && w2 != null) {
      out.push({ casa: w1, ospite: w2, slot: Math.ceil(s / 2) })
    }
    // una sola squadra: otterrà bye nel calcolo del turno successivo
  }
  return out
}

// Vincitore del torneo = chi vince la Finale (slot 1 del turno totRound).
// totRound deve essere numTurniEliminazione(N): usando maxRound dal DB si
// rischiava di riconoscere come "Finale" il primo incontro del 1° turno generato.
export function vincitoreEliminazione(
  incontri: Incontro[],
  totRound: number,
): number | string | null {
  const finale = incontri.find((m) => m.round === totRound && Number(m.girone) === 1)
  if (!finale || !incontroDisputato(finale)) return null
  if (finale.punti_casa! > finale.punti_ospite!) return finale.casa_id
  if (finale.punti_ospite! > finale.punti_casa!) return finale.ospite_id
  return null
}

// Il turno più alto presente (0 = nessun incontro generato).
export function turnoCorrenteEliminazione(incontri: Incontro[]): number {
  if (!incontri.length) return 0
  return Math.max(...incontri.map((m) => m.round))
}

// Tutti gli incontri del turno dato sono stati disputati.
export function turnoCompletoEliminazione(incontri: Incontro[], round: number): boolean {
  const ri = incontri.filter((m) => m.round === round)
  return ri.length > 0 && ri.every(incontroDisputato)
}

// ── Andata e ritorno per eliminazione diretta ─────────────────────────────────
//
// In modalità andata_ritorno il bracket round k usa:
//   db-round 2k-1  → andata
//   db-round 2k    → ritorno  (eccezione: se k = finale e finale_secca, solo andata)
// girone = 0 è riservato alla partita per il 3°/4° posto (mai nel bracket principale).

export function dbRoundAndata(bracketRound: number): number {
  return 2 * bracketRound - 1
}
export function dbRoundRitorno(bracketRound: number): number {
  return 2 * bracketRound
}
export function bracketRoundDaDb(dbRound: number): number {
  return Math.ceil(dbRound / 2)
}
export function isLegAndata(dbRound: number): boolean {
  return dbRound % 2 === 1
}

// Numero totale di db-round del bracket in modalità AR (escluso terzo posto).
export function numDbRoundsAR(totBracketRound: number, finaleSecca: boolean): number {
  return finaleSecca ? 2 * totBracketRound - 1 : 2 * totBracketRound
}

// Etichetta di un db-round per filtri e calendario. In modalità AR usa nome
// breve + simbolo andata/ritorno per contenere lo spazio.
export function nomeRoundDb(
  dbRound: number,
  totBracketRound: number,
  andataRitorno: boolean,
  finaleSecca: boolean,
  totDbRounds: number,
): string {
  if (dbRound > totDbRounds) return '3°/4° posto'
  if (!andataRitorno) return nomeRound(dbRound, totBracketRound)
  const br = bracketRoundDaDb(dbRound)
  const isAnd = isLegAndata(dbRound)
  const isFinale = br === totBracketRound
  const base = nomeRoundCorto(br, totBracketRound)
  if (isFinale && finaleSecca) return base
  return base + ' ' + (isAnd ? SIMBOLO_ANDATA : SIMBOLO_RITORNO)
}

// Calcola i vincitori per bracket round in modalità andata/ritorno.
// Restituisce Map<bracketRound, Map<slot, teamId>>.
// La chiave slot = 0 è ignorata (riservata al terzo posto).
export function calcolaVincitoriEliminazioneAR(
  seed: (number | string | null)[],
  incontri: Incontro[],
  finaleSecca: boolean,
): Map<number, Map<number, number | string>> {
  const allVin = new Map<number, Map<number, number | string>>()
  const bracketSize = seed.length
  if (!bracketSize) return allVin
  const totBR = Math.round(Math.log2(bracketSize))

  for (let br = 1; br <= totBR; br++) {
    const vin = new Map<number, number | string>()
    const isFinale = br === totBR
    const andataDb = dbRoundAndata(br)
    const ritornoDb = dbRoundRitorno(br)
    const soloAndata = isFinale && finaleSecca

    const andataIncontri = incontri.filter((m) => m.round === andataDb)
    const ritornoIncontri = soloAndata ? [] : incontri.filter((m) => m.round === ritornoDb)

    for (const andata of andataIncontri) {
      const slot = Number(andata.girone) || 0
      if (!slot) continue
      if (soloAndata) {
        if (!incontroDisputato(andata)) continue
        vin.set(slot, andata.punti_casa! > andata.punti_ospite! ? andata.casa_id : andata.ospite_id)
      } else {
        const ritorno = ritornoIncontri.find((r) => Number(r.girone) === slot)
        if (!ritorno || !incontroDisputato(andata) || !incontroDisputato(ritorno)) continue
        // Andata: A(casa) vs B(ospite). Ritorno generato con teams scambiati: B(casa) vs A(ospite).
        // Aggregato A = andata.punti_casa + ritorno.punti_ospite
        // Aggregato B = andata.punti_ospite + ritorno.punti_casa
        const aggA = andata.punti_casa! + ritorno.punti_ospite!
        const aggB = andata.punti_ospite! + ritorno.punti_casa!
        if (aggA > aggB) { vin.set(slot, andata.casa_id); continue }
        if (aggB > aggA) { vin.set(slot, andata.ospite_id); continue }
        // Parità nei set → differenza game
        const gA = sumGames(andata.set_punteggi, 'casa') + sumGames(ritorno.set_punteggi, 'ospite')
        const gB = sumGames(andata.set_punteggi, 'ospite') + sumGames(ritorno.set_punteggi, 'casa')
        if (gA > gB) vin.set(slot, andata.casa_id)
        else if (gB > gA) vin.set(slot, andata.ospite_id)
        // pareggio anche nei game → nessun vincitore
      }
    }

    // Bye del round 1 (stesso della versione standard)
    if (br === 1) {
      for (let i = 0; i < seed.length; i += 2) {
        const slot = i / 2 + 1
        if (vin.has(slot)) continue
        const a = seed[i], b = seed[i + 1]
        if (a != null && b == null) vin.set(slot, a)
        else if (a == null && b != null) vin.set(slot, b)
      }
    } else {
      const prevVin = allVin.get(br - 1)!
      const slotsPrev = bracketSize / Math.pow(2, br - 1)
      const prevAndataDb = dbRoundAndata(br - 1)
      const slotsConAndata = new Set(
        incontri.filter((m) => m.round === prevAndataDb).map((m) => Number(m.girone)),
      )
      for (let s = 1; s <= slotsPrev; s += 2) {
        const newSlot = Math.ceil(s / 2)
        if (vin.has(newSlot)) continue
        const w1 = prevVin.get(s)
        const w2 = prevVin.get(s + 1)
        if (w1 != null && w2 == null && !slotsConAndata.has(s + 1)) vin.set(newSlot, w1)
        else if (w1 == null && w2 != null && !slotsConAndata.has(s)) vin.set(newSlot, w2)
      }
    }

    allVin.set(br, vin)
  }
  return allVin
}

// Vincitore del torneo in modalità AR.
export function vincitoreEliminazioneAR(
  incontri: Incontro[],
  totBracketRound: number,
  finaleSecca: boolean,
): number | string | null {
  const andataDb = dbRoundAndata(totBracketRound)
  const andataMatch = incontri.find((m) => m.round === andataDb && Number(m.girone) === 1)
  if (!andataMatch || !incontroDisputato(andataMatch)) return null
  if (finaleSecca) {
    if (andataMatch.punti_casa === andataMatch.punti_ospite) return null
    return andataMatch.punti_casa! > andataMatch.punti_ospite! ? andataMatch.casa_id : andataMatch.ospite_id
  }
  const ritornoDb = dbRoundRitorno(totBracketRound)
  const ritornoMatch = incontri.find((m) => m.round === ritornoDb && Number(m.girone) === 1)
  if (!ritornoMatch || !incontroDisputato(ritornoMatch)) return null
  const aggA = andataMatch.punti_casa! + ritornoMatch.punti_ospite!
  const aggB = andataMatch.punti_ospite! + ritornoMatch.punti_casa!
  if (aggA > aggB) return andataMatch.casa_id
  if (aggB > aggA) return andataMatch.ospite_id
  // Parità nei set → differenza game
  const gA = sumGames(andataMatch.set_punteggi, 'casa') + sumGames(ritornoMatch.set_punteggi, 'ospite')
  const gB = sumGames(andataMatch.set_punteggi, 'ospite') + sumGames(ritornoMatch.set_punteggi, 'casa')
  if (gA > gB) return andataMatch.casa_id
  if (gB > gA) return andataMatch.ospite_id
  return null
}
