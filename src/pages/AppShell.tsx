import { useEffect } from 'react'
import type { ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import type { Socio } from '@/auth/tipi'
import { useRealtimeCircolo } from '@/hooks/useRealtimeCircolo'
import InstallaAppBanner from '@/components/InstallaAppBanner'
import MenuUtente from '@/components/MenuUtente'
import CampanellaNotifiche from '@/components/CampanellaNotifiche'
import {
  IconaPrenota,
  IconaGiocatori,
  IconaTornei,
  IconaAreaClub,
} from '@/components/IconeMenu'

interface Voce {
  path: string
  label: string
  Icona: ComponentType
}

// "Premi" non è più una voce di primo livello: vive come sotto-scheda
// dentro Area Club (ProfiloPage.tsx), accanto a Bacheca/Amici/Club.
function vociMenu(p: Socio): Voce[] {
  // Statistiche e Giocatori non sono più tab di primo livello per l'admin:
  // si raggiungono dalle schede dentro Area Club (vedi AreaClubSchede.tsx),
  // così restano solo qui invece che sparse anche nell'header/subnav.
  if (p.is_admin) {
    return [
      { path: '/prenotazioni', label: 'Prenotazioni', Icona: IconaPrenota },
      { path: '/profilo', label: 'Area Club', Icona: IconaAreaClub },
      { path: '/tornei', label: 'Tornei', Icona: IconaTornei },
    ]
  }

  const collaboratore = !!p.is_allenatore && !p.is_admin
  const istruttore    = !!p.e_allenatore && !p.is_allenatore && !p.is_admin

  if (collaboratore) {
    return [
      { path: '/prenotazioni', label: 'Prenotazioni', Icona: IconaPrenota },
      { path: '/profilo', label: 'Area Club', Icona: IconaAreaClub },
      { path: '/tornei', label: 'Tornei', Icona: IconaTornei },
    ]
  }

  if (istruttore) {
    return [
      { path: '/prenota', label: 'Prenota', Icona: IconaPrenota },
      { path: '/soci', label: 'Giocatori', Icona: IconaGiocatori },
      { path: '/profilo', label: 'Area Club', Icona: IconaAreaClub },
      { path: '/tornei', label: 'Tornei', Icona: IconaTornei },
    ]
  }

  // Giocatore regolare
  return [
    { path: '/prenota', label: 'Prenota', Icona: IconaPrenota },
    { path: '/profilo', label: 'Area Club', Icona: IconaAreaClub },
    { path: '/tornei', label: 'Tornei', Icona: IconaTornei },
  ]
}

export default function AppShell() {
  const { profilo } = useAuth()
  const { pathname } = useLocation()
  useRealtimeCircolo()

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

  const voci = vociMenu(profilo)

  // "Area Club" deve restare selezionata anche nelle pagine raggiunte dalle
  // sue schede che non vivono sotto /profilo (Giocatori → /soci, Statistiche
  // → /statistiche), altrimenti la tab tornava bianca entrandoci — NavLink
  // di suo la marca attiva solo per /profilo e le sue sotto-rotte. Esclusa
  // /soci per l'istruttore, che ha una tab "Giocatori" propria su quel
  // percorso: lì non devono accendersi insieme.
  const haSociTab = voci.some((v) => v.path === '/soci')
  const extraAreaClub = haSociTab ? ['/statistiche'] : ['/soci', '/statistiche']
  function eAttiva(percorso: string): boolean {
    if (pathname === percorso || pathname.startsWith(percorso + '/')) return true
    if (percorso === '/profilo') {
      return extraAreaClub.some((p) => pathname === p || pathname.startsWith(p + '/'))
    }
    return false
  }

  // Sfondo a macchie sfumate colorate dietro le schede "vetro" (Attività,
  // prossima attività, cerca partita): solo nelle tre sezioni che le usano,
  // non ovunque (Segreteria/admin restano sullo sfondo piatto di sempre).
  const sezioniArcobaleno = ['/prenota', '/profilo', '/tornei']
  const sfondoArcobaleno = sezioniArcobaleno.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )

  return (
    <div className="flex min-h-[100svh] flex-col">
      {/* Barra superiore: marchio e utente */}
      <header className="app-header">
        <div className="brand">
          Circolo Sportivo
          <small>Padel &amp; Calcio</small>
        </div>

        <div className="header-utente flex items-center gap-1.5 text-sm">
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
          <CampanellaNotifiche />
          <MenuUtente />
        </div>
      </header>

      {/* Su schermi larghi: sotto-header sticky. Su mobile: barra fissa in
          fondo (più comoda da raggiungere col pollice, come le app native
          — vedi media query in index.css). */}
      <div className="app-subnav">
        <nav className="header-tabs" aria-label="Navigazione principale">
          {voci.map((v) => (
            <NavLink
              key={v.path}
              to={v.path}
              className={'header-tab' + (eAttiva(v.path) ? ' attivo' : '')}
            >
              <v.Icona />
              <span>{v.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Lo sfondo arcobaleno va su questo contenitore a piena larghezza
          (non su .main sotto, che è centrato con max-w-[900px]: la tinta
          si vedrebbe solo nella colonna centrale, grigio ai lati su schermi
          larghi). */}
      <div className={'flex flex-1 flex-col' + (sfondoArcobaleno ? ' pagina-arcobaleno' : '')}>
        <InstallaAppBanner />

        {/* Contenuto. pb-24 su mobile lascia spazio alla barra fissa in
            fondo (rimossa da min-width:640px, dove torna pb-10). */}
        <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-24 pt-4 sm:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
