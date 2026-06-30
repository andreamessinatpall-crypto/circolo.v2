import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore, classiOk } from '@/components/stili'
import AuthHero from './AuthHero'
import FooterLegale from '@/components/legale/FooterLegale'
import ModaleLegale from '@/components/legale/ModaleLegale'
import { PrivacyContent, TerminiContent } from '@/components/legale/DocumentiLegali'

const schema = z.object({
  nome: z.string().trim().min(1, 'Inserisci il nome'),
  cognome: z.string().trim().min(1, 'Inserisci il cognome'),
  email: z.string().trim().email('Email non valida'),
  telefono: z.string().trim().optional(),
  data_nascita: z.string().min(1, 'Inserisci la data di nascita').refine((val) => {
    const diff = Date.now() - new Date(val).getTime()
    const anni = diff / (1000 * 60 * 60 * 24 * 365.25)
    return anni >= 14
  }, { message: 'Devi avere almeno 14 anni per iscriverti (art. 8 GDPR)' }),
  genere: z.enum(['M', 'F', 'altro']),
  sport_preferito: z.enum(['padel', 'calcio', 'entrambi']),
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
  consenso_privacy: z.literal(true, {
    errorMap: () => ({ message: "Devi accettare l'informativa privacy" }),
  }),
  consenso_termini: z.literal(true, {
    errorMap: () => ({ message: "Devi accettare i termini d'uso" }),
  }),
})

type DatiRegistrazione = z.infer<typeof schema>

type ModaleAperto = 'privacy' | 'termini' | null

