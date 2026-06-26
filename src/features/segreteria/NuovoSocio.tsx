import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore, classiOk } from '@/components/stili'

// Iscrizione di un nuovo giocatore da parte della segreteria.
// Come la v1: si crea l'account di login con un client Supabase "usa e getta"
// (persistSession:false) così NON si tocca la sessione dell'admin, poi si
// inserisce la scheda nella tabella `soci`.

const schema = z.object({
  nome: z.string().trim().min(1, 'Inserisci il nome'),
  cognome: z.string().trim().min(1, 'Inserisci il cognome'),
  email: z.string().trim().email('Email non valida'),
  data_nascita: z.string().min(1, 'Inserisci la data di nascita'),
  genere: z.enum(['M', 'F', 'altro']),
  sport_preferito: z.enum(['padel', 'calcio', 'entrambi']),
  telefono: z.string().trim().optional(),
  password: z.string().min(8, 'La password provvisoria deve avere almeno 8 caratteri'),
  is_allenatore: z.boolean(),
  e_allenatore: z.boolean(),
})

type DatiNuovoSocio = z.infer<typeof schema>

export default function NuovoSocio() {
  const queryClient = useQueryClient()
  const [erroreGenerale, setErroreGenerale] = useState('')
  const [successo, setSuccesso] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatiNuovoSocio>({
    resolver: zodResolver(schema),
    defaultValues: {
      genere: 'M',
      sport_preferito: 'entrambi',
      is_allenatore: false,
      e_allenatore: false,
    },
  })

  async function onSubmit(valori: DatiNuovoSocio) {
    setErroreGenerale('')
    setSuccesso('')

    const email = valori.email.toLowerCase()

    // Client temporaneo: crea l'account senza loggare l'admin fuori.
    const clientTemporaneo = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const { data, error } = await clientTemporaneo.auth.signUp({
      email,
      password: valori.password,
    })
    if (error) {
      setErroreGenerale('Creazione account non riuscita: ' + error.message)
      return
    }
    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      setErroreGenerale('Esiste già un account con questa email.')
      return
    }

    // Scheda socio (usa il client dell'admin, soggetto alle policy RLS).
    const { error: errIns } = await supabase.from('soci').insert({
      id: data.user.id,
      nome: valori.nome,
      cognome: valori.cognome,
      email,
      telefono: valori.telefono || null,
      data_nascita: valori.data_nascita,
      genere: valori.genere,
      sport_preferito: valori.sport_preferito,
      is_admin: false,
      is_allenatore: valori.is_allenatore,
      e_allenatore: valori.e_allenatore,
    })
    if (errIns) {
      setErroreGenerale(
        'Account di login creato, ma il salvataggio del profilo non è riuscito: ' +
          errIns.message,
      )
      return
    }

    queryClient.invalidateQueries({ queryKey: ['soci'] })
    reset()
    setSuccesso(
      `Giocatore iscritto! Comunica a ${valori.nome} email e password provvisoria per il primo accesso.`,
    )
  }

  return (
    <div>
      <div className="eyebrow">Iscrizione nuovo giocatore</div>
      <form onSubmit={handleSubmit(onSubmit)} className="card form-verde">
        <p className="sub mb-3">
          Crea l'accesso di un nuovo socio. L'account è attivo subito: comunicagli email e
          password provvisoria.
        </p>

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

          <Campo errore={errors.data_nascita?.message}>
            <label>Data di nascita</label>
            <input type="date" max="9999-12-31" className={classiInput} {...register('data_nascita')} />
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
              <option value="entrambi">Padel e Calcio</option>
              <option value="padel">Padel</option>
              <option value="calcio">Calcio</option>
            </select>
          </Campo>
          <Campo>
            <label>Telefono (facoltativo)</label>
            <input className={classiInput} {...register('telefono')} />
          </Campo>

          <Campo errore={errors.password?.message} wide>
            <label>Password provvisoria (min. 8 caratteri)</label>
            <input type="text" className={classiInput} {...register('password')} />
          </Campo>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <Spunta {...register('is_allenatore')}>
            <strong>Collaboratore</strong> (può creare e gestire i tornei)
          </Spunta>
          <Spunta {...register('e_allenatore')}>
            <strong>Istruttore</strong> (selezionabile negli slot allenamento)
          </Spunta>
        </div>

        {erroreGenerale && <p className={`mt-4 ${classiErrore}`}>{erroreGenerale}</p>}
        {successo && <p className={`mt-4 ${classiOk}`}>{successo}</p>}

        <button type="submit" className="btn btn-giallo btn-block mt-5" disabled={isSubmitting}>
          {isSubmitting ? 'Iscrizione in corso…' : 'Iscrivi giocatore'}
        </button>
      </form>
    </div>
  )
}

function Campo({
  children,
  errore,
  wide,
}: {
  children: React.ReactNode
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

// Riga con casella di spunta + etichetta (sostituisce la classe .check della v1).
// In React 19 il `ref` di react-hook-form passa attraverso {...props} all'input.
const Spunta = ({
  children,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>
}) => (
  <label className="flex items-center gap-2.5 text-sm text-ink-2">
    <input type="checkbox" className="h-4 w-4 shrink-0 accent-verde-600" {...props} />
    <span>{children}</span>
  </label>
)
