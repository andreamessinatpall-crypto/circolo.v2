import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import SchermataCaricamento from '@/components/SchermataCaricamento'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import BloccoPage from '@/pages/BloccoPage'
import AppShell from '@/pages/AppShell'

// Mostra la schermata giusta in base allo stato di autenticazione.
function App() {
  const { stato } = useAuth()

  if (stato === 'caricamento') return <SchermataCaricamento />
  if (stato === 'attivo') return <AppShell />
  if (stato === 'bloccato') return <BloccoPage />

  // stato === 'anonimo': login e registrazione
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registrati" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
