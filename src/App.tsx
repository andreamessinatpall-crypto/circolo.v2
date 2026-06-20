import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function App() {
  const [statoConnessione, setStatoConnessione] = useState<
    'verifica' | 'ok' | 'errore'
  >('verifica')

  // Verifica all'avvio che il collegamento a Supabase funzioni.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(() => setStatoConnessione('ok'))
      .catch(() => setStatoConnessione('errore'))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <header>
        <h1 className="font-display uppercase tracking-wider text-4xl text-verde-800">
          Circolo Sportivo
        </h1>
        <p className="font-display uppercase tracking-[0.32em] text-xs text-ottone-500 mt-1">
          Padel &amp; Calcio · v2
        </p>
      </header>

      <div className="rounded-xl border border-verde-700/15 bg-superficie px-6 py-4 shadow-sm">
        <p className="text-sm text-ink-2">Collegamento a Supabase</p>
        <p className="mt-1 font-semibold">
          {statoConnessione === 'verifica' && '⏳ Verifica in corso…'}
          {statoConnessione === 'ok' && '✅ Connesso'}
          {statoConnessione === 'errore' && '❌ Errore di connessione'}
        </p>
      </div>

      <p className="text-sm text-ink-3 max-w-md">
        Fondamenta pronte (Fase 0). Prossimo passo: autenticazione (Fase 1).
      </p>
    </div>
  )
}

export default App
