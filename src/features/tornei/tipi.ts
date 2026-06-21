export type StatoTorneo = 'bozza' | 'in_corso' | 'concluso'

// (Fase 7b) Una terna di punti: iscrizione, partita vinta, vittoria torneo.
// Sono i punti "base" del torneo; con più gironi ogni girone può avere la sua.
export interface PuntiSet {
  iscrizione: number
  vittoria: number
  torneo: number
}

export interface Torneo {
  id: number | string
  nome: string
  sport: 'padel' | 'calcio'
  formato: string
  stato: StatoTorneo
  data_inizio: string | null
  data_fine: string | null
  creato_il: string | null
  punti_iscrizione: number | null
  punti_vittoria: number | null
  punti_torneo: number | null
  // (Fase 6c) gironi: quanti gironi e i loro nomi personalizzati.
  // nomi_gironi è un oggetto JSON tipo { "1": "Girone Rosso", ... }.
  numero_gironi: number | null
  nomi_gironi: Record<string, string> | null
  // (Fase 7b) Punti diversi per ciascun girone (solo se più di un girone).
  // JSON tipo { "1": {iscrizione, vittoria, torneo}, "2": {...} }. Quando manca
  // un girone si usano i punti base (le tre colonne qui sopra).
  punti_gironi: Record<string, PuntiSet> | null
}

export interface Squadra {
  id: number | string
  torneo_id: number | string
  nome: string
  logo_url: string | null
  girone: number | null
}

export interface Componente {
  id: number | string
  squadra_id: number | string
  torneo_id: number | string
  socio_id: string
  riserva: boolean | null
}

// (Fase 6c) Un incontro del girone fra due squadre/coppie.
// punti_casa/punti_ospite sono null finché il risultato non è inserito (Fase 6d).
export interface Incontro {
  id: number | string
  torneo_id: number | string
  round: number
  casa_id: number | string
  ospite_id: number | string
  girone: number | null
  punti_casa: number | null
  punti_ospite: number | null
  // (Fase 6d) risultato. Nel padel punti_casa/punti_ospite sono i SET vinti e
  // set_punteggi conserva i game di ogni set (es. [{casa:6,ospite:4}, …]).
  // data_disputata è il giorno in cui la partita è stata giocata (facoltativo).
  set_punteggi?: SetPunteggio[] | null
  data_disputata?: string | null
}

// Un set di padel: i game vinti dalla coppia di casa e da quella ospite.
export interface SetPunteggio {
  casa: number
  ospite: number
}

// Una riga della classifica all'italiana (calcolata, non salvata nel database).
export interface RigaClassifica {
  id: number | string
  nome: string
  g: number // partite giocate
  v: number // vinte
  n: number // pareggi (solo calcio)
  p: number // perse
  gf: number // gol/punti fatti
  gs: number // gol/punti subiti
  diff: number // differenza reti/punti
  pti: number // punti in classifica
}

export const STATI_TORNEO: Record<StatoTorneo, string> = {
  bozza: 'Bozza',
  in_corso: 'In corso',
  concluso: 'Concluso',
}

export const FORMATI_TORNEO: Record<string, string> = {
  girone: "Girone all'italiana",
}

export const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }
