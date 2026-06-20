import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { etichettaGenere } from '@/lib/formato'
import {
  classiBottone,
  classiEtichetta,
  classiErrore,
  classiInput,
  classiOk,
} from '@/components/stili'

// Solo questi campi sono modificabili dal socio (come nella v1).
// Nome, cognome, email e genere restano in sola lettura.
const schema = z.object({
  telefono: z.string().trim().optional(),
  data_nascita: z.string().optional(),
  sport_preferito: z.enum(['padel', 'calcio', 'entrambi']),
})

type DatiForm = z.infer<typeof schema>

// Mostra un dato in sola lettura.
function CampoSolaLettura({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div>
      <span className={classiEtichetta}>{etichetta}</span>
      <p className="rounded-lg bg-verde-50 px-3 py-2 text-sm text-ink-2">{valore}</p>
    </div>
  )
}

export default function DatiProfilo() {
  const { profilo, ricaricaProfilo } = useAuth()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
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
      // ricarico il profilo globale: testata e tab si aggiornano da soli
      await ricaricaProfilo()
    },
    onError: (e) => {
      setMsg({ tipo: 'errore', testo: 'Salvataggio non riuscito: ' + (e as Error).message })
    },
  })

  if (!profilo) return null

  function onSubmit(v: DatiForm) {
    setMsg(null)
    salva.mutate(v)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-verde-700/10 bg-superficie p-6 shadow-sm"
    >
      <h2 className="mb-4 font-display text-xl uppercase tracking-wide text-verde-800">
        I tuoi dati
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <CampoSolaLettura etichetta="Nome" valore={profilo.nome} />
        <CampoSolaLettura etichetta="Cognome" valore={profilo.cognome} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <CampoSolaLettura etichetta="Email" valore={profilo.email ?? '—'} />
        <CampoSolaLettura etichetta="Genere" valore={etichettaGenere(profilo.genere)} />
      </div>
      <p className="mb-5 text-xs text-ink-3">
        Nome, cognome, email e genere non sono modificabili da qui: per cambiarli
        contatta la segreteria.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={classiEtichetta}>Telefono</label>
          <input className={classiInput} {...register('telefono')} />
        </div>
        <div>
          <label className={classiEtichetta}>Data di nascita</label>
          <input type="date" className={classiInput} {...register('data_nascita')} />
        </div>
      </div>

      <div className="mb-5">
        <label className={classiEtichetta}>Sport preferito</label>
        <select className={classiInput} {...register('sport_preferito')}>
          <option value="entrambi">Entrambi</option>
          <option value="padel">Padel</option>
          <option value="calcio">Calcio</option>
        </select>
        {errors.sport_preferito && (
          <p className="mt-1 text-xs text-red-700">{errors.sport_preferito.message}</p>
        )}
      </div>

      {msg && (
        <p className={`mb-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
      )}

      <button type="submit" className={classiBottone} disabled={salva.isPending}>
        {salva.isPending ? 'Salvataggio…' : 'Salva modifiche'}
      </button>
    </form>
  )
}
