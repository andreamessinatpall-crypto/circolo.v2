import { useAuth } from '@/auth/useAuth'

// Guscio dell'app per il socio attivo.
// Per ora è minimale (header + benvenuto): le tab e i contenuti
// arriveranno nella Fase 2 (guscio e navigazione).
export default function AppShell() {
  const { profilo, esci } = useAuth()
  if (!profilo) return null

  const collaboratore = !!profilo.is_allenatore && !profilo.is_admin

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b-2 border-ottone-500 bg-verde-800 px-6 text-white">
        <div className="font-display text-xl font-bold uppercase tracking-[0.12em]">
          Circolo Sportivo
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">
            {profilo.nome} {profilo.cognome}
          </span>
          {profilo.is_admin && (
            <span className="rounded bg-ottone-500/20 px-2 py-0.5 text-xs font-semibold text-ottone-300">
              Admin
            </span>
          )}
          {collaboratore && (
            <span className="rounded bg-ottone-500/20 px-2 py-0.5 text-xs font-semibold text-ottone-300">
              Collaboratore
            </span>
          )}
          <button
            type="button"
            onClick={() => esci()}
            className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold transition hover:bg-white/10"
          >
            Esci
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        <h1 className="font-display text-3xl uppercase tracking-wide text-verde-800">
          Benvenuto, {profilo.nome}
        </h1>
        <p className="mt-2 text-ink-2">
          Autenticazione completata (Fase 1). Le sezioni (profilo, prenotazioni,
          tornei…) arriveranno nelle prossime fasi.
        </p>
      </main>
    </div>
  )
}
