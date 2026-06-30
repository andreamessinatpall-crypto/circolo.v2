// Tipi dell'autenticazione.
// NOTA: questa descrizione del socio è provvisoria, scritta a mano.
// In seguito la sostituiremo con i tipi generati dal database
// (npx supabase gen types) per averli sempre allineati allo schema reale.

export type SportPreferito = 'padel' | 'calcio' | 'entrambi'

export interface Socio {
  id: string
  nome: string
  cognome: string
  email: string | null
  telefono: string | null
  data_nascita: string | null
  genere: string | null
  sport_preferito: SportPreferito
  attivo: boolean
  is_admin: boolean
  is_allenatore: boolean | null
  e_allenatore: boolean | null
  data_iscrizione: string | null
  badge_profilo: string | null
  mostra_in_classifica: boolean | null
  punti: number | null
}
