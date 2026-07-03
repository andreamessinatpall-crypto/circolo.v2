import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { puoGestirePrenotazioni } from '@/auth/ruoli'
import type { Socio } from '@/auth/tipi'
import { useRealtimeCircolo } from '@/hooks/useRealtimeCircolo'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import FooterLegale from '@/components/legale/FooterLegale'

interface Voce {
  path: string
  label: string
}

function vociMenu(p: Socio, premiVisibile: boolean): Voce[] {
  if (p.is_admin) {
    return [
      { path: '/prenotazioni', label: 'Prenotazioni' },
      { path: '/statistiche', label: 'Statistiche' },
      { path: '/soci', label: 'Giocatori' },
      { path: '/tornei', label: 'Tornei' },
    ]
  }

  const collaboratore = !!p.is_allenatore && !p.is_admin
  const istruttore    = !!p.e_allenatore && !p.is_allenatore && !p.is_admin

  if (collaboratore) {
    return [
      { path: '/prenotazioni', label: 'Prenotazioni' },
      { path: '/tornei', label: 'Tornei' },
      { path: '/premi', label: 'Premi' },
      { path: '/profilo', label: 'Profilo' },
    ]
  }

  if (istruttore) {
    return [
      { path: '/prenota', label: 'Prenota' },
      { path: '/soci', label: 'Giocatori' },
      { path: '/tornei', label: 'Tornei' },
      { path: '/profilo', label: 'Profilo' },
    ]
  }

  // Giocatore regolare
  const voci: Voce[] = [
    { path: '/prenota', label: 'Prenota' },
    { path: '/profilo', label: 'Profilo' },
    { path: '/tornei', label: 'Tornei' },
  ]
  if (premiVisibile) voci.push({ path: '/premi', label: 'Premi' })
  return voci
}

export default function AppShell() {
  const { profilo, esci } = useAuth()
  useRealtimeCircolo()
  const { data: modalitaPremi } = useModalitaPremi()
  if (!profilo) return null

  const voci = vociMenu(profilo, !!modalitaPremi)

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Barra superiore: marchio e utente */}
      <header className="app-header">
        <div className="brand">
          Circolo Sportivo
          <small>Padel &amp; Calcio</small>
        </div>

        <div className="header-utente flex items-center gap-1.5 text-sm">
          {/* Icona profilo */}
          <NavLink
            to="/profilo?sezione=dati"
            title="Il mio profilo"
            className={({ isActive }) =>
              'flex items-center rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white' +
              (isActive ? ' bg-white/10 text-white' : '')
            }
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="10" r="3"/>
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
            </svg>
          </NavLink>
          {puoGestirePrenotazioni(profilo) && !profilo.is_admin && (
            <NavLink
              to="/statistiche"
              title="Statistiche"
              className={({ isActive }) =>
                'flex items-center rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white' +
                (isActive ? ' bg-white/10 text-white' : '')
              }
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
                <line x1="2" y1="20" x2="22" y2="20" />
              </svg>
            </NavLink>
          )}
          {profilo.is_admin && (
            <NavLink
              to="/impostazioni"
              title="Impostazioni"
              className={({ isActive }) =>
                'flex items-center rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white' +
                (isActive ? ' bg-white/10 text-white' : '')
              }
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </NavLink>
          )}
          {/* Esci: icona su mobile, testo da sm in su */}
          <button
            type="button"
            onClick={() => esci()}
            title="Esci"
            className="ml-0.5 flex items-center gap-1.5 rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white sm:px-3 sm:py-1.5"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden font-display text-xs font-semibold uppercase tracking-[0.08em] sm:inline">Esci</span>
          </button>
        </div>
      </header>

      {/* Sotto-header: tab di navigazione */}
      <div className="app-subnav">
        <nav className="header-tabs" aria-label="Navigazione principale">
          {voci.map((v) => (
            <NavLink
              key={v.path}
              to={v.path}
              className={({ isActive }) => 'header-tab' + (isActive ? ' attivo' : '')}
            >
              {v.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Contenuto */}
      <main className="mx-auto w-full max-w-[900px] px-5 pb-10 pt-4">
        <Outlet />
      </main>

      <FooterLegale />
    </div>
  )
}
