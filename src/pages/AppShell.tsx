import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { puoGestirePrenotazioni } from '@/auth/ruoli'
import type { Socio } from '@/auth/tipi'
import Medaglia from '@/features/profilo/badge/Medaglia'
import { leggiCodiceBadge } from '@/features/profilo/badge/badgeDati'
import { useRealtimeCircolo } from '@/hooks/useRealtimeCircolo'
import { useModalitaPremi } from '@/features/premi/datiPremi'

interface Voce {
  path: string
  label: string
}

// premiVisibile: il socio vede la tab Premi solo a "modalità premi" accesa;
// l'admin la vede sempre (la gestione lato segreteria arriva in Fase 8).
function vociMenu(p: Socio, premiVisibile: boolean): Voce[] {
  if (p.is_admin) {
    return [
      { path: '/prenotazioni', label: 'Prenotazioni' },
      { path: '/soci', label: 'Giocatori' },
      { path: '/tornei', label: 'Tornei' },
      { path: '/statistiche', label: 'Statistiche' },
    ]
  }
  const voci: Voce[] = [{ path: '/profilo', label: 'Profilo' }]
  if (puoGestirePrenotazioni(p)) {
    voci.push({ path: '/prenotazioni', label: 'Prenotazioni' })
    voci.push({ path: '/statistiche', label: 'Statistiche' })
  } else {
    voci.push({ path: '/prenota', label: 'Prenota' })
  }
  voci.push({ path: '/tornei', label: 'Tornei' })
  if (premiVisibile) voci.push({ path: '/premi', label: 'Premi' })
  return voci
}

export default function AppShell() {
  const { profilo, esci } = useAuth()
  useRealtimeCircolo()
  const { data: modalitaPremi } = useModalitaPremi()
  if (!profilo) return null

  const collaboratore = !!profilo.is_allenatore && !profilo.is_admin
  // Collaboratore ha grado più alto: chi è entrambi mostra solo "Collaboratore".
  const istruttore = !!profilo.e_allenatore && !profilo.is_admin && !profilo.is_allenatore
  const voci = vociMenu(profilo, !!modalitaPremi)
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
          {avatar && <Medaglia variabile={avatar.variabile} sport={avatar.sport} soglia={avatar.soglia} size={34} />}
          <span className="hidden font-semibold md:inline">
            {profilo.nome} {profilo.cognome}
          </span>
          {profilo.is_admin && <span className="tag text-ottone-300">Admin</span>}
          {collaboratore && (
            <span className="tag" style={{ color: '#F3C969' }}>
              Collaboratore
            </span>
          )}
          {istruttore && (
            <span className="tag" style={{ color: 'var(--terra)' }}>
              Istruttore
            </span>
          )}
          {profilo.is_admin && (
            <NavLink
              to="/impostazioni"
              title="Impostazioni"
              className={({ isActive }) =>
                'flex items-center rounded-lg border border-white/25 p-1.5 text-white/70 transition hover:border-white/45 hover:bg-white/10 hover:text-white' +
                (isActive ? ' border-white/45 bg-white/10 text-white' : '')
              }
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </NavLink>
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
