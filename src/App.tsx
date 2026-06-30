import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import SchermataCaricamento from '@/components/SchermataCaricamento'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import BloccoPage from '@/pages/BloccoPage'
import AppShell from '@/pages/AppShell'
import ProfiloPage from '@/features/profilo/ProfiloPage'
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

  if (stato === 'caricamento') return <SchermataCaricamento />
  if (stato === 'recupero') return <><ResetPasswordPage /><CookieBanner /></>
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
        <Route path="/prenota" element={<PrenotaPage />} />
        <Route path="/tornei" element={<TorneiPage />} />
        {profilo?.is_allenatore && !profilo?.is_admin && (
          <Route path="/premi" element={<GestionePremi />} />
        )}
        {!profilo?.is_allenatore && !profilo?.e_allenatore && !profilo?.is_admin && (
          <Route path="/premi" element={<PremiPage />} />
        )}
        {profilo?.is_admin && <Route path="/soci" element={<SociPage />} />}
        {profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin && (
          <Route path="/soci" element={<GiocatoriReadOnly />} />
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
