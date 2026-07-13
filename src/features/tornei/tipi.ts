export type StatoTorneo = 'bozza' | 'in_programma' | 'in_corso' | 'concluso'

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
  durata_minuti: number | null
  max_squadre: number | null
  // (Tappa 27) Slot unico per tornei Americano: campo + inizio + fine.
  americano_campo_id: number | string | null
  // (Tappa 42) Array di campi usati contemporaneamente nell'americano.
  americano_campi_ids: number[] | null
  americano_inizio: string | null
  americano_fine: string | null
  // (Tappa 28) Punti per posizione in classifica (solo americano).
  // JSON: { "1": 10, "2": 6, "3": 3 }
  punti_posizioni: Record<string, number> | null
  // (Tappa 24) Seed del bracket per eliminazione diretta: array di squadra_id|null
  // di lunghezza = prossima potenza di 2 rispetto alle squadre. null = bye.
  bracket_seed: (number | string | null)[] | null
  // (Tappa 31) Modalità andata e ritorno: ogni accoppiamento si gioca due volte.
  andata_ritorno: boolean | null
  // (Tappa 31) Solo eliminazione: finale in gara secca anche con andata_ritorno.
  finale_secca: boolean | null
  // (Tappa 31) Solo eliminazione: aggiunge la partita per il 3°/4° posto.
  terzo_posto: boolean | null
  // (Fase 6bis) Solo americano: "normale" o "misto" (coppie sempre uomo-donna).
  modalita_americano: 'normale' | 'misto' | null
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
  socio_id: string | null
  riserva: boolean | null
  // (Tappa 10) Nome di un giocatore NON registrato, inserito a mano
  // dall'organizzatore. Quando è valorizzato, socio_id è null e il giocatore
  // non guadagna punti né crediti.
  nome_manuale?: string | null
  // (Fase 6bis) Genere per questo torneo (serve all'Americano Misto). Se
  // null e il componente è un socio registrato, si usa il genere del suo
  // profilo; per gli ospiti resta null finché non lo si imposta qui.
  genere?: string | null
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
  in_programma: 'In programma',
  in_corso: 'In corso',
  concluso: 'Concluso',
}

export interface RichiestaIscrizione {
  id: number | string
  torneo_id: number | string
  richiedente_id: string
  componenti: string[]
  creata_il: string
}

export const FORMATI_TORNEO: Record<string, string> = {
  girone: "Girone all'italiana",
  eliminazione: 'Eliminazione diretta',
  americano: 'Americano',
}

// Partita del formato Americano: 4 giocatori individuali (2 coppie dinamiche per round).
// p1+p2 (lato "casa") vs p3+p4 (lato "ospite"). I giocatori sono record di squadre
// con un solo componente ciascuno.
export interface AmericanoPartita {
  id: number | string
  torneo_id: number | string
  round: number
  campo: number
  p1_id: number | string
  p2_id: number | string
  p3_id: number | string
  p4_id: number | string
  punti_casa: number | null
  punti_ospite: number | null
  data_disputata?: string | null
}

export const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

// Un torneo "in programma" smette di comparire nelle anteprime/liste una
// volta superata la data di inizio (anche se lo stato non è ancora stato
// aggiornato manualmente a "in_corso"/"concluso"). Senza data_inizio resta
// sempre visibile. `oggi` è "YYYY-MM-DD" locale (stesso formato di
// data_inizio), confrontabile lessicograficamente.
export function torneoInProgrammaAttivo(t: Torneo, oggi: string): boolean {
  return t.stato === 'in_programma' && (!t.data_inizio || t.data_inizio >= oggi)
}
