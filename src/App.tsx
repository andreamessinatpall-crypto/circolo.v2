import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import SchermataCaricamento from '@/components/SchermataCaricamento'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import BloccoPage from '@/pages/BloccoPage'
import AppShell from '@/pages/AppShell'
import ProfiloPage from '@/features/profilo/ProfiloPage'
import PadelPage from '@/features/prenotazioni/PadelPage'
import CalcioPage from '@/features/prenotazioni/CalcioPage'
import TorneiPage from '@/features/tornei/TorneiPage'
import PremiPage from '@/features/premi/PremiPage'
import SegreteriaPage from '@/features/segreteria/SegreteriaPage'

// Manda l'utente alla sua schermata di partenza:
// l'admin alla Segreteria, il socio al Profilo.
function RedirezioneIniziale() {
  const { profilo } = useAuth()
  return <Navigate to={profilo?.is_admin ? '/segreteria' : '/profilo'} replace />
}

// Mostra la schermata giusta in base allo stato di autenticazione.
function App() {
  const { stato, profilo } = useAuth()

  if (stato === 'caricamento') return <SchermataCaricamento />
  if (stato === 'bloccato') return <BloccoPage />

  if (stato === 'anonimo') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrati" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // stato === 'attivo': l'app vera, dentro il guscio (AppShell)
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/profilo" element={<ProfiloPage />} />
        <Route path="/padel" element={<PadelPage />} />
        <Route path="/calcio" element={<CalcioPage />} />
        <Route path="/tornei" element={<TorneiPage />} />
        <Route path="/premi" element={<PremiPage />} />
        {profilo?.is_admin && (
          <Route path="/segreteria" element={<SegreteriaPage />} />
        )}
        <Route path="*" element={<RedirezioneIniziale />} />
      </Route>
    </Routes>
  )
}

export default App
