import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { classiCard } from '@/components/stili'

// Schermata mostrata quando l'utente è loggato ma non può ancora entrare:
//  - profilo non associato a un socio, oppure
//  - registrazione in attesa di approvazione dalla segreteria.
export default function BloccoPage() {
  const { blocco, esci } = useAuth()
  const navigate = useNavigate()

  async function handleEsci() {
    await esci()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className={`${classiCard} text-center`}>
        <h1 className="mb-3 font-display text-2xl uppercase tracking-wide text-verde-800">
          {blocco?.titolo ?? 'Accesso non disponibile'}
        </h1>
        <p className="text-sm leading-relaxed text-ink-2">{blocco?.testo}</p>

        <button
          type="button"
          onClick={handleEsci}
          className="mt-6 text-sm font-semibold text-verde-700 hover:underline"
        >
          Esci
        </button>
      </div>
    </div>
  )
}
