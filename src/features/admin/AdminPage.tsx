import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { puoGestirePiattaforma } from '@/auth/ruoli'
import MenuUtente from '@/components/MenuUtente'
import CampanellaNotifiche from '@/components/CampanellaNotifiche'
import PiattaformaPage from '@/features/piattaforma/PiattaformaPage'
import GiocatoriTab from './GiocatoriTab'

type Scheda = 'circoli' | 'giocatori'

// Pannello dedicato del super-admin: route di primo livello (/admin), FUORI
// da /c/:slug — il super-admin non è mai socio/gestore di un circolo (vedi
// migrazione mt14-superadmin-puro.sql, che lo impedisce anche a livello di
// dati), quindi non ha senso fargli attraversare CircoloProvider/AppShell
// per raggiungere questa pagina. Niente tab Prenotazioni/Area Club/Tornei
// qui: solo la sovrastruttura — circoli e giocatori dell'intera piattaforma.
export default function AdminPage() {
  const { profilo } = useAuth()
  const [scheda, setScheda] = useState<Scheda>('circoli')

  if (!profilo || !puoGestirePiattaforma(profilo)) return <Navigate to="/scegli-circolo" replace />

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="app-header">
        <div className="brand">
          <span aria-hidden="true">Piattaforma</span>
        </div>
        <div className="header-utente flex items-center gap-1.5 text-sm">
          <CampanellaNotifiche />
          <MenuUtente />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-10 pt-4">
        <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Sezioni piattaforma">
          <button
            type="button"
            onClick={() => setScheda('circoli')}
            className={'subtab-btn' + (scheda === 'circoli' ? ' attivo' : '')}
          >
            Circoli
          </button>
          <button
            type="button"
            onClick={() => setScheda('giocatori')}
            className={'subtab-btn' + (scheda === 'giocatori' ? ' attivo' : '')}
          >
            Giocatori
          </button>
        </nav>

        {scheda === 'circoli' && <PiattaformaPage />}
        {scheda === 'giocatori' && <GiocatoriTab />}
      </main>
    </div>
  )
}
