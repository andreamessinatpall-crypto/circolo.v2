import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { puoGestirePrenotazioni } from '@/auth/ruoli'
import type { Socio } from '@/auth/tipi'
import { useRealtimeCircolo } from '@/hooks/useRealtimeCircolo'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import FooterLegale from '@/components/legale/FooterLegale'
import InstallaAppBanner from '@/components/InstallaAppBanner'
import MenuUtente from '@/components/MenuUtente'

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
      { path: '/profilo', label: 'Area Club' },
    ]
  }

  if (istruttore) {
    return [
      { path: '/prenota', label: 'Prenota' },
      { path: '/soci', label: 'Giocatori' },
      { path: '/tornei', label: 'Tornei' },
      { path: '/profilo', label: 'Area Club' },
    ]
  }

  // Giocatore regolare
  const voci: Voce[] = [
    { path: '/prenota', label: 'Prenota' },
    { path: '/profilo', label: 'Area Club' },
    { path: '/tornei', label: 'Tornei' },
  ]
  if (premiVisibile) voci.push({ path: '/premi', label: 'Premi' })
  return voci
}

export default function AppShell() {
  const { profilo } = useAuth()
  const { pathname } = useLocation()
  useRealtimeCircolo()
  const { data: modalitaPremi } = useModalitaPremi()

  // Senza questo reset lo scroll residuo della pagina precedente (es. login
  // con tastiera aperta) resta e l'header sticky "in alto" parte già scrollato.
  // Su mobile la tastiera si chiude con un attimo di ritardo: il primo
  // scrollTo può arrivare troppo presto, quindi riproviamo anche quando il
  // visual viewport finisce di ridimensionarsi (fine chiusura tastiera).
  useEffect(() => {
    const reset = () => window.scrollTo(0, 0)
    reset()
    // Su iOS un rimbalzo elastico (overscroll) in corso sulla pagina precedente
    // può "restare congelato" a metà quando il DOM cambia: un solo scrollTo
    // non basta perché l'inerzia del bounce lo sovrascrive subito dopo.
    // Ripetiamo per i primi istanti finché l'inerzia si esaurisce.
    const timers = [50, 150, 300, 500].map((ms) => setTimeout(reset, ms))
    const vv = window.visualViewport
    if (vv) vv.addEventListener('resize', reset, { once: true })
    return () => {
      timers.forEach(clearTimeout)
      if (vv) vv.removeEventListener('resize', reset)
    }
  }, [pathname])

  if (!profilo) return null

  const voci = vociMenu(profilo, !!modalitaPremi)

  return (
    <div className="flex min-h-[100svh] flex-col">
      {/* Barra superiore: marchio e utente */}
      <header className="app-header">
        <div className="brand">
          Circolo Sportivo
          <small>Padel &amp; Calcio</small>
        </div>

        <div className="header-utente flex items-center gap-1.5 text-sm">
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
          <MenuUtente />
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

      <InstallaAppBanner />

      {/* Contenuto */}
      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-10 pt-4">
        <Outlet />
      </main>

      <FooterLegale />
    </div>
  )
}
