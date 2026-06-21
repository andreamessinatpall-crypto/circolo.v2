import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti } from '@/auth/ruoli'
import type { Socio } from '@/auth/tipi'
import Medaglia from '@/features/profilo/badge/Medaglia'
import { leggiCodiceBadge } from '@/features/profilo/badge/badgeDati'
import { useRealtimeCircolo } from '@/hooks/useRealtimeCircolo'

interface Voce {
  path: string
  label: string
}

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
  useRealtimeCircolo()
  if (!profilo) return null

  const collaboratore = !!profilo.is_allenatore && !profilo.is_admin
  const voci = vociMenu(profilo)
  const avatar = leggiCodiceBadge(profilo.badge_profilo)

  return (
    <div className="min-h-screen">
      {/* Barra superiore con marchio, tab e utente */}
      <header className="app-header">
        <div className="brand">
          Circolo Sportivo
          <small>Padel &amp; Calcio</small>
        </div>

        <nav className="header-tabs">
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

        <div className="header-utente flex items-center gap-2 text-sm">
          {avatar && <Medaglia sport={avatar.sport} liv={avatar.liv} size={34} />}
          <span className="hidden font-semibold md:inline">
            {profilo.nome} {profilo.cognome}
          </span>
          {profilo.is_admin && <span className="tag text-ottone-300">Admin</span>}
          {collaboratore && (
            <span className="tag" style={{ color: '#F3C969' }}>
              Collaboratore
            </span>
          )}
          <button
            type="button"
            onClick={() => esci()}
            className="ml-1 rounded-lg border border-white/25 px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white/80 transition hover:border-white/45 hover:bg-white/10"
          >
            Esci
          </button>
        </div>
      </header>

      {/* Contenuto */}
      <main className="mx-auto max-w-[900px] px-5 pb-20 pt-4">
        <Outlet />
      </main>
    </div>
  )
}
