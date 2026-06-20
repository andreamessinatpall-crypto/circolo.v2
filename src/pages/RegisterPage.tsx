import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import {
  classiBottone,
  classiCard,
  classiEtichetta,
  classiErrore,
  classiInput,
  classiOk,
} from '@/components/stili'

// Regole di validazione del modulo. Zod controlla i dati prima dell'invio
// e React Hook Form mostra i messaggi accanto ai campi sbagliati.
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

    if (data.session) {
      // Conferma email disattivata: l'utente è già loggato e l'AuthProvider procede.
      return
    }
    // Conferma email attiva: deve confermare prima di accedere.
    reset()
    setSuccesso(
      "Registrazione inviata! Ti abbiamo mandato un'email di conferma. Dopo averla confermata, accedi: il profilo resterà in attesa di approvazione dalla segreteria.",
    )
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

      <form onSubmit={handleSubmit(onSubmit)} className={classiCard}>
        <h2 className="mb-5 font-display text-xl uppercase tracking-wide text-ink">
          Registrati
        </h2>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={classiEtichetta}>Nome</label>
            <input className={classiInput} {...register('nome')} />
            {errors.nome && (
              <p className="mt-1 text-xs text-red-700">{errors.nome.message}</p>
            )}
          </div>
          <div>
            <label className={classiEtichetta}>Cognome</label>
            <input className={classiInput} {...register('cognome')} />
            {errors.cognome && (
              <p className="mt-1 text-xs text-red-700">{errors.cognome.message}</p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className={classiEtichetta}>Email</label>
          <input type="email" className={classiInput} {...register('email')} />
          {errors.email && (
            <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={classiEtichetta}>Telefono (facoltativo)</label>
            <input className={classiInput} {...register('telefono')} />
          </div>
          <div>
            <label className={classiEtichetta}>Data di nascita</label>
            <input type="date" className={classiInput} {...register('data_nascita')} />
            {errors.data_nascita && (
              <p className="mt-1 text-xs text-red-700">{errors.data_nascita.message}</p>
            )}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={classiEtichetta}>Genere</label>
            <select className={classiInput} {...register('genere')}>
              <option value="M">Maschile</option>
              <option value="F">Femminile</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          <div>
            <label className={classiEtichetta}>Sport preferito</label>
            <select className={classiInput} {...register('sport_preferito')}>
              <option value="entrambi">Entrambi</option>
              <option value="padel">Padel</option>
              <option value="calcio">Calcio</option>
            </select>
          </div>
        </div>

        <div className="mb-5">
          <label className={classiEtichetta}>Password</label>
          <input
            type="password"
            autoComplete="new-password"
            className={classiInput}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-700">{errors.password.message}</p>
          )}
        </div>

        {erroreGenerale && <p className={`mb-4 ${classiErrore}`}>{erroreGenerale}</p>}
        {successo && <p className={`mb-4 ${classiOk}`}>{successo}</p>}

        <button type="submit" className={classiBottone} disabled={isSubmitting}>
          {isSubmitting ? 'Invio in corso…' : 'Crea account'}
        </button>

        <p className="mt-5 text-center text-sm text-ink-2">
          Hai già un account?{' '}
          <Link to="/login" className="font-semibold text-verde-700 hover:underline">
            Accedi
          </Link>
        </p>
      </form>
    </div>
  )
}
