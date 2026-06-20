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

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
