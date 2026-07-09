import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { etichettaGenere } from '@/lib/formato'
import { messaggioErrore } from '@/lib/errori'
import { logoDaFile } from '@/lib/immagini'
import { classiErrore, classiOk } from '@/components/stili'
import StoricoMovimenti from './StoricoMovimenti'
import CambiaPasswordModal from './CambiaPasswordModal'
import SezioneLivelloGioco from './livelloGioco/SezioneLivelloGioco'
import SezionePreferenze from './preferenze/SezionePreferenze'

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function IcoFotocamera() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export default function DatiProfilo() {
  const { profilo, utente, ricaricaProfilo } = useAuth()
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const [modalePassword, setModalePassword] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [email, setEmail] = useState(profilo?.email ?? '')
  const [emailErrore, setEmailErrore] = useState('')
  const [telefono, setTelefono] = useState(profilo?.telefono ?? '')

  const salvaFoto = useMutation({
    mutationFn: async (dataUrl: string | null) => {
      const { error } = await supabase.from('soci').update({ foto_url: dataUrl }).eq('id', profilo!.id)
      if (error) throw error
    },
    onSuccess: ricaricaProfilo,
    onError: (e: unknown) => window.alert('Salvataggio foto non riuscito: ' + messaggioErrore(e)),
  })

  // Le modifiche a "I tuoi dati" si salvano da sole (niente più bottone "Salva
  // modifiche", richiesto esplicitamente): un campo si aggiorna appena perde
  // il focus (o cambia, per select/date), senza bisogno di conferma password.
  const salvaCampo = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from('soci').update(patch).eq('id', profilo!.id)
      if (error) throw error
    },
    onSuccess: () => {
      ricaricaProfilo()
      setMsg({ tipo: 'ok', testo: 'Dati aggiornati.' })
    },
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: 'Salvataggio non riuscito: ' + messaggioErrore(e) }),
  })

  if (!profilo) return null

  function salvaTelefonoSeCambiato() {
    const nuovo = telefono.trim() || null
    if (nuovo === (profilo!.telefono ?? null)) return
    salvaCampo.mutate({ telefono: nuovo })
  }

  function salvaDataNascita(v: string) {
    salvaCampo.mutate({ data_nascita: v || null })
  }

  function salvaSport(v: string) {
    salvaCampo.mutate({ sport_preferito: v })
  }

  async function salvaEmailSeCambiata() {
    const emailCorrente = utente?.email ?? profilo!.email ?? ''
    const nuova = email.trim()
    if (nuova === emailCorrente) return
    if (!RE_EMAIL.test(nuova)) {
      setEmailErrore('Email non valida')
      return
    }
    setEmailErrore('')
    const { error: errSoci } = await supabase.from('soci').update({ email: nuova }).eq('id', profilo!.id)
    if (errSoci) {
      setMsg({ tipo: 'errore', testo: 'Salvataggio non riuscito: ' + errSoci.message })
      return
    }
    const { error: errAuth } = await supabase.auth.updateUser({ email: nuova })
    if (errAuth) {
      setMsg({ tipo: 'errore', testo: 'Cambio email non riuscito: ' + errAuth.message })
      return
    }
    await ricaricaProfilo()
    setMsg({
      tipo: 'ok',
      testo: `Abbiamo inviato un link di conferma a ${nuova}. Il cambio diventerà effettivo solo dopo aver cliccato il link nella tua casella di posta.`,
    })
  }

  return (
    <div>
      <div className="foto-profilo-sola">
        <div className="sez-foto-wrap">
          {profilo.foto_url ? (
            <img src={profilo.foto_url} alt="" className="sez-hero-av sez-hero-av-grande sez-hero-av-img" />
          ) : (
            <div className="sez-hero-av sez-hero-av-grande">{profilo.nome.charAt(0).toUpperCase()}</div>
          )}
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const dataUrl = await logoDaFile(file, 200, 4096)
                salvaFoto.mutate(dataUrl)
              } catch (err) {
                window.alert(messaggioErrore(err))
              }
            }}
          />
          <button
            type="button"
            className="sez-foto-cambia"
            title="Cambia foto profilo"
            onClick={() => fotoInputRef.current?.click()}
          >
            <IcoFotocamera />
          </button>
        </div>
        {profilo.foto_url && (
          <button type="button" className="sez-foto-rimuovi" onClick={() => salvaFoto.mutate(null)}>
            Rimuovi foto
          </button>
        )}
      </div>

      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <h2 className="club-sez-titolo">I tuoi dati</h2>
      </div>
      <div className="card form-verde">

        {/* Nome + Cognome separati con icona propria */}
        <div className="dati-coppia" style={{ marginTop: 0 }}>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </span>
            <div className="ro flex-1 min-w-0">{profilo.nome}</div>
          </div>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </span>
            <div className="ro flex-1 min-w-0">{profilo.cognome}</div>
          </div>
        </div>

        {/* Genere + Data nascita sulla stessa riga */}
        <div className="dati-coppia">
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>
            </span>
            <div className="ro flex-1 min-w-0">{etichettaGenere(profilo.genere)}</div>
          </div>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <input
              id="dati-data-nascita"
              type="date"
              max="9999-12-31"
              aria-label="Data di nascita"
              defaultValue={profilo.data_nascita ?? ''}
              onChange={(e) => salvaDataNascita(e.target.value)}
            />
          </div>
        </div>

        {/* Email + Telefono sulla stessa riga */}
        <div className="dati-coppia">
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
            </span>
            <div className="flex-1 min-w-0">
              <input
                id="dati-email"
                type="email"
                autoComplete="email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={salvaEmailSeCambiata}
              />
              {emailErrore && <p className={`mt-1 ${classiErrore}`}>{emailErrore}</p>}
            </div>
          </div>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </span>
            <input
              id="dati-telefono"
              type="tel"
              aria-label="Telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onBlur={salvaTelefonoSeCambiato}
            />
          </div>
        </div>

        {/* Sport preferito */}
        <div className="dati-riga">
          <span className="dati-riga-ico" aria-hidden="true">
            <svg width="20" height="14" viewBox="0 0 60 40" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="12" cy="13" r="9" strokeWidth="3.4" />
              <circle cx="30" cy="13" r="9" strokeWidth="3.4" />
              <circle cx="48" cy="13" r="9" strokeWidth="3.4" />
              <circle cx="21" cy="24" r="9" strokeWidth="3.4" />
              <circle cx="39" cy="24" r="9" strokeWidth="3.4" />
            </svg>
          </span>
          <select
            id="dati-sport"
            aria-label="Sport preferito"
            defaultValue={profilo.sport_preferito}
            onChange={(e) => salvaSport(e.target.value)}
          >
            <option value="entrambi">Padel e Calcio</option>
            <option value="padel">Padel</option>
            <option value="calcio">Calcio</option>
          </select>
        </div>

        {msg && (
          <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}
      </div>

      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <h2 className="club-sez-titolo">Password</h2>
      </div>
      <div className="card">
        <p className="sub" style={{ marginBottom: '0.75rem' }}>Cambia la password di accesso al tuo account</p>
        <button type="button" className="btn btn-secondario btn-sm" onClick={() => setModalePassword(true)}>
          Cambia password
        </button>
      </div>

      <SezionePreferenze socioId={profilo.id} sportPreferito={profilo.sport_preferito} />

      <SezioneLivelloGioco socioId={profilo.id} sportPreferito={profilo.sport_preferito} />

      <StoricoMovimenti />

      {modalePassword && <CambiaPasswordModal onChiudi={() => setModalePassword(false)} />}
    </div>
  )
}
