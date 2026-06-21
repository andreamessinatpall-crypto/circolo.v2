import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { classiErrore, classiInput, classiOk } from '@/components/stili'
import { SPORT_LABEL } from './tipi'
import type { Torneo } from './tipi'

// (Fase 6c) Modifica delle "regole" del torneo decise alla creazione:
// nome, date e i valori dei punti. Sport e formato restano fissi: cambiarli
// a torneo avviato romperebbe squadre e calendario già inseriti.
const schema = z
  .object({
    nome: z.string().trim().min(1, 'Inserisci il nome'),
    data_inizio: z.string().optional(),
    data_fine: z.string().optional(),
    punti_iscrizione: z.coerce.number().int().min(0, 'Numero ≥ 0'),
    punti_vittoria: z.coerce.number().int().min(0, 'Numero ≥ 0'),
    punti_torneo: z.coerce.number().int().min(0, 'Numero ≥ 0'),
  })
  .refine((v) => !(v.data_inizio && v.data_fine && v.data_fine < v.data_inizio), {
    message: 'La data fine non può precedere la data inizio.',
    path: ['data_fine'],
  })

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export default function ImpostazioniTorneo({ torneo }: { torneo: Torneo }) {
  const qc = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: torneo.nome,
      data_inizio: (torneo.data_inizio ?? '').slice(0, 10),
      data_fine: (torneo.data_fine ?? '').slice(0, 10),
      punti_iscrizione: torneo.punti_iscrizione ?? 0,
      punti_vittoria: torneo.punti_vittoria ?? 0,
      punti_torneo: torneo.punti_torneo ?? 0,
    },
  })

  // Apre la scheda a comparsa ripristinando i valori correnti del torneo.
  function apri() {
    setMsg(null)
    reset({
      nome: torneo.nome,
      data_inizio: (torneo.data_inizio ?? '').slice(0, 10),
      data_fine: (torneo.data_fine ?? '').slice(0, 10),
      punti_iscrizione: torneo.punti_iscrizione ?? 0,
      punti_vittoria: torneo.punti_vittoria ?? 0,
      punti_torneo: torneo.punti_torneo ?? 0,
    })
    setAperto(true)
  }

  async function onSubmit(v: FormOut) {
    setMsg(null)
    const { error } = await supabase
      .from('tornei')
      .update({
        nome: v.nome,
        data_inizio: v.data_inizio || null,
        data_fine: v.data_fine || null,
        punti_iscrizione: v.punti_iscrizione,
        punti_vittoria: v.punti_vittoria,
        punti_torneo: v.punti_torneo,
      })
      .eq('id', torneo.id)

    if (error) {
      const err = error as { code?: string; message?: string }
      const mancaCol =
        err.code === '42703' ||
        (err.message ?? '').toLowerCase().includes('punti_iscrizione')
      setMsg({
        tipo: 'errore',
        testo: mancaCol
          ? 'Per i punti del torneo esegui prima lo script tappa6-pannello-admin.sql su Supabase.'
          : 'Salvataggio non riuscito: ' + messaggioErrore(error),
      })
      return
    }
    qc.invalidateQueries({ queryKey: ['tornei'] })
    setMsg({ tipo: 'ok', testo: 'Modifiche salvate.' })
  }

  return (
    <>
      <button type="button" className="btn btn-secondario" onClick={apri}>
        Modifica regole del torneo
      </button>

      {aperto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAperto(false)}
        >
          <div
            className="card max-h-[90vh] w-full max-w-md overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="m-0 text-xl">Modifica regole del torneo</h2>
              <button
                type="button"
                className="border-0 bg-transparent px-1 text-2xl leading-none text-ink-2"
                title="Chiudi"
                onClick={() => setAperto(false)}
              >
                ×
              </button>
            </div>

            <p className="sub mt-2">
              Sport: <strong>{SPORT_LABEL[torneo.sport] ?? torneo.sport}</strong> · Formato fisso.
              Per cambiare sport crea un nuovo torneo.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
              <label>Nome torneo</label>
              <input className={classiInput} {...register('nome')} />
              {errors.nome && <p className="mt-1 text-xs text-red-700">{errors.nome.message}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Data inizio (facoltativa)</label>
                  <input type="date" className={classiInput} {...register('data_inizio')} />
                </div>
                <div>
                  <label>Data fine (facoltativa)</label>
                  <input type="date" className={classiInput} {...register('data_fine')} />
                  {errors.data_fine && (
                    <p className="mt-1 text-xs text-red-700">{errors.data_fine.message}</p>
                  )}
                </div>
              </div>

              <div className="eyebrow" style={{ marginTop: 16 }}>
                Punti di questo torneo
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label>Iscrizione</label>
                  <input
                    type="number"
                    min={0}
                    className={classiInput}
                    {...register('punti_iscrizione')}
                  />
                </div>
                <div>
                  <label>Partita vinta</label>
                  <input
                    type="number"
                    min={0}
                    className={classiInput}
                    {...register('punti_vittoria')}
                  />
                </div>
                <div>
                  <label>Vittoria torneo</label>
                  <input
                    type="number"
                    min={0}
                    className={classiInput}
                    {...register('punti_torneo')}
                  />
                </div>
              </div>

              {msg && (
                <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
              )}

              <div className="mt-4 flex gap-2">
                <button type="submit" className="btn" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? 'Salvataggio…' : 'Salva modifiche'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondario"
                  onClick={() => setAperto(false)}
                >
                  Chiudi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
