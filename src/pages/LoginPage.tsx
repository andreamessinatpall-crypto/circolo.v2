import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore } from '@/components/stili'
import AuthHero from './AuthHero'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore('')
    setInCorso(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setInCorso(false)
    if (error) {
      setErrore(
        error.message.includes('Invalid login')
          ? 'Email o password non corretti.'
          : 'Accesso non riuscito: ' + error.message,
      )
      return
    }
    // In caso di successo l'AuthProvider rileva il login e mostra l'app.
  }

  return (
    <div className="mx-auto mt-13 max-w-[420px] px-4 pb-16">
      <AuthHero />

      <div className="card auth-card">
        <p className="sub mb-4">
          Accedi con le tue credenziali. Sei un nuovo giocatore? Registrati: dopo la
          conferma via email, la segreteria approverà il tuo accesso.
        </p>

        <form onSubmit={onSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            className={classiInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className={classiInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errore && <p className={`mt-3 ${classiErrore}`}>{errore}</p>}

          <button type="submit" className="btn btn-oro btn-riflesso btn-block mt-5" disabled={inCorso}>
            {inCorso ? 'Accesso in corso…' : 'Entra in campo'}
          </button>
        </form>

        <div className="auth-perks">
          <div className="perk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />
            </svg>
            Guadagna punti a ogni partita
          </div>
          <div className="perk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M8 4h8v4a4 4 0 01-8 0zM8 5H5a3 3 0 006 0M16 5h3a3 3 0 01-6 0M12 12v4M9 20h6l-1-4h-4z" />
            </svg>
            Sblocca badge e scala i livelli
          </div>
          <div className="perk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
            Entra in classifica e vinci premi
          </div>
        </div>

        <p className="sub mt-4 text-center">
          Non hai un account?{' '}
          <Link to="/registrati" className="font-semibold text-verde-600 hover:underline">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  )
}
