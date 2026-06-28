// Logica del formato Americano (solo padel).
//
// Ogni "squadra" è un singolo giocatore. In ogni round, i giocatori vengono
// abbinati a coppie dinamiche usando il circle-method (1-factorization di K_n):
// si fissa il giocatore 0, si ruotano gli altri di 1 a destra a ogni round.
// Le coppie si formano abbinando posizione i con posizione n-1-i.
// Poi ogni 2 coppie adiacenti formano un incontro su un campo.
//
// Proprietà garantita: ogni giocatore fa coppia con ogni altro esattamente una volta
// (per N multiplo di 4, con N-1 rounds e N/4 campi per round).

import type { AmericanoPartita, Squadra } from './tipi'

export interface RigaClassificaAmericano {
  id: number | string
  nome: string
  g: number   // partite giocate
  v: number   // vinte
  p: number   // perse
  pf: number  // punti (game) fatti
  ps: number  // punti (game) subiti
  diff: number
  pti: number // punti individuali totali accumulati
}

// Genera tutti i round dell'Americano per i giocatori dati.
// N deve essere multiplo di 4; giocatori in eccesso vengono ignorati.
// Con andataRitorno=true genera il doppio dei round (ritorno con lati invertiti).
// Restituisce: array di round, ogni round ha N/4 campi.
export function generaRoundsAmericano(
  playerIds: (number | string)[],
  andataRitorno = false,
): {
  round: number
  campo: number
  p1: number | string
  p2: number | string
  p3: number | string
  p4: number | string
}[][] {
  const nValido = Math.floor(playerIds.length / 4) * 4
  if (nValido < 4) return []

  const ids = playerIds.slice(0, nValido)
  const fixed = ids[0]
  const rotating = ids.slice(1) // lunghezza = nValido - 1
  const numRounds = nValido - 1

  const result: ReturnType<typeof generaRoundsAmericano> = []

  for (let r = 0; r < numRounds; r++) {
    // Rotazione a destra di r: gli ultimi r elementi vanno davanti
    const rot =
      r === 0
        ? [...rotating]
        : [...rotating.slice(rotating.length - r), ...rotating.slice(0, rotating.length - r)]
    const arr = [fixed, ...rot]

    // Accoppia: posizione i con posizione nValido-1-i
    const pairs: [number | string, number | string][] = []
    for (let i = 0; i < nValido / 2; i++) {
      pairs.push([arr[i], arr[nValido - 1 - i]])
    }

    // Ogni 2 coppie consecutive formano un campo
    const courts: (typeof result)[number] = []
    for (let c = 0; c < pairs.length; c += 2) {
      courts.push({
        round: r + 1,
        campo: c / 2 + 1,
        p1: pairs[c][0],
        p2: pairs[c][1],
        p3: pairs[c + 1][0],
        p4: pairs[c + 1][1],
      })
    }
    result.push(courts)
  }

  if (!andataRitorno) return result

  // Ritorno: stessa struttura ma p1/p2 scambiati con p3/p4, round offset di numRounds.
  const ritorno = result.map((courts, r) =>
    courts.map((c) => ({
      round: numRounds + r + 1,
      campo: c.campo,
      p1: c.p3,
      p2: c.p4,
      p3: c.p1,
      p4: c.p2,
    })),
  )
  return [...result, ...ritorno]
}

// Calcola la classifica individuale: ogni giocatore somma i propri game-point.
export function calcolaClassificaAmericano(
  squadre: Squadra[],
  partite: AmericanoPartita[],
): RigaClassificaAmericano[] {
  const tab: Record<string, RigaClassificaAmericano> = {}
  for (const s of squadre) {
    tab[String(s.id)] = { id: s.id, nome: s.nome, g: 0, v: 0, p: 0, pf: 0, ps: 0, diff: 0, pti: 0 }
  }

  for (const m of partite) {
    if (m.punti_casa == null || m.punti_ospite == null) continue
    const casaIds = [String(m.p1_id), String(m.p2_id)]
    const ospiteIds = [String(m.p3_id), String(m.p4_id)]
    for (const id of casaIds) {
      const r = tab[id]
      if (!r) continue
      r.g++
      r.pf += m.punti_casa
      r.ps += m.punti_ospite
      r.pti += m.punti_casa
      if (m.punti_casa > m.punti_ospite) r.v++
      else if (m.punti_casa < m.punti_ospite) r.p++
    }
    for (const id of ospiteIds) {
      const r = tab[id]
      if (!r) continue
      r.g++
      r.pf += m.punti_ospite
      r.ps += m.punti_casa
      r.pti += m.punti_ospite
      if (m.punti_ospite > m.punti_casa) r.v++
      else if (m.punti_ospite < m.punti_casa) r.p++
    }
  }

  const arr = Object.values(tab)
  for (const r of arr) r.diff = r.pf - r.ps
  arr.sort(
    (a, b) =>
      b.pti - a.pti || b.diff - a.diff || b.pf - a.pf || a.nome.localeCompare(b.nome, 'it'),
  )
  return arr
}

// Formatta un nome per la visualizzazione nei turni: "Cognome I."
// "Mario Rossi" → "Rossi M.", "Rossi" → "Rossi"
export function formatNomeAmericano(nomeCompleto: string): string {
  const parti = nomeCompleto.trim().split(/\s+/)
  if (parti.length <= 1) return nomeCompleto
  const cognome = parti[parti.length - 1]
  const iniziale = parti[0][0]?.toUpperCase() ?? ''
  return iniziale ? cognome + ' ' + iniziale + '.' : cognome
}

// Una partita americana è disputata quando ha entrambi i punteggi.
export function americanoDisputata(
  m: Pick<AmericanoPartita, 'punti_casa' | 'punti_ospite'>,
): boolean {
  return m.punti_casa != null && m.punti_ospite != null
}

// Raggruppa le partite per round, in ordine crescente.
export function perRoundAmericano(
  partite: AmericanoPartita[],
): { round: number; partite: AmericanoPartita[] }[] {
  const map: Record<number, AmericanoPartita[]> = {}
  for (const m of partite) (map[m.round] ??= []).push(m)
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((round) => ({ round, partite: map[round].sort((a, b) => a.campo - b.campo) }))
}
