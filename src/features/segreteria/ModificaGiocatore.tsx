import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { classiInput, classiErrore } from '@/components/stili'
import type { SocioAdmin } from './datiSoci'

// (Fase 8b) Modifica dei dati e dei ruoli di un giocatore esistente.
// Per scelta non si può promuovere/declassare ad AMMINISTRATORE dall'app
// (come per l'iscrizione): si gestisce solo da Supabase.

const schema = z.object({
  nome: z.string().trim().min(1, 'Il nome non può essere vuoto'),
  cognome: z.string().trim().min(1, 'Il cognome non può essere vuoto'),
  email: z.string().trim().email('Email non valida'),
  genere: z.enum(['', 'M', 'F', 'altro']),
  sport_preferito: z.enum(['padel', 'calcio', 'entrambi']),
  telefono: z.string().trim().optional(),
  data_nascita: z.string().optional(),
  is_allenatore: z.boolean(),
  e_allenatore: z.boolean(),
})

type DatiModifica = z.infer<typeof schema>

// "Altro" della v1 → "altro" della v2 per far combaciare le opzioni del select.
function normalizzaGenere(g: string | null): '' | 'M' | 'F' | 'altro' {
  if (g === 'M' || g === 'F') return g
  if (g) return 'altro'
  return ''
}

export default function ModificaGiocatore({
  socio,
  onChiudi,
}: {
  socio: SocioAdmin
  onChiudi: () => void
}) {
  const qc = useQueryClient()
  const [errore, setErrore] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatiModifica>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: socio.nome ?? '',
      cognome: socio.cognome ?? '',
      email: socio.email ?? '',
      genere: normalizzaGenere(socio.genere),
      sport_preferito: (['padel', 'calcio', 'entrambi'].includes(socio.sport_preferito)
        ? socio.sport_preferito
        : 'entrambi') as DatiModifica['sport_preferito'],
      telefono: socio.telefono ?? '',
      data_nascita: socio.data_nascita ?? '',
      is_allenatore: !!socio.is_allenatore,
      e_allenatore: !!socio.e_allenatore,
    },
  })

  async function onSubmit(v: DatiModifica) {
    setErrore('')
    const { error } = await supabase
      .from('soci')
      .update({
        nome: v.nome,
        cognome: v.cognome,
        email: v.email.toLowerCase(),
        genere: v.genere || null,
        sport_preferito: v.sport_preferito,
        telefono: v.telefono || null,
        data_nascita: v.data_nascita || null,
        is_allenatore: v.is_allenatore,
        e_allenatore: v.e_allenatore,
      })
      .eq('id', socio.id)
    if (error) {
      setErrore('Salvataggio non riuscito: ' + error.message)
      return
    }
    qc.invalidateQueries({ queryKey: ['soci'] })
    onChiudi()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain bg-black/40 p-4"
      onClick={onChiudi}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card my-auto w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="m-0 text-xl">Modifica giocatore</h2>
          <button
            type="button"
            className="border-0 bg-transparent px-1 text-2xl leading-none text-ink-2"
            title="Chiudi"
            onClick={onChiudi}
          >
            ×
          </button>
        </div>
        <p className="sub mb-3 mt-1">Puoi modificare i dati e i ruoli del giocatore.</p>

        <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
          <div>
            <label>Nome</label>
            <input className={classiInput} {...register('nome')} />
            {errors.nome && <p className="mt-1 text-xs text-red-700">{errors.nome.message}</p>}
          </div>
          <div>
            <label>Cognome</label>
            <input className={classiInput} {...register('cognome')} />
            {errors.cognome && <p className="mt-1 text-xs text-red-700">{errors.cognome.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label>Email anagrafica</label>
            <input type="email" className={classiInput} {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
            <p className="mt-1 text-xs text-ink-3">
              È l'email anagrafica. L'email di accesso si cambia solo da Supabase o dal giocatore.
            </p>
          </div>

          <div>
            <label>Genere</label>
            <select className={classiInput} {...register('genere')}>
              <option value="">— Seleziona —</option>
              <option value="M">Maschile</option>
              <option value="F">Femminile</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          <div>
            <label>Sport preferito</label>
            <select className={classiInput} {...register('sport_preferito')}>
              <option value="entrambi">Padel e Calcio</option>
              <option value="padel">Solo Padel</option>
              <option value="calcio">Solo Calcio</option>
            </select>
          </div>

          <div>
            <label>Telefono</label>
            <input type="tel" className={classiInput} {...register('telefono')} />
          </div>
          <div>
            <label>Data di nascita</label>
            <input type="date" className={classiInput} {...register('data_nascita')} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <label className="flex items-center gap-2.5 text-sm text-ink-2">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-verde-600"
              {...register('is_allenatore')}
            />
            <span>
              <strong>Collaboratore</strong> (può creare e gestire i tornei)
            </span>
          </label>
          <label className="flex items-center gap-2.5 text-sm text-ink-2">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-verde-600"
              {...register('e_allenatore')}
            />
            <span>
              <strong>Istruttore</strong> (selezionabile negli slot allenamento)
            </span>
          </label>
        </div>

        {errore && <p className={`mt-4 ${classiErrore}`}>{errore}</p>}

        <div className="mt-5 flex gap-2">
          <button type="submit" className="btn" disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio…' : 'Salva'}
          </button>
          <button type="button" className="btn btn-secondario" onClick={onChiudi}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}
