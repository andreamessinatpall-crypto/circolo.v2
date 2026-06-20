import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore, classiOk } from '@/components/stili'

const schema = z.object({
  nome: z.string().trim().min(1, 'Inserisci il nome'),
  cognome: z.string().trim().min(1, 'Inserisci il cognome'),
  email: z.string().trim().email('Email non valida'),
  telefono: z.string().trim().optional(),
  data_nascita: z.string().min(1, 'Inserisci la data di nascita'),
  genere: z.enum(['M', 'F', 'altro']),
  sport_preferito: z.enum(['padel', 'calcio', 'entrambi']),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
})

type DatiRegistrazione = z.infer<typeof schema>

export default function RegisterPage() {
  const [erroreGenerale, setErroreGenerale] = useState('')
  const [successo, setSuccesso] = useState('')

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
  }

  return (
    <div className="mx-auto mt-13 max-w-[680px] px-4 pb-16">
      <div className="auth-hero">
        <div className="auth-crest">⚽</div>
        <div className="auth-titolo">Circolo Sportivo</div>
        <div className="auth-claim">Crea il tuo account</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card auth-card">
        <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
          <Campo errore={errors.nome?.message}>
            <label>Nome</label>
            <input className={classiInput} {...register('nome')} />
          </Campo>
          <Campo errore={errors.cognome?.message}>
            <label>Cognome</label>
            <input className={classiInput} {...register('cognome')} />
          </Campo>

          <Campo errore={errors.email?.message} wide>
            <label>Email</label>
            <input type="email" className={classiInput} {...register('email')} />
          </Campo>

          <Campo>
            <label>Telefono (facoltativo)</label>
            <input className={classiInput} {...register('telefono')} />
          </Campo>
          <Campo errore={errors.data_nascita?.message}>
            <label>Data di nascita</label>
            <input type="date" className={classiInput} {...register('data_nascita')} />
          </Campo>

          <Campo>
            <label>Genere</label>
            <select className={classiInput} {...register('genere')}>
              <option value="M">Maschile</option>
              <option value="F">Femminile</option>
              <option value="altro">Altro</option>
            </select>
          </Campo>
          <Campo>
            <label>Sport preferito</label>
            <select className={classiInput} {...register('sport_preferito')}>
              <option value="entrambi">Entrambi</option>
              <option value="padel">Padel</option>
              <option value="calcio">Calcio</option>
            </select>
          </Campo>

          <Campo errore={errors.password?.message} wide>
            <label>Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className={classiInput}
              {...register('password')}
            />
          </Campo>
        </div>

        {erroreGenerale && <p className={`mt-4 ${classiErrore}`}>{erroreGenerale}</p>}
        {successo && <p className={`mt-4 ${classiOk}`}>{successo}</p>}

        <button type="submit" className="btn btn-oro btn-block mt-5" disabled={isSubmitting}>
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
  )
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
