import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore, classiOk } from '@/components/stili'
import { IconaEmail, IconaLucchetto } from '@/components/IconeCampo'
import AuthHero from './AuthHero'
import FooterLegale from '@/components/legale/FooterLegale'

export default function LoginPage() {
  const navigate = useNavigate()

  // Login in due passi: prima solo l'email. Se corrisponde a un socio già
  // registrato si passa al passo password; altrimenti si manda dritti alla
  // registrazione (l'utente non deve capire da solo che non è ancora iscritto).
  const [fase, setFase] = useState<'email' | 'password'>('email')
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

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault()
    setErrore('')
    setInCorso(true)
    const emailPulita = email.trim().toLowerCase()
    const { data: esiste, error } = await supabase.rpc('email_esiste', { p_email: emailPulita })
    setInCorso(false)
    if (error) {
      setErrore('Verifica email non riuscita: ' + error.message)
      return
    }
    if (esiste) {
      setEmail(emailPulita)
      setFase('password')
    } else {
      navigate('/registrati', { state: { email: emailPulita } })
    }
  }

  async function onSubmitPassword(e: FormEvent) {
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

  function cambiaEmail() {
    setFase('email')
    setPassword('')
    setErrore('')
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
          {!vistaRecupero && <h1 className="mb-1 text-center text-2xl">Accedi o registrati</h1>}
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
                    <label htmlFor="rec-email" className="sr-only">Email</label>
                    <div className="campo-con-icona">
                      <IconaEmail />
                      <input
                        id="rec-email"
                        type="email"
                        autoComplete="email"
                        placeholder="Email"
                        className={classiInput}
                        value={emailRecupero}
                        onChange={(e) => setEmailRecupero(e.target.value)}
                        required
                      />
                    </div>
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
          ) : fase === 'email' ? (
            <form onSubmit={onSubmitEmail}>
              <label htmlFor="login-email" className="sr-only">Email</label>
              <div className="campo-con-icona">
                <IconaEmail />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="Email"
                  className={classiInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {errore && <p className={`mt-3 ${classiErrore}`}>{errore}</p>}

              <button type="submit" className="btn btn-oro btn-riflesso btn-block mt-5" disabled={inCorso}>
                {inCorso ? 'Verifica in corso…' : 'Entra in campo'}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmitPassword}>
              <div className="mb-4 flex items-center justify-between text-sm text-white/80">
                <span className="truncate">{email}</span>
                <button type="button" className="shrink-0 pl-3 text-[var(--g300)] underline underline-offset-2" onClick={cambiaEmail}>
                  Cambia
                </button>
              </div>

              <label htmlFor="login-password" className="sr-only">Password</label>
              <div className="campo-con-icona">
                <IconaLucchetto />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  className={classiInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
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
          )}
        </div>
      </div>
      <FooterLegale />
    </div>
  )
}
