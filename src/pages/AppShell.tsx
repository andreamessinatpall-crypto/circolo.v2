import { useEffect } from 'react'
import type { ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useRealtimeCircolo } from '@/hooks/useRealtimeCircolo'
import { useCircolo } from '@/circolo/useCircolo'
import { useMioRuolo } from '@/circolo/useMioRuolo'
import InstallaAppBanner from '@/components/InstallaAppBanner'
import MenuUtente from '@/components/MenuUtente'
import CampanellaNotifiche from '@/components/CampanellaNotifiche'
import logoCIcon from '@/assets/logo-c-icon.png'
import {
  IconaPrenota,
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
// Statistiche e Giocatori non sono più tab di primo livello per lo staff:
// si raggiungono dalle schede dentro Area Club (vedi AreaClubSchede.tsx).
function vociMenu(puoGestire: boolean): Voce[] {
  if (puoGestire) {
    return [
      { path: '/prenotazioni', label: 'Prenotazioni', Icona: IconaPrenota },
      { path: '/profilo', label: 'Area Club', Icona: IconaAreaClub },
      { path: '/tornei', label: 'Tornei', Icona: IconaTornei },
    ]
  }

  return [
    { path: '/prenota', label: 'Prenota', Icona: IconaPrenota },
    { path: '/profilo', label: 'Area Club', Icona: IconaAreaClub },
    { path: '/tornei', label: 'Tornei', Icona: IconaTornei },
  ]
}

export default function AppShell() {
  const { profilo } = useAuth()
  const { pathname } = useLocation()
  const { slug } = useParams<{ slug: string }>()
  const circolo = useCircolo()
  const { eGestore, puoGestire } = useMioRuolo()
  const basePercorso = `/c/${slug}`
  // Le voci di menu e i confronti sotto usano percorsi SENZA il prefisso
  // /c/:slug (com'erano prima della Fase 5): li ricaviamo qui una volta sola
  // togliendo il prefisso da pathname, invece di riscrivere ogni confronto.
  const sottoPercorso = pathname.startsWith(basePercorso)
    ? pathname.slice(basePercorso.length) || '/'
    : pathname
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

  const voci = vociMenu(puoGestire)

  // "Area Club" deve restare selezionata anche nelle pagine raggiunte dalle
  // sue schede che non vivono sotto /profilo (Giocatori → /soci, Statistiche
  // → /statistiche), altrimenti la tab tornava bianca entrandoci — NavLink
  // di suo la marca attiva solo per /profilo e le sue sotto-rotte.
  const extraAreaClub = ['/soci', '/statistiche']
  function eAttiva(percorso: string): boolean {
    if (sottoPercorso === percorso || sottoPercorso.startsWith(percorso + '/')) return true
    if (percorso === '/profilo') {
      return extraAreaClub.some((p) => sottoPercorso === p || sottoPercorso.startsWith(p + '/'))
    }
    return false
  }

  // Sfondo a macchie sfumate colorate dietro le schede "vetro" (Attività,
  // prossima attività, cerca partita): solo nelle tre sezioni che le usano,
  // non ovunque (Segreteria/admin restano sullo sfondo piatto di sempre).
  const sezioniArcobaleno = ['/prenota', '/profilo', '/tornei']
  const sfondoArcobaleno = sezioniArcobaleno.some(
    (p) => sottoPercorso === p || sottoPercorso.startsWith(p + '/'),
  )

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Barra superiore: marchio e utente */}
      <header className="app-header">
        <div className="brand" aria-label={circolo.nome}>
          <img src={circolo.logo_url || logoCIcon} alt="" className="brand-c-icon" aria-hidden="true" />
          <span aria-hidden="true" className="max-w-[10rem] truncate align-bottom sm:max-w-[16rem]">
            {circolo.nome}
          </span>
        </div>

        <div className="header-utente flex items-center gap-1.5 text-sm">
          {profilo.is_super_admin && (
            <NavLink
              to={`${basePercorso}/piattaforma`}
              title="Piattaforma"
              className={({ isActive }) =>
                'flex items-center rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white' +
                (isActive ? ' bg-white/10 text-white' : '')
              }
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </NavLink>
          )}
          {eGestore && (
            <NavLink
              to={`${basePercorso}/impostazioni`}
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

      {/* Sotto-header sticky a tutte le larghezze — vedi index.css. */}
      <div className="app-subnav">
        <nav className="header-tabs" aria-label="Navigazione principale">
          {voci.map((v) => (
            <NavLink
              key={v.path}
              to={`${basePercorso}${v.path}`}
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

        <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-10 pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
