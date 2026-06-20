import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore } from '@/components/stili'

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
      <div className="auth-hero">
        <div className="auth-crest">🎾</div>
        <div className="auth-titolo">Circolo Sportivo</div>
        <div className="auth-claim">Padel &amp; Calcio</div>
      </div>

      <form onSubmit={onSubmit} className="card auth-card">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={classiInput}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={classiInput}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {errore && <p className={`mt-3 ${classiErrore}`}>{errore}</p>}

        <button type="submit" className="btn btn-oro btn-block mt-5" disabled={inCorso}>
          {inCorso ? 'Accesso in corso…' : 'Accedi'}
        </button>

        <p className="mt-5 text-center text-sm text-ink-2">
          Non hai un account?{' '}
          <Link to="/registrati" className="font-semibold text-verde-600 hover:underline">
            Registrati
          </Link>
        </p>
      </form>
    </div>
  )
}
