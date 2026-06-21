// (Fase 6d) Logica del calendario all'italiana (round-robin) e dei risultati.
// Funzioni pure portate dalla v1 (generaTurni col "circle method", setVinti,
// formattaSet, ...) così sono facili da riusare e da testare.

import type { Incontro, SetPunteggio } from './tipi'

// Una partita è "disputata" quando ha entrambi i punteggi inseriti.
export function incontroDisputato(m: Pick<Incontro, 'punti_casa' | 'punti_ospite'>): boolean {
  return m.punti_casa != null && m.punti_ospite != null
}

// Metodo del girone ("circle method"): produce gli accoppiamenti di ogni turno
// (giornata) facendo ruotare le squadre attorno a una fissa. Con numero dispari
// si aggiunge un "null" (la squadra accoppiata a null riposa quel turno).
// Restituisce un array di turni; ogni turno è un array di coppie [casa, ospite].
export function generaTurni<T>(ids: T[]): [T, T][][] {
  const teams: (T | null)[] = ids.slice()
  if (teams.length % 2 === 1) teams.push(null)
  const n = teams.length
  const arr = teams.slice()
  const turni: [T, T][][] = []
  for (let r = 0; r < n - 1; r++) {
    const round: [T, T][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      // Salto le coppie che includono il "riposo" (null).
      if (a !== null && b !== null) {
        // Alterno casa/ospite a turni alterni, così l'andata è più equilibrata.
        round.push(r % 2 === 0 ? [a, b] : [b, a])
      }
    }
    turni.push(round)
    // Ruoto: la prima resta ferma, le altre scorrono di una posizione.
    const fixed = arr[0]
    const rest = arr.slice(1)
    rest.unshift(rest.pop() as T | null)
    arr.splice(0, arr.length, fixed, ...rest)
  }
  return turni
}

// Raggruppa gli incontri per giornata (round), ordinati dal 1º in poi.
export function perGiornata(incontri: Incontro[]): { round: number; partite: Incontro[] }[] {
  const map: Record<number, Incontro[]> = {}
  for (const m of incontri) (map[m.round] ??= []).push(m)
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((round) => ({ round, partite: map[round] }))
}

// Padel: quanti set ha vinto la coppia di casa e quella ospite.
export function setVinti(sets: SetPunteggio[]): { casa: number; ospite: number } {
  let casa = 0
  let ospite = 0
  for (const s of sets) {
    if (s.casa > s.ospite) casa++
    else if (s.ospite > s.casa) ospite++
  }
  return { casa, ospite }
}

// Riassunto leggibile dei set, es. "6-4  3-6  7-5".
export function formattaSet(sets: SetPunteggio[]): string {
  return sets.map((s) => s.casa + '-' + s.ospite).join('  ')
}

// Messaggio chiaro se mancano colonne del risultato (script SQL non eseguito).
export function mancaColonnaRisultato(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  const msg = (e.message ?? '').toLowerCase()
  return e.code === 'PGRST204' || msg.includes('set_punteggi') || msg.includes('data_disputata')
}

export const SCRIPT_INCONTRI =
  'Esegui lo script tappa3b2-girone.sql su Supabase per attivare il calendario del girone.'

export const SCRIPT_RISULTATO =
  'Mancano colonne nella tabella incontri (set_punteggi o data_disputata): esegui i relativi script SQL su Supabase.'
