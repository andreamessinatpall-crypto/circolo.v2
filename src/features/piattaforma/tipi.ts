export type RuoloCircolo = 'socio' | 'collaboratore' | 'gestore'

export interface Circolo {
  id: string
  slug: string
  nome: string
  logo_url: string | null
  colore_primario: string | null
  colore_secondario: string | null
  apertura_default: string
  chiusura_default: string
  attivo: boolean
  creato_il: string
}

export interface MembroCircolo {
  id: string
  socio_id: string
  circolo_id: string
  ruolo: RuoloCircolo
  puo_dare_lezioni: boolean
  creato_il: string
  socio: { nome: string; cognome: string; email: string | null } | null
}

export interface SocioTrovato {
  id: string
  nome: string
  cognome: string
  email: string | null
}
