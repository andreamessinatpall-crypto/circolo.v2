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
import GiocatoriReadOnly from '@/features/segreteria/GiocatoriReadOnly'
import ImpostazioniPage from '@/features/segreteria/ImpostazioniPage'
import GestionePrenotazioni from '@/features/segreteria/GestionePrenotazioni'
import StatistichePage from '@/features/segreteria/StatistichePage'
import { puoGestirePrenotazioni } from '@/auth/ruoli'
import CookieBanner from '@/components/legale/CookieBanner'

// Manda l'utente alla sua schermata di partenza in base al ruolo.
function RedirezioneIniziale() {
  const { profilo } = useAuth()
  if (profilo?.is_admin || profilo?.is_allenatore) return <Navigate to="/prenotazioni" replace />
  return <Navigate to="/prenota" replace />
}

// Mostra la schermata giusta in base allo stato di autenticazione.
function App() {
  const { stato, profilo } = useAuth()
  const { pathname } = useLocation()

  if (stato === 'caricamento') return <SchermataCaricamento />
  if (stato === 'recupero') return <><ResetPasswordPage /><CookieBanner /></>
  // Con flusso PKCE Supabase può sparare SIGNED_IN invece di PASSWORD_RECOVERY:
  // controlliamo il path come fallback.
  if (stato === 'attivo' && pathname === '/reset-password') return <><ResetPasswordPage /><CookieBanner /></>
  if (stato === 'bloccato') return <><BloccoPage /><CookieBanner /></>

  if (stato === 'anonimo') {
    return (
      <>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registrati" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <CookieBanner />
      </>
    )
  }

  // stato === 'attivo': l'app vera, dentro il guscio (AppShell)
  return (
    <>
    <CookieBanner />
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/profilo" element={<ProfiloPage />} />
        <Route path="/profilo/mie-prenotazioni" element={<GestioneAttivitaPagina />} />
        <Route path="/profilo/attivita-in-programma" element={<Navigate to="/profilo/mie-prenotazioni" replace />} />
        <Route path="/profilo/amici" element={<AmiciPagina />} />
        <Route path="/profilo/premi" element={<PremiPagina />} />
        <Route path="/profilo/cerco-giocatori" element={<CercoGiocatoriPagina />} />
        <Route path="/profilo/classifica" element={<ClassificaPagina />} />
        <Route path="/profilo/tornei-in-corso" element={<TorneiInCorsoPagina />} />
        <Route path="/profilo/tornei-in-programma" element={<TorneiInProgrammaPagina />} />
        <Route path="/profilo/annunci" element={<AnnunciPagina />} />
        <Route path="/profilo/staff" element={<StaffClubPagina />} />
        <Route path="/profilo/lezioni" element={<IstruttoriPagina />} />
        <Route path="/prenota" element={<PrenotaPage />} />
        <Route path="/tornei" element={<TorneiPage />} />
        {profilo?.is_allenatore && !profilo?.is_admin && (
          <Route path="/premi" element={<GestionePremi />} />
        )}
        {!profilo?.is_allenatore && !profilo?.e_allenatore && !profilo?.is_admin && (
          <Route path="/premi" element={<PremiPage />} />
        )}
        {(profilo?.is_admin || profilo?.is_allenatore) && <Route path="/soci" element={<SociPage />} />}
        {profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin && (
          <Route path="/soci" element={<GiocatoriReadOnly />} />
        )}
        {profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin && (
          <Route path="/profilo/gestione-lezioni" element={<GestioneLezioniPagina />} />
        )}
        {profilo?.is_admin && <Route path="/impostazioni" element={<ImpostazioniPage />} />}
        {profilo && puoGestirePrenotazioni(profilo) && (
          <Route path="/prenotazioni" element={<GestionePrenotazioni />} />
        )}
        {profilo && puoGestirePrenotazioni(profilo) && (
          <Route path="/statistiche" element={<StatistichePage />} />
        )}
        <Route path="*" element={<RedirezioneIniziale />} />
      </Route>
    </Routes>
    </>
  )
}

export default App
