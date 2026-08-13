import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import SchermataCaricamento from '@/components/SchermataCaricamento'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import BloccoPage from '@/pages/BloccoPage'
import AppShell from '@/pages/AppShell'
import ProfiloPage from '@/features/profilo/ProfiloPage'
import GestioneAttivitaPagina from '@/features/profilo/pagine/GestioneAttivitaPagina'
import AmiciPagina from '@/features/profilo/pagine/AmiciPagina'
import PremiPagina from '@/features/profilo/pagine/PremiPagina'
import CercoGiocatoriPagina from '@/features/profilo/pagine/CercoGiocatoriPagina'
import ClassificaPagina from '@/features/profilo/pagine/ClassificaPagina'
import TorneiInCorsoPagina from '@/features/profilo/pagine/TorneiInCorsoPagina'
import TorneiInProgrammaPagina from '@/features/profilo/pagine/TorneiInProgrammaPagina'
import AnnunciPagina from '@/features/profilo/pagine/AnnunciPagina'
import StaffClubPagina from '@/features/profilo/pagine/StaffClubPagina'
import IstruttoriPagina from '@/features/profilo/pagine/IstruttoriPagina'
import GestioneLezioniPagina from '@/features/profilo/pagine/GestioneLezioniPagina'
import PrenotaPage from '@/features/prenotazioni/PrenotaPage'
import TorneiPage from '@/features/tornei/TorneiPage'
import PremiPage from '@/features/premi/PremiPage'
import GestionePremi from '@/features/segreteria/GestionePremi'
import SociPage from '@/features/segreteria/SociPage'
import ImpostazioniPage from '@/features/segreteria/ImpostazioniPage'
import GestionePrenotazioni from '@/features/segreteria/GestionePrenotazioni'
import StatistichePage from '@/features/segreteria/StatistichePage'
import PiattaformaPage from '@/features/piattaforma/PiattaformaPage'
import { puoGestirePiattaforma } from '@/auth/ruoli'
import CookieBanner from '@/components/legale/CookieBanner'
import { DialogoHost } from '@/lib/dialoghi'
import CircoloProvider from '@/circolo/CircoloProvider'
import SceltaCircoloPage from '@/circolo/SceltaCircoloPage'
import RichiedeRuolo from '@/circolo/RichiedeRuolo'
import { useMioRuolo } from '@/circolo/useMioRuolo'
import { useCircolo } from '@/circolo/useCircolo'
import { useMieCircoli } from '@/circolo/datiCircoloSocio'
import { useModalitaPremi } from '@/features/premi/datiPremi'

// Manda l'utente alla sua schermata di partenza in base al ruolo NEL
// CIRCOLO CORRENTE (non ai vecchi flag globali is_admin/is_allenatore su
// `soci`, uguali in ogni circolo) — rende all'index di /c/:slug (o da
// qualsiasi percorso "*" senza match sotto /c/:slug), quindi è già dentro
// <CircoloProvider>. Percorso ASSOLUTO (non relativo): un target relativo
// tipo "prenotazioni" si risolverebbe di nuovo su un percorso "*" ancora
// senza match se il percorso di partenza era già invalido (es. "/c/slug/
// login", che capita dopo login da /login con un solo circolo — vedi
// RedirezioneCircolo), e ogni nuovo render tornerebbe qui appendendo un
// altro "prenotazioni" invece di convergere — bug reale riscontrato con
// l'URL che cresceva a dismisura.
function RedirezioneIniziale() {
  const circolo = useCircolo()
  const { puoGestire } = useMioRuolo()
  if (puoGestire) return <Navigate to={`/c/${circolo.slug}/prenotazioni`} replace />
  return <Navigate to={`/c/${circolo.slug}/prenota`} replace />
}

// "/premi": ogni ruolo vede una vista diversa (il gestore gestisce i premi
// dal pannello account, non da qui — vedi MenuUtente "Il tuo club").
// Il ramo socio è l'unico che dipende da modalita_premi: se il gestore l'ha
// disattivata, la schermata di riscatto non deve restare raggiungibile via
// URL diretto anche se non compare più nessuna scorciatoia verso di lei
// (gap reale trovato: prima di questo fix restava aperta comunque).
function PremiRoute() {
  const circolo = useCircolo()
  const { ruolo } = useMioRuolo()
  const { data: modalitaPremi, isLoading } = useModalitaPremi()
  if (ruolo === 'collaboratore') return <GestionePremi />
  if (ruolo === 'socio') {
    if (isLoading) return null
    if (!modalitaPremi) return <Navigate to={`/c/${circolo.slug}/prenota`} replace />
    return <PremiPage />
  }
  return <Navigate to={`/c/${circolo.slug}/prenotazioni`} replace />
}

