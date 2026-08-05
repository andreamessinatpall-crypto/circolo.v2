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
