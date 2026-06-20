import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Socio } from './tipi'

// I quattro stati possibili dell'utente (ripresi dalla logica della v1):
//  - caricamento: stiamo ancora controllando se c'è una sessione
//  - anonimo:     nessuno ha effettuato l'accesso → mostra login/registrazione
//  - bloccato:    loggato ma non può entrare (non associato o in attesa) → mostra messaggio
//  - attivo:      socio approvato → mostra l'app
export type StatoAuth = 'caricamento' | 'anonimo' | 'bloccato' | 'attivo'

export interface MessaggioBlocco {
  titolo: string
  testo: string
}

export interface AuthContextValue {
  stato: StatoAuth
  utente: User | null
  profilo: Socio | null
  blocco: MessaggioBlocco | null
  ricaricaProfilo: () => Promise<void>
  esci: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
