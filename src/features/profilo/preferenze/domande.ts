// Preferenze del giocatore (Fase C): domande dirette (non un questionario a
// punteggio come livelloGioco/domande.ts), divise per sport — padel e calcio
// hanno domande indipendenti, richiesto esplicitamente dalla specifica
// originale del socio.

export type Sport = 'padel' | 'calcio'
export type Orario = 'mattina' | 'pomeriggio' | 'sera' | 'qualsiasi'

export interface Preferenze {
  mano_piede_preferito: 'destra' | 'sinistra' | null
  posizione: string | null
  orario_preferito: Orario | null
  giorni_preferiti: string[]
}

export const ETICHETTE_SPORT: Record<Sport, string> = {
  padel: 'Padel',
  calcio: 'Calcio',
}

export const ETICHETTA_ARTO: Record<Sport, string> = {
  padel: 'Mano preferita',
  calcio: 'Piede preferito',
}

export const POSIZIONI: Record<Sport, { id: string; label: string }[]> = {
  padel: [
    { id: 'drive', label: 'Drive (destra)' },
    { id: 'reves', label: 'Revés (sinistra)' },
  ],
  calcio: [
    { id: 'portiere', label: 'Portiere' },
    { id: 'difensore', label: 'Difensore' },
    { id: 'centrocampista', label: 'Centrocampista' },
    { id: 'attaccante', label: 'Attaccante' },
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