export default function RegisterPage() {
  const navigate = useNavigate()
  const [erroreGenerale, setErroreGenerale] = useState('')
  const [successo, setSuccesso] = useState('')
  const [modaleAperto, setModaleAperto] = useState<ModaleAperto>(null)

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
    if (error) setOauthErrore('Registrazione non riuscita: ' + error.message)
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatiRegistrazione>({
    resolver: zodResolver(schema),
    defaultValues: { genere: 'M', sport_preferito: 'entrambi' },
  })

  async function onSubmit(valori: DatiRegistrazione) {
    setErroreGenerale('')
    setSuccesso('')

    const { data, error } = await supabase.auth.signUp({
      email: valori.email.toLowerCase(),
      password: valori.password,
      options: {
        data: {
          nome: valori.nome,
          cognome: valori.cognome,
          telefono: valori.telefono || null,
          sport_preferito: valori.sport_preferito,
          data_nascita: valori.data_nascita,
          genere: valori.genere,
          auto_registrazione: true,
        },
      },
    })

    if (error) {
      setErroreGenerale('Registrazione non riuscita: ' + error.message)
      return
    }
    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      setErroreGenerale('Esiste già un account con questa email. Prova ad accedere.')
      return
    }

    if (data.session) return // già loggato: l'AuthProvider procede

    reset()
    setSuccesso(
      "Registrazione inviata! Ti abbiamo mandato un'email di conferma. Dopo averla confermata, accedi: il profilo resterà in attesa di approvazione dalla segreteria.",
    )
    setTimeout(() => navigate('/login'), 4000)
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-[680px]">
      <AuthHero />

      <form onSubmit={handleSubmit(onSubmit)} className="card auth-card">
        <h1 className="text-2xl">Registrati</h1>
        <p className="sub mb-4 mt-1">
          Entra nel Club! Dopo aver confermato l'email la segreteria approverà il profilo.
        </p>

        {/* ── Registrazione rapida con provider OAuth ── */}
        <div className="oauth-area">
          <button
            type="button"
            className="oauth-btn oauth-btn-google"
            onClick={() => signInWithOAuth('google')}
            disabled={oauthInCorso}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Registrati con Google
          </button>
          <button
            type="button"
            className="oauth-btn oauth-btn-apple"
            onClick={() => signInWithOAuth('apple')}
            disabled={oauthInCorso}
          >
            <svg width="16" height="18" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.8 135.4-318.1 268.1-318.1 69.6 0 127.6 45.8 170.5 45.8 40.7 0 106.3-48.3 185.5-48.3zM549.6 103c28.6-36.8 50-87.5 50-138.2 0-7.1-.6-14.3-1.9-20.1-47.6 1.9-104.3 31.8-138.6 73.1-27.3 31.8-51.6 82.5-51.6 133.9 0 7.5 1.3 15 1.9 17.5 3.2.6 8.4 1.3 13.6 1.3 42.8 0 96.8-28.6 126.6-67.5z"/>
            </svg>
            Registrati con Apple
          </button>
        </div>

        {oauthErrore && <p className={`mt-3 ${classiErrore}`}>{oauthErrore}</p>}

        <div className="oauth-divider">oppure registrati con email</div>

        <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
          <Campo errore={errors.nome?.message}>
            <label>Nome <Obbligatorio /></label>
            <input className={classiInput} {...register('nome')} />
          </Campo>
          <Campo errore={errors.cognome?.message}>
            <label>Cognome <Obbligatorio /></label>
            <input className={classiInput} {...register('cognome')} />
          </Campo>

          <Campo errore={errors.email?.message} wide>
            <label>Email <Obbligatorio /></label>
            <input type="email" className={classiInput} {...register('email')} />
          </Campo>

          <Campo>
            <label>Telefono</label>
            <input className={classiInput} {...register('telefono')} />
          </Campo>
          <Campo errore={errors.data_nascita?.message}>
            <label>Data di nascita <Obbligatorio /></label>
            <input type="date" max="9999-12-31" className={classiInput} {...register('data_nascita')} />
          </Campo>

          <Campo>
            <label>Genere <Obbligatorio /></label>
            <select className={classiInput} {...register('genere')}>
              <option value="M">Maschile</option>
              <option value="F">Femminile</option>
              <option value="altro">Altro</option>
            </select>
          </Campo>
          <Campo>
            <label>Sport preferito <Obbligatorio /></label>
            <select className={classiInput} {...register('sport_preferito')}>
              <option value="entrambi">Entrambi</option>
              <option value="padel">Padel</option>
              <option value="calcio">Calcio</option>
            </select>
          </Campo>

          <Campo errore={errors.password?.message} wide>
            <label>Password <Obbligatorio /></label>
            <input
              type="password"
              autoComplete="new-password"
              className={classiInput}
              {...register('password')}
            />
          </Campo>
        </div>

        {/* Consensi GDPR */}
        <div className="mt-2">
          <div className="checkbox-legale-riga">
            <input
              type="checkbox"
              id="consenso_privacy"
              {...register('consenso_privacy')}
            />
            <label htmlFor="consenso_privacy" className="checkbox-legale-testo">
              Ho letto e accetto l'
              <button type="button" onClick={() => setModaleAperto('privacy')}>
                Informativa Privacy
              </button>
              {' '}(obbligatorio)
            </label>
          </div>
          {errors.consenso_privacy && (
            <p className="checkbox-legale-errore">{errors.consenso_privacy.message}</p>
          )}

          <div className="checkbox-legale-riga">
            <input
              type="checkbox"
              id="consenso_termini"
              {...register('consenso_termini')}
            />
            <label htmlFor="consenso_termini" className="checkbox-legale-testo">
              Accetto i{' '}
              <button type="button" onClick={() => setModaleAperto('termini')}>
                Termini d'uso
              </button>
              {' '}(obbligatorio)
            </label>
          </div>
          {errors.consenso_termini && (
            <p className="checkbox-legale-errore">{errors.consenso_termini.message}</p>
          )}
        </div>

        {erroreGenerale && <p className={`mt-4 ${classiErrore}`}>{erroreGenerale}</p>}
        {successo && <p className={`mt-4 ${classiOk}`}>{successo}</p>}

        <button type="submit" className="btn btn-oro btn-riflesso btn-block mt-5" disabled={isSubmitting}>
          {isSubmitting ? 'Invio in corso…' : 'Crea account'}
        </button>

        <p className="mt-5 text-center text-sm text-ink-2">
          Hai già un account?{' '}
          <Link to="/login" className="font-semibold text-verde-600 hover:underline">
            Accedi
          </Link>
        </p>
      </form>
      </div>

      {modaleAperto === 'privacy' && (
        <ModaleLegale titolo="Informativa Privacy" onChiudi={() => setModaleAperto(null)}>
          <PrivacyContent />
        </ModaleLegale>
      )}
      {modaleAperto === 'termini' && (
        <ModaleLegale titolo="Termini d'uso" onChiudi={() => setModaleAperto(null)}>
          <TerminiContent />
        </ModaleLegale>
      )}

      <FooterLegale />
    </div>
  )
}

function Obbligatorio() {
  return <span aria-hidden="true" style={{ color: 'var(--errore)', marginLeft: 2 }}>*</span>
}

function Campo({
  children,
  errore,
  wide,
}: {
  children: ReactNode
  errore?: string
  wide?: boolean
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      {children}
      {errore && <p className="mt-1 text-xs text-red-700">{errore}</p>}
    </div>
  )
}
