export type StatoTorneo = 'bozza' | 'in_corso' | 'concluso'

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

export const STATI_TORNEO: Record<StatoTorneo, string> = {
  bozza: 'Bozza',
  in_corso: 'In corso',
  concluso: 'Concluso',
}

export const FORMATI_TORNEO: Record<string, string> = {
  girone: "Girone all'italiana",
}
