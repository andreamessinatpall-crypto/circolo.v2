import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { classiErrore, classiOk } from '@/components/stili'

export default function CambiaPassword() {
  const { profilo } = useAuth()
  const [attuale, setAttuale] = useState('')
  const [nuova, setNuova] = useState('')
  const [conferma, setConferma] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [inCorso, setInCorso] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)

    if (nuova.length < 8) {
      setMsg({ tipo: 'errore', testo: 'La nuova password deve avere almeno 8 caratteri.' })
      return
    }
    if (nuova !== conferma) {
      setMsg({ tipo: 'errore', testo: 'Le due nuove password non coincidono.' })
      return
    }
    if (nuova === attuale) {
      setMsg({ tipo: 'errore', testo: 'La nuova password deve essere diversa da quella attuale.' })
      return
    }
    const email = profilo?.email
    if (!email) {
      setMsg({
        tipo: 'errore',
        testo: 'Impossibile verificare la password attuale: email non disponibile.',
      })
      return
    }

    setInCorso(true)
    // Verifico la password attuale ri-autenticandomi (come nella v1).
    const { error: errVerifica } = await supabase.auth.signInWithPassword({
      email,
      password: attuale,
    })
    if (errVerifica) {
      setInCorso(false)
      setMsg({ tipo: 'errore', testo: 'La password attuale non è corretta.' })
      return
    }
    const { error } = await supabase.auth.updateUser({ password: nuova })
    setInCorso(false)
    if (error) {
      setMsg({ tipo: 'errore', testo: 'Aggiornamento non riuscito: ' + error.message })
      return
    }
    setMsg({ tipo: 'ok', testo: 'Password aggiornata.' })
    setAttuale('')
    setNuova('')
    setConferma('')
  }

  return (
    <div>
      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <span className="club-sez-icona">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
        </span>
        <h2 className="club-sez-titolo">Cambia password</h2>
      </div>
      <form onSubmit={onSubmit} className="card">
        <label htmlFor="pw-attuale">Password attuale</label>
        <input
          id="pw-attuale"
          type="password"
          autoComplete="current-password"
          value={attuale}
          onChange={(e) => setAttuale(e.target.value)}
          required
        />

        <label htmlFor="pw-nuova">Nuova password (min. 8 caratteri)</label>
        <input
          id="pw-nuova"
          type="password"
          autoComplete="new-password"
          value={nuova}
          onChange={(e) => setNuova(e.target.value)}
          required
        />

        <label htmlFor="pw-conferma">Ripeti la nuova password</label>
        <input
          id="pw-conferma"
          type="password"
          autoComplete="new-password"
          value={conferma}
          onChange={(e) => setConferma(e.target.value)}
          required
        />

        {msg && (
          <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}

        <button type="submit" className="btn mt-4" disabled={inCorso}>
          {inCorso ? 'Aggiornamento…' : 'Aggiorna password'}
        </button>
      </form>
    </div>
  )
}
