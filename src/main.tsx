import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { registraServiceWorker } from '@/lib/registraServiceWorker'
import './index.css'
import App from './App.tsx'

// TanStack Query gestisce caricamento, cache ed errori delle chiamate a Supabase.
const queryClient = new QueryClient()

// Disattiva il ripristino automatico dello scroll del browser: su mobile
// spesso scatta dopo il mount di React, sovrascrivendo il nostro scrollTo(0,0)
// e facendo apparire la pagina già scrollata sotto l'header.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// Altezza reale dello schermo, per le pagine a schermo intero (AppShell,
// login, registrazione…). "100dvh" NON basta: su iOS è calcolato sul
// viewport di LAYOUT, che non si restringe quando compare la tastiera
// software (a differenza della toolbar del browser, che invece dvh segue
// correttamente) — risultato, un vuoto in fondo che spinge su header/barra
// fissi appena si tocca un campo di testo. visualViewport.height segue
// invece SEMPRE l'area effettivamente visibile (tastiera inclusa), quindi
// la esponiamo come custom property e la usiamo al posto di 100dvh.
function aggiornaAltezzaVisibile() {
  const altezza = window.visualViewport?.height ?? window.innerHeight
  document.documentElement.style.setProperty('--vh-reale', altezza + 'px')
}
aggiornaAltezzaVisibile()
window.visualViewport?.addEventListener('resize', aggiornaAltezzaVisibile)
window.addEventListener('resize', aggiornaAltezzaVisibile)
window.addEventListener('orientationchange', aggiornaAltezzaVisibile)

registraServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
