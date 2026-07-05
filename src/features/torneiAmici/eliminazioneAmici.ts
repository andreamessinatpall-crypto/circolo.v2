// Progressione del tabellone ad eliminazione diretta per i tornei tra amici,
// con supporto ad andata/ritorno, finale secca e 3°/4° posto — riusa le
// funzioni pure già testate dei tornei ufficiali (eliminazione.ts:
// calcolaVincitoriEliminazione/AR, dbRoundAndata/Ritorno, isLegAndata,
// numTurniEliminazione) invece di reimplementare la stessa matematica.
//
// A differenza del sistema ufficiale (dove tutto avviene dentro un unico,
// grande componente React), qui la logica è isolata in funzioni pure così
// da poterla testare, dato che introduce un algoritmo nuovo (l'aggregato
// andata+ritorno applicato a un tabellone a coppie fisse tra amici).

import {
  bracketRoundDaDb,
  calcolaVincitoriEliminazione,
  calcolaVincitoriEliminazioneAR,
  dbRoundAndata,
  dbRoundRitorno,
  isLegAndata,
  numTurniEliminazione,
} from '@/features/tornei/eliminazione'
import { incontroDisputato } from '@/features/tornei/calendario'
import type { Incontro } from '@/features/tornei/tipi'

export interface OpzioniEliminazioneAmici {
  andataRitorno: boolean
  finaleSecca: boolean
  terzoPosto: boolean
}

export interface NuovaRigaAmici {
  round: number
  girone: number | null
  casa_id: string
  ospite_id: string
}

function totBracketRound(seed: unknown[]): number {
  return Math.round(Math.log2(seed.length))
}

// Il turno (bracket round) è completo quando tutte le sue partite sono
// disputate — entrambe le gambe, se andata/ritorno (salvo finale secca).
function turnoCompleto(
  incontri: Incontro[],
  br: number,
  opz: OpzioniEliminazioneAmici,
  isFinal: boolean,
): boolean {
  const soloAndata = isFinal && opz.finaleSecca
  if (!opz.andataRitorno || soloAndata) {
    const ri = incontri.filter((m) => m.round === br && Number(m.girone || 0) !== 0)
    return ri.length > 0 && ri.every(incontroDisputato)
  }
  const ra = incontri.filter((m) => m.round === dbRoundAndata(br) && Number(m.girone || 0) !== 0)
  const rr = incontri.filter((m) => m.round === dbRoundRitorno(br) && Number(m.girone || 0) !== 0)
  return ra.length > 0 && ra.every(incontroDisputato) && rr.length > 0 && rr.every(incontroDisputato)
}

// Dopo il salvataggio di un risultato, cosa va generato in più (se c'è):
// il ritorno dello stesso slot, il turno successivo del tabellone, e/o la
// finalina 3°/4° posto. Ogni chiamata calcola tutto da zero a partire dallo
// stato attuale (incontri include già il risultato appena salvato).
export function prossimeRigheEliminazioneAmici(
  seed: (string | null)[],
  incontri: Incontro[],
  incontroSalvato: Incontro,
  opz: OpzioniEliminazioneAmici,
): NuovaRigaAmici[] {
  const tot = totBracketRound(seed)
  const br = opz.andataRitorno ? bracketRoundDaDb(incontroSalvato.round) : incontroSalvato.round
  const isFinal = br === tot
  const righe: NuovaRigaAmici[] = []

  // 1) Ritorno dello slot appena giocato (solo se questa era la gamba di andata).
  const soloAndataQuiFinale = isFinal && opz.finaleSecca
  if (opz.andataRitorno && !soloAndataQuiFinale && isLegAndata(incontroSalvato.round)) {
    const ritornoDb = dbRoundRitorno(br)
    const giaEsiste = incontri.some((m) => m.round === ritornoDb && Number(m.girone) === Number(incontroSalvato.girone))
    if (!giaEsiste) {
      righe.push({
        round: ritornoDb,
        girone: incontroSalvato.girone,
        casa_id: String(incontroSalvato.ospite_id),
        ospite_id: String(incontroSalvato.casa_id),
      })
      // Il ritorno non è ancora stato inserito: il turno non può essere completo,
      // niente altro da generare finché non arriva anche quel risultato.
      return righe
    }
  }

  // 2) Turno successivo del tabellone (solo se il turno corrente è completo).
  if (turnoCompleto(incontri, br, opz, isFinal) && br < tot) {
    const vinMap = opz.andataRitorno
      ? calcolaVincitoriEliminazioneAR(seed, incontri, opz.finaleSecca)
      : calcolaVincitoriEliminazione(seed, incontri)
    const vinCorrente = vinMap.get(br)
    if (vinCorrente) {
      const slotsCorrente = seed.length / Math.pow(2, br)
      const brSucc = br + 1
      for (let s = 1; s <= slotsCorrente; s += 2) {
        const w1 = vinCorrente.get(s)
        const w2 = vinCorrente.get(s + 1)
        if (w1 == null || w2 == null) continue
        const slotSucc = Math.ceil(s / 2)
        const roundSucc = opz.andataRitorno ? dbRoundAndata(brSucc) : brSucc
        const giaEsiste = incontri.some((m) => m.round === roundSucc && Number(m.girone) === slotSucc)
        if (!giaEsiste) {
          righe.push({ round: roundSucc, girone: slotSucc, casa_id: String(w1), ospite_id: String(w2) })
        }
      }
    }
  }

  // 3) Finalina 3°/4° posto: dopo le semifinali (br = tot-1), con i due perdenti.
  if (opz.terzoPosto && br === tot - 1 && turnoCompleto(incontri, br, opz, isFinal)) {
    const giaEsiste = incontri.some((m) => Number(m.girone) === 0)
    if (!giaEsiste) {
      const perdenti = perdentiTurno(seed, incontri, br, opz)
      if (perdenti.length === 2) {
        const ultimoRoundUsato = opz.andataRitorno && !(isFinal && opz.finaleSecca)
          ? dbRoundRitorno(tot)
          : opz.andataRitorno
            ? dbRoundAndata(tot)
            : tot
        righe.push({ round: ultimoRoundUsato + 1, girone: 0, casa_id: perdenti[0], ospite_id: perdenti[1] })
      }
    }
  }

  return righe
}

// Perdenti di ogni slot del turno br (serve solo per la finalina 3°/4°).
function perdentiTurno(
  seed: (string | null)[],
  incontri: Incontro[],
  br: number,
  opz: OpzioniEliminazioneAmici,
): string[] {
  const slots = seed.length / Math.pow(2, br)
  const out: string[] = []
  for (let slot = 1; slot <= slots; slot++) {
    if (!opz.andataRitorno) {
      const m = incontri.find((x) => x.round === br && Number(x.girone) === slot)
      if (!m || !incontroDisputato(m)) continue
      out.push(String(m.punti_casa! > m.punti_ospite! ? m.ospite_id : m.casa_id))
    } else {
      const andata = incontri.find((x) => x.round === dbRoundAndata(br) && Number(x.girone) === slot)
      const ritorno = incontri.find((x) => x.round === dbRoundRitorno(br) && Number(x.girone) === slot)
      if (!andata || !ritorno || !incontroDisputato(andata) || !incontroDisputato(ritorno)) continue
      const aggA = andata.punti_casa! + ritorno.punti_ospite!
      const aggB = andata.punti_ospite! + ritorno.punti_casa!
      if (aggA === aggB) continue // pareggio nell'aggregato: nessun perdente determinabile
      out.push(String(aggA > aggB ? andata.ospite_id : andata.casa_id))
    }
  }
  return out
}

export { numTurniEliminazione }
