import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { classiErrore, classiInput, classiOk } from '@/components/stili'
import { costruisciPuntiGironi, numGironi, puntiBase, puntiGironiArray } from './gironi'
import { ricalcolaPuntiTorneo } from './punti'
import EditorPuntiTorneo from './EditorPuntiTorneo'
import { SPORT_LABEL } from './tipi'
import type { Componente, Incontro, PuntiSet, Squadra, Torneo } from './tipi'

// (Fase 6c) Modifica delle "regole" del torneo decise alla creazione:
// nome, date e i valori dei punti. Sport e formato restano fissi: cambiarli
// a torneo avviato romperebbe squadre e calendario già inseriti.
// (Fase 7b) I punti si modificano per girone (se più di uno); dopo il
// salvataggio i punti già assegnati vengono ricalcolati.
const schema = z
  .object({
    nome: z.string().trim().min(1, 'Inserisci il nome'),
    data_inizio: z.string().optional(),
    data_fine: z.string().optional(),
    durata_minuti: z.coerce.number().int().min(30).max(240),
    max_squadre: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().int().min(2).max(500).nullable(),
    ),
  })
  .refine((v) => !(v.data_inizio && v.data_fine && v.data_fine < v.data_inizio), {
    message: 'La data fine non può precedere la data inizio.',
    path: ['data_fine'],
  })

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export default function ImpostazioniTorneo({
  torneo,
  squadre,
  incontri,
  compBySquadra,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  compBySquadra: Record<string, Componente[]>
}) {
  const qc = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  // I punti stanno fuori da react-hook-form (con più gironi sono dinamici).
  const [base, setBase] = useState<PuntiSet>(() => puntiBase(torneo))
  const [gironi, setGironi] = useState<PuntiSet[]>(() => puntiGironiArray(torneo))
  const [puntiTocchi, setPuntiTocchi] = useState(false)

  const numeroGironi = numGironi(torneo)

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
      durata_minuti: torneo.durata_minuti ?? 90,
      max_squadre: torneo.max_squadre ?? null,
    },
  })

  // Apre la modale ripristinando i valori correnti del torneo.
  function apri() {
    setMsg(null)
    reset({
      nome: torneo.nome,
      data_inizio: (torneo.data_inizio ?? '').slice(0, 10),
      data_fine: (torneo.data_fine ?? '').slice(0, 10),
      durata_minuti: torneo.durata_minuti ?? 90,
      max_squadre: torneo.max_squadre ?? null,
    })
    setBase(puntiBase(torneo))
    setGironi(puntiGironiArray(torneo))
    setPuntiTocchi(false)
    setAperto(true)
  }

  async function onSubmit(v: FormOut) {
    setMsg(null)
    const puntiGironi = costruisciPuntiGironi(numeroGironi, gironi)
    const baseVal = numeroGironi > 1 ? (gironi[0] ?? base) : base
    const payload: Record<string, unknown> = {
      nome: v.nome,
      data_inizio: v.data_inizio || null,
      data_fine: v.data_fine || null,
      durata_minuti: v.durata_minuti,
      max_squadre: v.max_squadre ?? null,
      punti_iscrizione: baseVal.iscrizione,
      punti_vittoria: baseVal.vittoria,
      punti_torneo: baseVal.torneo,
    }
    if (puntiGironi) payload.punti_gironi = puntiGironi

    const { error } = await supabase.from('tornei').update(payload).eq('id', torneo.id)

    if (error) {
      const err = error as { code?: string; message?: string }
      const m = (err.message ?? '').toLowerCase()
      const mancaPuntiGironi = puntiGironi != null && (err.code === '42703' || m.includes('punti_gironi'))
      const mancaCol = err.code === '42703' || m.includes('punti_iscrizione')
      setMsg({
        tipo: 'errore',
        testo: mancaPuntiGironi
          ? 'Per i punti diversi per girone esegui prima lo script tappa7-punti-gironi.sql su Supabase.'
          : mancaCol
            ? 'Per i punti del torneo esegui prima lo script tappa6-pannello-admin.sql su Supabase.'
            : 'Salvataggio non riuscito: ' + messaggioErrore(error),
      })
      return
    }

    // Ricalcola i punti già assegnati con le nuove regole.
    const torneoNuovo: Torneo = {
      ...torneo,
      nome: v.nome,
      data_inizio: v.data_inizio || null,
      data_fine: v.data_fine || null,
      durata_minuti: v.durata_minuti,
      max_squadre: v.max_squadre ?? null,
      punti_iscrizione: baseVal.iscrizione,
      punti_vittoria: baseVal.vittoria,
      punti_torneo: baseVal.torneo,
      punti_gironi: puntiGironi ?? torneo.punti_gironi,
    }
    await ricalcolaPuntiTorneo(torneoNuovo, squadre, incontri, compBySquadra)

    qc.invalidateQueries({ queryKey: ['tornei'] })
    setPuntiTocchi(false)
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
                  <input type="date" max="9999-12-31" className={classiInput} {...register('data_inizio')} />
                </div>
                <div>
                  <label>Data fine (facoltativa)</label>
                  <input type="date" max="9999-12-31" className={classiInput} {...register('data_fine')} />
                  {errors.data_fine && (
                    <p className="mt-1 text-xs text-red-700">{errors.data_fine.message}</p>
                  )}
                </div>
              </div>

              <label>Durata partita</label>
              <select className={classiInput} {...register('durata_minuti')}>
                <option value={60}>1h (60 min)</option>
                <option value={75}>1h15 (75 min)</option>
                <option value={90}>1h30 (90 min)</option>
                <option value={105}>1h45 (105 min)</option>
                <option value={120}>2h (120 min)</option>
              </select>

              <label>Squadre massime (vuoto = illimitato)</label>
              <input
                type="number"
                min={2}
                max={500}
                placeholder="Es. 8"
                className={classiInput}
                {...register('max_squadre')}
              />
              {errors.max_squadre && (
                <p className="mt-1 text-xs text-red-700">{errors.max_squadre.message as string}</p>
              )}

              <div className="eyebrow" style={{ marginTop: 16 }}>
                Punti di questo torneo
              </div>
              <p className="sub mb-2">
                {numeroGironi > 1
                  ? 'Punti per ciascun girone. Il numero di gironi si cambia nella sezione “Gironi”.'
                  : 'Valgono solo per questo torneo.'}
              </p>
              <EditorPuntiTorneo
                torneo={torneo}
                numeroGironi={numeroGironi}
                base={base}
                setBase={(p) => {
                  setBase(p)
                  setPuntiTocchi(true)
                }}
                gironi={gironi}
                setGironi={(a) => {
                  setGironi(a)
                  setPuntiTocchi(true)
                }}
              />

              {msg && (
                <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="btn"
                  disabled={isSubmitting || (!isDirty && !puntiTocchi)}
                >
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
