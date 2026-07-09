import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore, classiOk } from '@/components/stili'
import { IconaLucchetto } from '@/components/IconeCampo'
import AuthHero from './AuthHero'
import FooterLegale from '@/components/legale/FooterLegale'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState(false)
  const [inCorso, setInCorso] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore('')
    if (password.length < 6) {
      setErrore('La password deve essere di almeno 6 caratteri.')
      return
    }
    if (password !== conferma) {
      setErrore('Le due password non coincidono.')
      return
    }
    setInCorso(true)
    const { error } = await supabase.auth.updateUser({ password })
    setInCorso(false)
    if (error) {
      setErrore('Aggiornamento non riuscito: ' + error.message)
      return
    }
    setOk(true)
    // Dopo 2s firma fuori così l'utente fa login con la nuova password
    setTimeout(() => supabase.auth.signOut(), 2000)
  }

  return (
    <div className="auth-page flex min-h-[100svh] flex-col items-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        <AuthHero />
        <div className="card auth-card form-verde">
          <h2 className="mb-1 text-xl">Nuova password</h2>
          <p className="sub mb-4">Scegli una nuova password per il tuo account.</p>

          {ok ? (
            <p className={classiOk}>
              Password aggiornata. Verrai reindirizzato al login tra un momento…
            </p>
          ) : (
            <form onSubmit={onSubmit}>
              <label htmlFor="rp-password" className="sr-only">Nuova password</label>
              <div className="campo-con-icona">
                <IconaLucchetto />
                <input
                  id="rp-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nuova password"
                  className={classiInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <label htmlFor="rp-conferma" className="sr-only">Conferma password</label>
              <div className="campo-con-icona">
                <IconaLucchetto />
                <input
                  id="rp-conferma"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Conferma password"
                  className={classiInput}
                  value={conferma}
                  onChange={(e) => setConferma(e.target.value)}
                  required
                />
              </div>

              {errore && <p className={`mt-3 ${classiErrore}`}>{errore}</p>}

              <button
                type="submit"
                className="btn btn-oro btn-riflesso btn-block mt-5"
                disabled={inCorso}
              >
                {inCorso ? 'Salvataggio…' : 'Imposta nuova password'}
              </button>
            </form>
          )}
        </div>
      </div>
      <FooterLegale />
    </div>
  )
}
