// Preferenze del giocatore (Fase C, estesa a tutti gli sport in Tappa 96):
// domande dirette (non un questionario a punteggio come
// livelloGioco/domande.ts), divise per sport — ogni sport ha domande
// indipendenti (richiesto esplicitamente dalla specifica originale del
// socio per padel/calcio, generalizzato agli sport aggiunti in Tappa 94).

import { SPORT_LIST, type Sport } from '@/features/prenotazioni/tipi'
import { ETICHETTE_SPORT } from '@/lib/formato'

export type { Sport }
export { SPORT_LIST }
export type Orario = 'mattina' | 'pomeriggio' | 'sera' | 'qualsiasi'

export interface Preferenze {
  mano_piede_preferito: 'destra' | 'sinistra' | null
  posizione: string | null
  orario_preferito: Orario | null
  giorni_preferiti: string[]
}

export { ETICHETTE_SPORT }

// Solo il calcio si gioca coi piedi: per tutti gli altri sport (racchetta/
// palla a mano) ha senso chiedere la mano preferita.
export const ETICHETTA_ARTO: Record<Sport, string> = {
  padel: 'Mano preferita',
  pickleball: 'Mano preferita',
  tennis: 'Mano preferita',
  beachvolley: 'Mano preferita',
  basket: 'Mano preferita',
  calcio: 'Piede preferito',
}

// Posizione in campo: significativa solo per sport con ruoli distinti
// (squadra o lato fisso in doppio). Array vuoto = la domanda "Posizione in
// campo" non compare per quello sport (vedi QuestionarioPreferenze.tsx).
export const POSIZIONI: Record<Sport, { id: string; label: string }[]> = {
  padel: [
    { id: 'drive', label: 'Drive (destra)' },
    { id: 'reves', label: 'Revés (sinistra)' },
  ],
  pickleball: [
    { id: 'drive', label: 'Drive (destra)' },
    { id: 'reves', label: 'Revés (sinistra)' },
  ],
  tennis: [],
  calcio: [
    { id: 'portiere', label: 'Portiere' },
    { id: 'difensore', label: 'Difensore' },
    { id: 'centrocampista', label: 'Centrocampista' },
    { id: 'attaccante', label: 'Attaccante' },
  ],
  basket: [
    { id: 'playmaker', label: 'Playmaker' },
    { id: 'guardia', label: 'Guardia' },
    { id: 'ala', label: 'Ala' },
    { id: 'centro', label: 'Centro' },
  ],
  beachvolley: [
    { id: 'palleggiatore', label: 'Palleggiatore' },
    { id: 'schiacciatore', label: 'Schiacciatore' },
    { id: 'libero', label: 'Libero' },
  ],
}

export const ORARI: { id: Orario; label: string }[] = [
  { id: 'mattina', label: '8-12' },
  { id: 'pomeriggio', label: '13-17' },
  { id: 'sera', label: '18-22' },
  { id: 'qualsiasi', label: 'Qualsiasi' },
]

export const GIORNI: { id: string; label: string }[] = [
  { id: 'lun', label: 'LU' },
  { id: 'mar', label: 'MA' },
  { id: 'mer', label: 'ME' },
  { id: 'gio', label: 'GI' },
  { id: 'ven', label: 'VE' },
  { id: 'sab', label: 'SA' },
  { id: 'dom', label: 'DO' },
]

export function preferenzeImpostate(p: Preferenze | null): boolean {
  if (!p) return false
  return !!(p.mano_piede_preferito || p.posizione || p.orario_preferito || p.giorni_preferiti.length > 0)
}
