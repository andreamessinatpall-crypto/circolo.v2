import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { puoGestireTornei } from '@/auth/ruoli'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { classiErrore, classiInput, classiOk } from '@/components/stili'
import { useTornei } from './datiTornei'
import type { DatiTornei } from './datiTornei'
import GestioneSquadre from './GestioneSquadre'
import { FORMATI_TORNEO, STATI_TORNEO } from './tipi'
import type { StatoTorneo, Torneo } from './tipi'

const iconaSport = (s: string) => (s === 'calcio' ? '⚽' : '🎾')

export default function TorneiPage() {
  const { profilo } = useAuth()
  const torneiQuery = useTornei()
  const [sel, setSel] = useState<string | null>(null)

  if (!profilo) return null
  if (torneiQuery.isLoading) return <p className="sub">Caricamento…</p>
  if (torneiQuery.error) {
    return (
      <div className="card text-ink-2">
        {mancaTabella(torneiQuery.error, 'tornei')
          ? 'Esegui lo script tappa3b1-tornei.sql su Supabase per attivare i tornei.'
          : 'Impossibile caricare: ' + messaggioErrore(torneiQuery.error)}
      </div>
    )
  }

  const gestore = puoGestireTornei(profilo)
  const d = torneiQuery.data!
  const visibili = gestore
    ? d.tornei
    : d.tornei.filter((t) => d.assegnati[String(t.id)]?.has(profilo.id))
  const attivi = visibili.filter((t) => t.stato !== 'concluso')

  const voci = attivi.map((t) => ({ id: String(t.id), label: iconaSport(t.sport) + ' ' + t.nome }))
  if (gestore) voci.push({ id: 'nuovo', label: '＋ Nuovo torneo' })

  if (voci.length === 0) {
    return <p className="sub">Non sei iscritto a nessun torneo al momento.</p>
  }

  const selCorrente = sel && voci.some((v) => v.id === sel) ? sel : voci[0].id
  const torneoSel = visibili.find((t) => String(t.id) === selCorrente)

  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Tornei">
        {voci.map((v) => (
          <button
            key={v.id}
            type="button"
            className={'subtab-btn' + (v.id === selCorrente ? ' attivo' : '')}
            onClick={() => setSel(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {selCorrente === 'nuovo' ? (
        <NuovoTorneo onCreato={(id) => setSel(String(id))} />
      ) : torneoSel ? (
        <DettaglioTorneo torneo={torneoSel} gestore={gestore} dati={d} />
      ) : null}
    </div>
  )
}

const schema = z
  .object({
    nome: z.string().trim().min(1, 'Inserisci il nome'),
    sport: z.enum(['padel', 'calcio']),
    formato: z.enum(['girone']),
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

// Zod converte i campi punti da stringa a numero: il tipo "in ingresso"
// (quello che l'utente digita) è diverso da quello "in uscita" (già numero).
type FormTorneoIn = z.input<typeof schema>
type FormTorneoOut = z.output<typeof schema>

function NuovoTorneo({ onCreato }: { onCreato: (id: number | string) => void }) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormTorneoIn, unknown, FormTorneoOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      sport: 'padel',
      formato: 'girone',
      punti_iscrizione: 0,
      punti_vittoria: 0,
      punti_torneo: 0,
    },
  })

  async function onSubmit(v: FormTorneoOut) {
    setMsg(null)
    const { data, error } = await supabase
      .from('tornei')
      .insert({
        nome: v.nome,
        sport: v.sport,
        formato: v.formato,
        data_inizio: v.data_inizio || null,
        data_fine: v.data_fine || null,
        creato_da: profilo!.id,
        punti_iscrizione: v.punti_iscrizione,
        punti_vittoria: v.punti_vittoria,
        punti_torneo: v.punti_torneo,
      })
      .select('id')
      .single()

    if (error) {
      const err = error as { code?: string; message?: string }
      const mancaCol =
        err.code === '42703' ||
        (err.message ?? '').toLowerCase().includes('punti_iscrizione') ||
        (err.message ?? '').toLowerCase().includes('data_fine')
      setMsg({
        tipo: 'errore',
        testo: mancaCol
          ? 'Per i punti del torneo esegui prima lo script tappa6-pannello-admin.sql su Supabase.'
          : mancaTabella(error, 'tornei')
            ? 'Esegui lo script tappa3b1-tornei.sql su Supabase.'
            : 'Creazione non riuscita: ' + messaggioErrore(error),
      })
      return
    }
    reset()
    qc.invalidateQueries({ queryKey: ['tornei'] })
    if (data?.id != null) onCreato(data.id)
  }

  return (
    <>
      <div className="eyebrow">Nuovo torneo</div>
      <form onSubmit={handleSubmit(onSubmit)} className="card">
        <label>Nome torneo</label>
        <input className={classiInput} {...register('nome')} />
        {errors.nome && <p className="mt-1 text-xs text-red-700">{errors.nome.message}</p>}

        <label>Sport</label>
        <select className={classiInput} {...register('sport')}>
          <option value="padel">Padel</option>
          <option value="calcio">Calcio</option>
        </select>

        <label>Formato</label>
        <select className={classiInput} {...register('formato')}>
          <option value="girone">Girone all'italiana</option>
        </select>

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
        <p className="sub mb-2">Valgono solo per questo torneo.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label>Iscrizione</label>
            <input type="number" min={0} className={classiInput} {...register('punti_iscrizione')} />
          </div>
          <div>
            <label>Partita vinta</label>
            <input type="number" min={0} className={classiInput} {...register('punti_vittoria')} />
          </div>
          <div>
            <label>Vittoria torneo</label>
            <input type="number" min={0} className={classiInput} {...register('punti_torneo')} />
          </div>
        </div>

        {msg && (
          <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}

        <button type="submit" className="btn mt-4" disabled={isSubmitting}>
          {isSubmitting ? 'Creazione…' : 'Crea torneo'}
        </button>
        <p className="sub mt-3">
          Il torneo nasce in <strong>Bozza</strong>. Dopo aver inserito le coppie/squadre,
          mettilo <strong>In corso</strong> per renderlo visibile ai soci.
        </p>
      </form>
    </>
  )
}

function DettaglioTorneo({
  torneo,
  gestore,
  dati,
}: {
  torneo: Torneo
  gestore: boolean
  dati: DatiTornei
}) {
  const { profilo } = useAuth()
  const qc = useQueryClient()

  const squadre = dati.perTorneoSquadre[String(torneo.id)] ?? []
  const assegnati = dati.assegnati[String(torneo.id)] ?? new Set<string>()

  const cambiaStato = useMutation({
    mutationFn: async (stato: StatoTorneo) => {
      const { error } = await supabase.from('tornei').update({ stato }).eq('id', torneo.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei'] }),
    onError: (e: unknown) => window.alert('Aggiornamento non riuscito: ' + messaggioErrore(e)),
  })

  const fmt = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  let periodo = ''
  if (torneo.data_inizio && torneo.data_fine)
    periodo = ' · dal ' + fmt(torneo.data_inizio) + ' al ' + fmt(torneo.data_fine)
  else if (torneo.data_inizio) periodo = ' · dal ' + fmt(torneo.data_inizio)
  else if (torneo.data_fine) periodo = ' · fino al ' + fmt(torneo.data_fine)

  return (
    <div className="card">
      <div className="amichevole-cap">
        <div>
          <div className="quando">{torneo.nome}</div>
          <div className="dove">
            {(FORMATI_TORNEO[torneo.formato] ?? torneo.formato) + periodo}
          </div>
        </div>
        <span className={'pill' + (torneo.stato !== 'in_corso' ? ' off' : '')}>
          {STATI_TORNEO[torneo.stato]}
        </span>
      </div>

      {gestore && (
        <div className="mt-4 flex items-center gap-2">
          <label className="m-0">Stato:</label>
          <select
            className={classiInput}
            style={{ width: 'auto' }}
            value={torneo.stato}
            onChange={(e) => cambiaStato.mutate(e.target.value as StatoTorneo)}
          >
            {Object.entries(STATI_TORNEO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="eyebrow" style={{ marginTop: 20 }}>
        Squadre iscritte
      </div>

      {gestore ? (
        <GestioneSquadre
          torneo={torneo}
          squadre={squadre}
          compBySquadra={dati.perSquadraComp}
          assegnati={assegnati}
        />
      ) : squadre.length === 0 ? (
        <p className="part-vuoto">
          Le squadre compariranno qui quando l'organizzatore le avrà inserite.
        </p>
      ) : (
        <div className="schede-griglia">
          {squadre.map((s) => {
            const comp = dati.perSquadraComp[String(s.id)] ?? []
            const miaSquadra = comp.some((c) => c.socio_id === profilo?.id)
            return (
              <div key={s.id} className="amichevole-riga">
                <div className="amichevole-cap">
                  <div className="quando">{s.nome}</div>
                  {miaSquadra && <span className="tag-riserva">La tua</span>}
                </div>
                <div className="dove mt-1">
                  {comp.length} giocator{comp.length === 1 ? 'e' : 'i'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="sub mt-4">
        Gironi, calendario e classifica in arrivo nelle prossime sotto-fasi.
      </p>
    </div>
  )
}
