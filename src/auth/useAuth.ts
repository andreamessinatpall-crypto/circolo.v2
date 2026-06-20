import { useContext } from 'react'
import { AuthContext } from './contesto'

// Piccolo "gancio" per leggere lo stato di autenticazione da qualsiasi schermata:
//   const { profilo, stato, esci } = useAuth()
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve essere usato dentro <AuthProvider>')
  }
  return ctx
}
