import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti } from '@/auth/ruoli'
import type { Socio } from '@/auth/tipi'

interface Voce {
  path: string
  label: string
}

// Le tab visibili dipendono dal ruolo e dallo sport preferito (come nella v1):
//  - admin: vede la Segreteria (più Tornei e Premi); le tab personali sono nascoste.
//  - socio: Profilo, lo/gli sport preferiti, Tornei e Premi.
function vociMenu(p: Socio): Voce[] {
  if (p.is_admin) {
    return [
      { path: '/segreteria', label: 'Segreteria' },
      { path: '/tornei', label: 'Tornei' },
      { path: '/premi', label: 'Premi' },
    ]
  }
  const sport = sportConsentiti(p)
  const voci: Voce[] = [{ path: '/profilo', label: 'Profilo' }]
  if (sport.includes('padel')) voci.push({ path: '/padel', label: 'Padel' })
  if (sport.includes('calcio')) voci.push({ path: '/calcio', label: 'Calcio' })
  voci.push({ path: '/tornei', label: 'Tornei' })
  voci.push({ path: '/premi', label: 'Premi' })
  return voci
}

export default function AppShell() {
  const { profilo, esci } = useAuth()
  if (!profilo) return null

  const collaboratore = !!profilo.is_allenatore && !profilo.is_admin
  const voci = vociMenu(profilo)

  return (
    <div className="min-h-screen">
      {/* Barra superiore: marchio, nome utente, ruolo, logout */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b-2 border-ottone-500 bg-verde-800 px-6 text-white">
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

      {/* Barra delle tab */}
      <nav className="sticky top-16 z-10 flex gap-1 overflow-x-auto border-b border-verde-700/10 bg-superficie px-4">
        {voci.map((v) => (
          <NavLink
            key={v.path}
            to={v.path}
            className={({ isActive }) =>
              'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition ' +
              (isActive
                ? 'border-ottone-500 text-verde-800'
                : 'border-transparent text-ink-3 hover:text-verde-700')
            }
          >
            {v.label}
          </NavLink>
        ))}
      </nav>

      {/* Contenuto della sezione attiva */}
      <main className="mx-auto max-w-4xl p-6">
        <Outlet />
      </main>
    </div>
  )
}
