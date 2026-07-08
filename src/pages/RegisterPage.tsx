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
  consenso_privacy: z.literal(true, { error: "Devi accettare l'informativa privacy" }),
  consenso_termini: z.literal(true, { error: "Devi accettare i termini d'uso" }),
})

type DatiRegistrazione = z.infer<typeof schema>

type ModaleAperto = 'privacy' | 'termini' | null

export default function RegisterPage() {
  const navigate = useNavigate()
  const [erroreGenerale, setErroreGenerale] = useState('')
  const [successo, setSuccesso] = useState('')
  const [modaleAperto, setModaleAperto] = useState<ModaleAperto>(null)

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
    <div className="auth-page flex h-[100svh] flex-col items-center overflow-y-auto px-4 py-5 [overscroll-behavior-y:contain]">
      <div className="w-full max-w-[680px]">
      <AuthHero />

      <form onSubmit={handleSubmit(onSubmit)} className="card auth-card form-verde">
        <h1 className="text-2xl">Registrati</h1>
        <p className="sub mb-4 mt-1">
          Entra nel Club! Dopo aver confermato l'email la segreteria approverà il profilo.
        </p>

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
              <option value="entrambi">Tutti</option>
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
  return <span aria-hidden="true" style={{ color: '#fecaca', marginLeft: 2 }}>*</span>
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
