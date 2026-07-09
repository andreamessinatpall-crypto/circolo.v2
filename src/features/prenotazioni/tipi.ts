export type Sport = 'padel' | 'calcio'

export interface Campo {
  id: number | string
  sport: Sport
  nome: string
  ordine: number | null
  apertura: string | null
  chiusura: string | null
  in_servizio: boolean | null
  nota_servizio: string | null
  outdoor: boolean | null
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

export interface Impostazioni {
  giorniAnticipo: number
  maxPadel: number
  maxCalcio: number
}
