import type { Sport } from '@/features/prenotazioni/tipi'

export type StatoTorneoAmici = 'creazione' | 'in_corso' | 'concluso'
export type FormatoTorneoAmici = 'girone' | 'eliminazione'
export type StatoInvitoAmici = 'in_attesa' | 'accettata' | 'rifiutata'

export interface TorneoAmici {
  id: string
  creatore_id: string
  nome: string
  sport: Sport
  formato: FormatoTorneoAmici
  stato: StatoTorneoAmici
  bracket_seed: (string | null)[] | null
  andata_ritorno: boolean
  finale_secca: boolean
  terzo_posto: boolean
  creato_il: string
}

export interface PartecipanteTorneoAmici {
  id: number
  torneo_amici_id: string
  socio_id: string
  stato_invito: StatoInvitoAmici
  squadra_id: string | null
  invitato_il: string
}

export interface SquadraAmici {
  id: string
  torneo_amici_id: string
  nome: string | null
}

export interface SetPunteggioAmici {
  casa: number
  ospite: number
}

export interface IncontroAmici {
  id: string
  torneo_amici_id: string
  round: number
  girone: number | null
  casa_id: string
  ospite_id: string
  punti_casa: number | null
  punti_ospite: number | null
  set_punteggi: SetPunteggioAmici[] | null
  data_disputata: string | null
  inserito_da: string | null
  creato_il: string
}
