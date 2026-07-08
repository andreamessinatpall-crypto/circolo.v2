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
    // Chiude subito la tastiera: evita che lo scroll residuo per tenere il
    // campo password sopra la tastiera resti visibile dopo l'ingresso in app.
    ;(document.activeElement as HTMLElement | null)?.blur()
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
    <div className="auth-page flex h-[100svh] flex-col items-center overflow-y-auto px-4 py-5 [overscroll-behavior-y:contain]">
      <div className="flex w-full max-w-[420px] flex-1 flex-col justify-center">
        <AuthHero />

        <div className="card auth-card form-verde">
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

              {/* CTA registrazione in fondo */}
              <div className="mt-7 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.18)' }} />
              <Link
                to="/registrati"
                className="mt-4 flex items-center gap-4 rounded-2xl border border-white/25 bg-white/10 px-4 py-4 transition hover:bg-white/15"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <circle cx="8" cy="11" r="2"/>
                    <path d="M13 9h4M13 13h4"/>
                  </svg>
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-white">Non fai ancora parte del Club?</span>
                  <span className="block text-sm text-[var(--g300)]">Registrati qui →</span>
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
