import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  classiBottone,
  classiCard,
  classiEtichetta,
  classiErrore,
  classiInput,
} from '@/components/stili'

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
    // In caso di successo l'AuthProvider rileva il login e mostra l'app:
    // non serve fare altro qui.
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="font-display text-4xl uppercase tracking-wider text-verde-800">
          Circolo Sportivo
        </h1>
        <p className="mt-1 font-display text-xs uppercase tracking-[0.32em] text-ottone-500">
          Padel &amp; Calcio
        </p>
      </header>

      <form onSubmit={onSubmit} className={classiCard}>
        <h2 className="mb-5 font-display text-xl uppercase tracking-wide text-ink">
          Accedi
        </h2>

        <div className="mb-4">
          <label htmlFor="email" className={classiEtichetta}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={classiInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-5">
          <label htmlFor="password" className={classiEtichetta}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={classiInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {errore && <p className={`mb-4 ${classiErrore}`}>{errore}</p>}

        <button type="submit" className={classiBottone} disabled={inCorso}>
          {inCorso ? 'Accesso in corso…' : 'Accedi'}
        </button>

        <p className="mt-5 text-center text-sm text-ink-2">
          Non hai un account?{' '}
          <Link to="/registrati" className="font-semibold text-verde-700 hover:underline">
            Registrati
          </Link>
        </p>
      </form>
    </div>
  )
}