// Qualsiasi percorso senza /c/:slug: il caso più comune è l'atterraggio
// appena dopo il login ("/" o "/login", il pathname resta "/login" finché
// non viene sostituito dal redirect), che ora passa SEMPRE dal carosello di
// scelta circolo (SceltaCircoloPage) — richiesta esplicita: il socio sceglie
// dove entrare a ogni accesso, anche con un solo circolo. Un deep link
// "vero" (link salvato in una notifica, bookmark su un percorso legacy
// pre-Fase 5) con un solo circolo continua invece a entrare dritto lì
// mantenendo il percorso, per non rompere quei link mid-sessione; con 0 o
// più di un circolo va comunque al carosello (che perde il percorso
// originale — semplificazione accettabile, un deep link non ha senso finché
// non si sa in quale circolo entrare).
function RedirezioneCircolo() {
  const { profilo } = useAuth()
  const { pathname, search } = useLocation()
  const { data: mieiCircoli, isLoading } = useMieCircoli(profilo?.id)

  if (!profilo || isLoading) return <SchermataCaricamento />

  const atterraggioPostLogin = pathname === '/' || pathname === '/login'
  if (!atterraggioPostLogin && (mieiCircoli ?? []).length === 1) {
    const slug = mieiCircoli![0].circolo.slug
    return <Navigate to={`/c/${slug}${pathname}${search}`} replace />
  }

  return <Navigate to="/scegli-circolo" replace />
}

// Mostra la schermata giusta in base allo stato di autenticazione.
function App() {
  const { stato, profilo } = useAuth()
  const { pathname } = useLocation()

  if (stato === 'caricamento') return <SchermataCaricamento />
  if (stato === 'recupero') return <><ResetPasswordPage /><CookieBanner /><DialogoHost /></>
  // Con flusso PKCE Supabase può sparare SIGNED_IN invece di PASSWORD_RECOVERY:
  // controlliamo il path come fallback.
  if (stato === 'attivo' && pathname === '/reset-password') return <><ResetPasswordPage /><CookieBanner /><DialogoHost /></>
  if (stato === 'bloccato') return <><BloccoPage /><CookieBanner /><DialogoHost /></>

  if (stato === 'anonimo') {
    return (
      <>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registrati" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <CookieBanner />
        <DialogoHost />
      </>
    )
  }

  // stato === 'attivo': l'app vera, dentro il guscio (AppShell)
  return (
    <>
    <CookieBanner />
    <DialogoHost />
    <Routes>
      <Route path="/scegli-circolo" element={<SceltaCircoloPage />} />
      <Route path="/c/:slug" element={<CircoloProvider><AppShell /></CircoloProvider>}>
        <Route index element={<RedirezioneIniziale />} />
        <Route path="profilo" element={<ProfiloPage />} />
        <Route path="profilo/mie-prenotazioni" element={<GestioneAttivitaPagina />} />
        <Route path="profilo/attivita-in-programma" element={<Navigate to="../mie-prenotazioni" replace />} />
        <Route path="profilo/amici" element={<AmiciPagina />} />
        <Route path="profilo/premi" element={<PremiPagina />} />
        <Route path="profilo/cerco-giocatori" element={<CercoGiocatoriPagina />} />
        <Route path="profilo/classifica" element={<ClassificaPagina />} />
        <Route path="profilo/tornei-in-corso" element={<TorneiInCorsoPagina />} />
        <Route path="profilo/tornei-in-programma" element={<TorneiInProgrammaPagina />} />
        <Route path="profilo/annunci" element={<AnnunciPagina />} />
        <Route path="profilo/staff" element={<StaffClubPagina />} />
        <Route path="profilo/lezioni" element={<IstruttoriPagina />} />
        <Route path="prenota" element={<PrenotaPage />} />
        <Route path="tornei" element={<TorneiPage />} />
        <Route path="premi" element={<PremiRoute />} />
        <Route
          path="soci"
          element={
            <RichiedeRuolo richiede="staff">
              <SociPage />
            </RichiedeRuolo>
          }
        />
        <Route
          path="profilo/gestione-lezioni"
          element={
            <RichiedeRuolo richiede="puoDareLezioni">
              <GestioneLezioniPagina />
            </RichiedeRuolo>
          }
        />
        <Route
          path="impostazioni"
          element={
            <RichiedeRuolo richiede="gestore">
              <ImpostazioniPage />
            </RichiedeRuolo>
          }
        />
        <Route
          path="prenotazioni"
          element={
            <RichiedeRuolo richiede="staff">
              <GestionePrenotazioni />
            </RichiedeRuolo>
          }
        />
        <Route
          path="statistiche"
          element={
            <RichiedeRuolo richiede="staff">
              <StatistichePage />
            </RichiedeRuolo>
          }
        />
        {profilo && puoGestirePiattaforma(profilo) && (
          <Route path="piattaforma" element={<PiattaformaPage />} />
        )}
        <Route path="*" element={<RedirezioneIniziale />} />
      </Route>
      <Route path="*" element={<RedirezioneCircolo />} />
    </Routes>
    </>
  )
}

export default App
