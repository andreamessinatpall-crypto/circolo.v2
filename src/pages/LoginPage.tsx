import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore, classiOk } from '@/components/stili'
import AuthHero from './AuthHero'
import FooterLegale from '@/components/legale/FooterLegale'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)

  // OAuth
  const [oauthInCorso, setOauthInCorso] = useState(false)
  const [oauthErrore, setOauthErrore] = useState('')

  async function signInWithOAuth(provider: 'google' | 'apple') {
    setOauthErrore('')
    setOauthInCorso(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/' },
    })
    setOauthInCorso(false)
    if (error) setOauthErrore('Accesso non riuscito: ' + error.message)
  }

  // Recupero password
  const [vistaRecupero, setVistaRecupero] = useState(false)
  const [emailRecupero, setEmailRecupero] = useState('')
  const [recuperoOk, setRecuperoOk] = useState(false)
  const [erroreRecupero, setErroreRecupero] = useState('')
  const [invioInCorso, setInvioInCorso] = useState(false)

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
  }

  async function onRecupero(e: FormEvent) {
    e.preventDefault()
    setErroreRecupero('')
    setInvioInCorso(true)
    const { error } = await supabase.auth.resetPasswordForEmail(emailRecupero.trim(), {
      redirectTo: window.location.origin + '/reset-password',
    })
    setInvioInCorso(false)
    if (error) {
      setErroreRecupero('Invio non riuscito: ' + error.message)
      return
    }
    setRecuperoOk(true)
  }

  function tornaAlLogin() {
    setVistaRecupero(false)
    setRecuperoOk(false)
    setErroreRecupero('')
    setEmailRecupero('')
  }

  return (
    <div className="flex h-[100dvh] flex-col items-center overflow-y-auto px-4 py-5">
      <div className="flex w-full max-w-[420px] flex-1 flex-col justify-center">
        <AuthHero />

        <div className="card auth-card">
          {vistaRecupero ? (
            <>
              <h2 className="mb-1 text-xl">Recupero password</h2>
              {recuperoOk ? (
                <>
                  <p className={`mt-2 ${classiOk}`}>
                    Ti abbiamo inviato un'email con il link per reimpostare la password. Controlla anche la cartella spam.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondario btn-block mt-4"
                    onClick={tornaAlLogin}
                  >
                    Torna al login
                  </button>
                </>
              ) : (
                <>
                  <p className="sub mb-4">
                    Inserisci la tua email: ti invieremo un link per scegliere una nuova password.
                  </p>
                  <form onSubmit={onRecupero}>
                    <label htmlFor="rec-email">Email</label>
                    <input
                      id="rec-email"
                      type="email"
                      autoComplete="email"
                      className={classiInput}
                      value={emailRecupero}
                      onChange={(e) => setEmailRecupero(e.target.value)}
                      required
                    />
                    {erroreRecupero && (
                      <p className={`mt-3 ${classiErrore}`}>{erroreRecupero}</p>
                    )}
                    <button
                      type="submit"
                      className="btn btn-oro btn-riflesso btn-block mt-5"
                      disabled={invioInCorso}
                    >
                      {invioInCorso ? 'Invio in corso…' : 'Invia link di recupero'}
                    </button>
                  </form>
                  <button
                    type="button"
                    className="btn btn-secondario btn-block mt-2"
                    onClick={tornaAlLogin}
                  >
                    Torna al login
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {/* Form email + password */}
              <form onSubmit={onSubmit}>
                <label htmlFor="login-email">Email</label>
                <div className="auth-field">
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    className={classiInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <label htmlFor="login-password">Password</label>
                <div className="auth-field">
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    className={classiInput}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="mt-4 text-right">
                  <button
                    type="button"
                    className="text-xs text-ink-2 underline underline-offset-2 hover:text-verde-700"
                    onClick={() => { setVistaRecupero(true); setEmailRecupero(email) }}
                  >
                    Password dimenticata?
                  </button>
                </div>

                {errore && <p className={`mt-3 ${classiErrore}`}>{errore}</p>}

                <button type="submit" className="btn btn-oro btn-riflesso btn-block mt-5" disabled={inCorso}>
                  {inCorso ? 'Accesso in corso…' : 'Entra in campo'}
                </button>
              </form>

              {/* OAuth con soli simboli */}
              <div className="oauth-divider mt-5">oppure accedi con</div>
              <div className="mt-3 flex justify-center gap-3">
                <button
                  type="button"
                  className="oauth-btn oauth-btn-google"
                  style={{ width: 52, height: 46, padding: 0, justifyContent: 'center', borderRadius: 12 }}
                  onClick={() => signInWithOAuth('google')}
                  disabled={oauthInCorso}
                  aria-label="Accedi con Google"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className="oauth-btn oauth-btn-apple"
                  style={{ width: 52, height: 46, padding: 0, justifyContent: 'center', borderRadius: 12 }}
                  onClick={() => signInWithOAuth('apple')}
                  disabled={oauthInCorso}
                  aria-label="Accedi con Apple"
                >
                  <svg width="18" height="20" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 135.4-318.1 268.1-318.1 69.6 0 127.6 45.8 170.5 45.8 40.7 0 106.3-48.3 185.5-48.3zM549.6 103c28.6-36.8 50-87.5 50-138.2 0-7.1-.6-14.3-1.9-20.1-47.6 1.9-104.3 31.8-138.6 73.1-27.3 31.8-51.6 82.5-51.6 133.9 0 7.5 1.3 15 1.9 17.5 3.2.6 8.4 1.3 13.6 1.3 42.8 0 96.8-28.6 126.6-67.5z"/>
                  </svg>
                </button>
              </div>
              {oauthErrore && <p className={`mt-3 ${classiErrore}`}>{oauthErrore}</p>}

              {/* CTA registrazione in fondo */}
              <div className="mt-7 border-t" style={{ borderColor: 'rgba(12, 51, 25, 0.10)' }} />
              <Link
                to="/registrati"
                className="mt-4 flex items-center gap-4 rounded-2xl border bg-gradient-to-br from-verde-50 to-white px-4 py-4 shadow-sm transition hover:shadow-md hover:from-verde-100"
                style={{ borderColor: 'rgba(12, 51, 25, 0.18)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(12, 51, 25, 0.32)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(12, 51, 25, 0.18)')}
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-verde-700 text-white shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <circle cx="8" cy="11" r="2"/>
                    <path d="M13 9h4M13 13h4"/>
                  </svg>
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-verde-900">Non fai ancora parte del Club?</span>
                  <span className="block text-sm text-verde-700">Registrati qui →</span>
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
      <FooterLegale />
    </div>
  )
}
