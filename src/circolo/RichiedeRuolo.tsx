import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMioRuolo } from './useMioRuolo'
import { useCircolo } from './useCircolo'

type Requisito = 'gestore' | 'staff' | 'puoDareLezioni'

// Guardia di accesso per una pagina che dipende dal ruolo nel circolo
// CORRENTE (non dai vecchi flag globali is_admin/is_allenatore su `soci`).
// Va usato come `element` di una <Route> nidificata sotto /c/:slug, mai in
// App.tsx direttamente: la Route lì viene decisa PRIMA che <CircoloProvider>
// risolva circolo/ruolo, quindi il controllo deve stare dentro l'elemento,
// non nella condizione che decide se dichiarare la Route.
export default function RichiedeRuolo({ richiede, children }: { richiede: Requisito; children: ReactNode }) {
  const { eGestore, puoGestire, puoDareLezioni } = useMioRuolo()
  const circolo = useCircolo()
  const ok = richiede === 'gestore' ? eGestore : richiede === 'staff' ? puoGestire : puoDareLezioni
  if (!ok) return <Navigate to={`/c/${circolo.slug}/prenota`} replace />
  return <>{children}</>
}
