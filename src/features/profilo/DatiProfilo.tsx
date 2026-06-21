import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { etichettaGenere } from '@/lib/formato'
import { classiErrore, classiOk } from '@/components/stili'
import CambiaPassword from './CambiaPassword'

// Solo questi campi sono modificabili dal socio (come nella v1).
const schema = z.object({
  telefono: z.string().trim().optional(),
  data_nascita: z.string().optional(),
  sport_preferito: z.enum(['padel', 'calcio', 'entrambi']),
})

type DatiForm = z.infer<typeof schema>

export default function DatiProfilo() {
  const { profilo, ricaricaProfilo } = useAuth()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  const {
    register,
    handleSubmit,
  } = useForm<DatiForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      telefono: profilo?.telefono ?? '',
      data_nascita: profilo?.data_nascita ?? '',
      sport_preferito: profilo?.sport_preferito ?? 'entrambi',
    },
  })

  const salva = useMutation({
    mutationFn: async (v: DatiForm) => {
      if (!profilo) throw new Error('Profilo non disponibile')
      const { error } = await supabase
        .from('soci')
        .update({
          telefono: v.telefono?.trim() || null,
          data_nascita: v.data_nascita || null,
          sport_preferito: v.sport_preferito,
        })
        .eq('id', profilo.id)
      if (error) throw error
    },
    onSuccess: async () => {
      setMsg({ tipo: 'ok', testo: 'Dati aggiornati.' })
      await ricaricaProfilo()
    },
    onError: (e) => {
      setMsg({ tipo: 'errore', testo: 'Salvataggio non riuscito: ' + (e as Error).message })
    },
  })

  if (!profilo) return null

  const iniziali = (profilo.nome[0] ?? '') + (profilo.cognome[0] ?? '')

  return (
    <div>
      <div className="sez-hero">
        <div className="sez-hero-top">
          <div className="sez-hero-av">{iniziali.toUpperCase() || '—'}</div>
          <div className="sez-hero-info">
            <div className="sez-hero-eyebrow">Il tuo profilo</div>
            <h2>
              {profilo.nome} {profilo.cognome}
            </h2>
          </div>
        </div>
      </div>

      <div className="eyebrow">I tuoi dati</div>
      <form
        onSubmit={handleSubmit((v) => {
          setMsg(null)
          salva.mutate(v)
        })}
        className="card"
      >
        <p className="mb-2 text-sm text-ink-2">
          Nome, cognome, email e genere non sono modificabili: per correggerli contatta la
          segreteria.
        </p>

        <label>Nome</label>
        <div className="ro">{profilo.nome}</div>
        <label>Cognome</label>
        <div className="ro">{profilo.cognome}</div>
        <label>Email</label>
        <div className="ro">{profilo.email ?? '—'}</div>
        <label>Genere</label>
        <div className="ro">{etichettaGenere(profilo.genere)}</div>

        <label htmlFor="dati-telefono">Telefono</label>
        <input id="dati-telefono" type="tel" {...register('telefono')} />

        <label htmlFor="dati-data-nascita">Data di nascita</label>
        <input id="dati-data-nascita" type="date" {...register('data_nascita')} />

        <label htmlFor="dati-sport">Sport preferito</label>
        <select id="dati-sport" {...register('sport_preferito')}>
          <option value="entrambi">Padel e Calcio</option>
          <option value="padel">Solo Padel</option>
          <option value="calcio">Solo Calcio</option>
        </select>

        {msg && (
          <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}

        <button type="submit" className="btn mt-4" disabled={salva.isPending}>
          {salva.isPending ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
      </form>

      <CambiaPassword />
    </div>
  )
}
