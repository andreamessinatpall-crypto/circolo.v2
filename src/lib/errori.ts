// Riconosce gli errori "questa cosa non esiste ancora nel database", così
// possiamo mostrare all'utente quale script SQL eseguire invece di un errore
// tecnico. Riprende gli helper della v1 (mancaTabella, mancaBadge).

type ErroreDb = { code?: string; message?: string } | null | undefined

// La tabella non è ancora stata creata su Supabase.
export function mancaTabella(error: unknown, nome: string): boolean {
  const e = error as ErroreDb
  if (!e) return false
  if (e.code === '42P01' || e.code === 'PGRST205') return true
  const m = (e.message ?? '').toLowerCase()
  return (
    m.includes(nome.toLowerCase()) &&
    (m.includes('does not exist') ||
      m.includes('could not find') ||
      m.includes('schema cache'))
  )
}

// La funzione (RPC) non è ancora stata creata su Supabase.
export function mancaRpc(error: unknown): boolean {
  const e = error as ErroreDb
  if (!e) return false
  return e.code === 'PGRST202' || e.code === '42883'
}

// Codice errore di violazione "unicità" (es. amicizia/richiesta già esistente).
export function eDuplicato(error: unknown): boolean {
  const e = error as ErroreDb
  return !!e && e.code === '23505'
}

export function messaggioErrore(error: unknown): string {
  const e = error as ErroreDb
  return (e && e.message) || 'Errore sconosciuto'
}
