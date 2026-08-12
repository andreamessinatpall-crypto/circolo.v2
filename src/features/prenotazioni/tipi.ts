export type Sport = 'padel' | 'calcio' | 'tennis' | 'pickleball' | 'beachvolley' | 'basket'

// Elenco fisso (non personalizzabile per circolo): aggiungere un nuovo
// sport significa estendere qui il tipo e questa lista, tutto il resto
// (regole, punti/crediti, campi) è già generico su questo elenco.
export const SPORT_LIST: Sport[] = ['padel', 'calcio', 'tennis', 'pickleball', 'beachvolley', 'basket']

// Formato del campo calcio (a5/a7): non è un altro sport, solo un dettaglio
// del campo. Le altre sezioni (icone, regole, punti) restano per 'calcio'.
export type FormatoCalcio = 'a5' | 'a7'

export interface Campo {
  id: number | string
  sport: Sport
  formato: FormatoCalcio | null
  nome: string
  ordine: number | null
  apertura: string | null
  chiusura: string | null
  in_servizio: boolean | null
  nota_servizio: string | null
  outdoor: boolean | null
  durata_minuti: number | null
}

// Riga restituita dalla RPC prenotazioni_giorno (include l'etichetta di chi prenota).
export interface PrenotazioneGiorno {
  id: number | string
  campo_id: number | string
  socio_id: string
  inizio: string
  fine: string
  etichetta: string | null
  incontro_id?: number | string | null
  allenamento?: boolean | null
  torneo_id?: string | null
  torneo_nome?: string | null
  giocatori_torneo?: string | null
}

export interface LimitiSport {
  maxAttive: number
  maxGiorno: number
}

export interface Impostazioni {
  giorniAnticipo: number
  limitiPerSport: Partial<Record<Sport, LimitiSport>>
}
