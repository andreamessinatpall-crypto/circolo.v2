import { createClient } from '@supabase/supabase-js'

// Le credenziali vivono in .env.local (fuori da Git).
// La chiave "anon" è pensata per stare nel frontend: la sicurezza vera
// la fanno le regole RLS sul database Supabase.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configurazione Supabase mancante: controlla VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env.local',
  )
}

// `fetch` di default non ha un timeout: su una rete lenta/instabile (es. fuori
// casa, dati mobili con poco segnale) una richiesta può restare "appesa"
// invece di fallire, e siccome sia le mutation che invalidano query sia le
// query stesse aspettano questa promise, tutta l'interfaccia sembra bloccata
// a tempo indeterminato. Con questo timeout la richiesta fallisce dopo 20s e
// l'errore risale normalmente (query.error / mutation.error) invece di
// restare in caricamento per sempre.
const TIMEOUT_FETCH_MS = 20000

function fetchConTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_FETCH_MS)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchConTimeout },
})
