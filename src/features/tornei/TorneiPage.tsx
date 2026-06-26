import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import GestioneGironi from './GestioneGironi'
import GestioneCalendario from './GestioneCalendario'
import ClassificaTorneo from './ClassificaTorneo'
import PodioTorneo from './PodioTorneo'
import Risultati from './Risultati'
import RiepilogoPunti from './RiepilogoPunti'
import ImpostazioniTorneo from './ImpostazioniTorneo'
import EditorPuntiTorneo from './EditorPuntiTorneo'
import Sezione from '@/components/Sezione'
import { costruisciPuntiGironi, nomeGirone, numGironi } from './gironi'
import { FORMATI_TORNEO, STATI_TORNEO } from './tipi'
import type { PuntiSet, StatoTorneo, Torneo } from './tipi'

// Terna di punti tutta a zero (default dei form).
const puntiZero = (): PuntiSet => ({ iscrizione: 0, vittoria: 0, torneo: 0 })

const iconaSport = (s: string) => (s === 'calcio' ? '⚽' : '🎾')

export default function TorneiPage() {
  const { profilo } = useAuth()
  const torneiQuery = useTornei()
  const [sel, setSel] = useState<string | null>(null)
  // null = lista conclusi, stringa = id del concluso aperto
  const [selConcluso, setSelConcluso] = useState<string | null>(null)

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

  const attivi   = visibili.filter((t) => t.stato !== 'concluso')
  const conclusi = visibili.filter((t) => t.stato === 'concluso')

  // Voci nav: tornei attivi + tab fissa "Conclusi" + "Nuovo" per gestori.
  const voci = attivi.map((t) => ({ id: String(t.id), label: iconaSport(t.sport) + ' ' + t.nome }))
  if (gestore) voci.push({ id: 'nuovo', label: '＋ Nuovo torneo' })

  const mostraConclusi = sel === '__conclusi__'
  const selCorrente = sel && (mostraConclusi || voci.some((v) => v.id === sel))
    ? sel
    : voci[0]?.id ?? '__conclusi__'
  const torneoSel = attivi.find((t) => String(t.id) === selCorrente)

  // Torneo concluso aperto nel dettaglio.
  const torneoConcluso = conclusi.find((t) => String(t.id) === selConcluso)

  const fmt = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

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
        {/* Tab fissa Conclusi — sempre visibile se ci sono conclusi o se è admin */}
        {(conclusi.length > 0 || gestore) && (
          <button
            type="button"
            className={'subtab-btn concluso' + (mostraConclusi ? ' attivo' : '')}
            onClick={() => { setSel('__conclusi__'); setSelConcluso(null) }}
          >
            Conclusi
          </button>
        )}
      </nav>

      {mostraConclusi ? (
        torneoConcluso ? (
          /* Dettaglio torneo concluso */
          <div>
            <button
              type="button"
              className="btn btn-secondario btn-mini !mt-0 mb-4"
              onClick={() => setSelConcluso(null)}
            >
              ← Tutti i conclusi
            </button>
            <DettaglioTorneo torneo={torneoConcluso} gestore={gestore} dati={d} />
          </div>
        ) : (
          /* Lista tornei conclusi */
          conclusi.length === 0 ? (
            <p className="sub">
              {gestore
                ? 'Nessun torneo concluso. Quando un torneo viene marcato "Concluso" apparirà qui.'
                : 'Non hai partecipato a nessun torneo concluso.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {conclusi.map((t) => {
                let periodo = ''
                if (t.data_inizio && t.data_fine) periodo = fmt(t.data_inizio) + ' – ' + fmt(t.data_fine)
                else if (t.data_inizio) periodo = 'dal ' + fmt(t.data_inizio)
                else if (t.data_fine) periodo = 'fino al ' + fmt(t.data_fine)
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="torneo-concluso-riga"
                    onClick={() => setSelConcluso(String(t.id))}
                  >
                    <span className="torneo-concluso-nome">
                      {iconaSport(t.sport)} {t.nome}
                    </span>
                    {periodo && <span className="torneo-concluso-periodo">{periodo}</span>}
                    <span className="torneo-concluso-arrow">›</span>
                  </button>
                )
              })}
            </div>
          )
        )
      ) : selCorrente === 'nuovo' ? (
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
    numero_gironi: z.coerce.number().int().min(1).max(12),
  })
  .refine((v) => !(v.data_inizio && v.data_fine && v.data_fine < v.data_inizio), {
    message: 'La data fine non può precedere la data inizio.',
    path: ['data_fine'],
  })

// Zod converte numero_gironi da stringa a numero: il tipo "in ingresso"
// (quello che l'utente digita) è diverso da quello "in uscita" (già numero).
type FormTorneoIn = z.input<typeof schema>
type FormTorneoOut = z.output<typeof schema>

function NuovoTorneo({ onCreato }: { onCreato: (id: number | string) => void }) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  // I punti stanno fuori da react-hook-form: con più gironi sono dinamici
  // (una terna per girone). base = terna unica usata con un solo girone.
  const [base, setBase] = useState<PuntiSet>(puntiZero)
  const [gironi, setGironi] = useState<PuntiSet[]>(() => Array.from({ length: 12 }, puntiZero))

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormTorneoIn, unknown, FormTorneoOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      sport: 'padel',
      formato: 'girone',
      numero_gironi: 1,
    },
  })

  const numeroGironiRaw = useWatch({ control, name: 'numero_gironi' })
  const numeroGironi = Math.min(12, Math.max(1, Number(numeroGironiRaw) || 1))

  async function onSubmit(v: FormTorneoOut) {
    setMsg(null)
    // Con più gironi: i punti base diventano quelli del 1º girone (fallback) e
    // si salva la mappa punti_gironi; con un solo girone si usa solo la terna base.
    const puntiGironi = costruisciPuntiGironi(v.numero_gironi, gironi)
    const puntiBaseVal = v.numero_gironi > 1 ? (gironi[0] ?? puntiZero()) : base
    const payload: Record<string, unknown> = {
      nome: v.nome,
      sport: v.sport,
      formato: v.formato,
      data_inizio: v.data_inizio || null,
      data_fine: v.data_fine || null,
      creato_da: profilo!.id,
      numero_gironi: v.numero_gironi,
      punti_iscrizione: puntiBaseVal.iscrizione,
      punti_vittoria: puntiBaseVal.vittoria,
      punti_torneo: puntiBaseVal.torneo,
    }
    if (puntiGironi) payload.punti_gironi = puntiGironi

    const { data, error } = await supabase.from('tornei').insert(payload).select('id').single()

    if (error) {
      const err = error as { code?: string; message?: string }
      const m = (err.message ?? '').toLowerCase()
      const mancaPuntiGironi = puntiGironi != null && (err.code === '42703' || m.includes('punti_gironi'))
      const mancaCol =
        err.code === '42703' || m.includes('punti_iscrizione') || m.includes('data_fine')
      setMsg({
        tipo: 'errore',
        testo: mancaPuntiGironi
          ? 'Per i punti diversi per girone esegui prima lo script tappa7-punti-gironi.sql su Supabase.'
          : mancaCol
            ? 'Per i punti del torneo esegui prima lo script tappa6-pannello-admin.sql su Supabase.'
            : mancaTabella(error, 'tornei')
              ? 'Esegui lo script tappa3b1-tornei.sql su Supabase.'
              : 'Creazione non riuscita: ' + messaggioErrore(error),
      })
      return
    }
    reset()
    setBase(puntiZero())
    setGironi(Array.from({ length: 12 }, puntiZero))
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

        <label>Numero di gironi</label>
        <select className={classiInput} {...register('numero_gironi')}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((i) => (
            <option key={i} value={i}>
              {i === 1 ? 'Girone unico' : i + ' gironi'}
            </option>
          ))}
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
        <p className="sub mb-2">
          {numeroGironi > 1
            ? 'Valgono solo per questo torneo. Con più gironi puoi dare punti diversi a ogni girone.'
            : 'Valgono solo per questo torneo.'}
        </p>
        <EditorPuntiTorneo
          torneo={{ nomi_gironi: null }}
          numeroGironi={numeroGironi}
          base={base}
          setBase={setBase}
          gironi={gironi}
          setGironi={setGironi}
        />

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
  const qc = useQueryClient()
  const { profilo } = useAuth()
  // Sotto-schede del dettaglio (solo per gli organizzatori; i giocatori vedono
  // direttamente "Risultati e Classifica").
  const [scheda, setScheda] = useState<'gestione' | 'risultati'>('gestione')
  // (Fase 7c) Girone visualizzato in "Risultati e Classifica" (null = tutti).
  const [gironeSel, setGironeSel] = useState<number | null>(null)

  const squadre = dati.perTorneoSquadre[String(torneo.id)] ?? []
  const incontri = dati.perTorneoIncontri[String(torneo.id)] ?? []
  const assegnati = dati.assegnati[String(torneo.id)] ?? new Set<string>()
  const n = numGironi(torneo)

  // (Fase 6e) La squadra/coppia del socio in questo torneo (per il bottone "Sfida").
  const miaSquadraId = squadre.find((s) =>
    (dati.perSquadraComp[String(s.id)] ?? []).some((c) => c.socio_id === profilo?.id),
  )?.id

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

  // Contenuto della scheda "Gestione torneo" (solo organizzatori).
  // Ordine: prima le squadre iscritte, poi i gironi, infine la modifica regole.
  const schedaGestione = (
    <div>
      <Sezione titolo="Squadre iscritte">
        <GestioneSquadre
          torneo={torneo}
          squadre={squadre}
          compBySquadra={dati.perSquadraComp}
          assegnati={assegnati}
        />
      </Sezione>

      <Sezione titolo="Gironi">
        <GestioneGironi
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          compBySquadra={dati.perSquadraComp}
        />
      </Sezione>

      <Sezione titolo="Calendario">
        <GestioneCalendario
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          compBySquadra={dati.perSquadraComp}
        />
      </Sezione>

      <Sezione titolo="Riepilogo punti">
        <RiepilogoPunti
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          compBySquadra={dati.perSquadraComp}
        />
      </Sezione>

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <ImpostazioniTorneo
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          compBySquadra={dati.perSquadraComp}
        />
      </div>
    </div>
  )

  // Contenuto della scheda "Risultati e Classifica" (visibile a tutti).
  // Calendario e risultati arriveranno con la Fase 6d.
  const schedaRisultati = (
    <div>
      {/* (Fase 7c) Con più gironi: tasti per scegliere quale girone vedere
          (controllano podio, classifica e calendario). */}
      {n > 1 && (
        <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Scegli il girone">
          <button
            type="button"
            className={'subtab-btn' + (gironeSel === null ? ' attivo' : '')}
            onClick={() => setGironeSel(null)}
          >
            Tutti
          </button>
          {Array.from({ length: n }, (_, i) => i + 1).map((g) => (
            <button
              key={g}
              type="button"
              className={'subtab-btn' + (gironeSel === g ? ' attivo' : '')}
              onClick={() => setGironeSel(g)}
            >
              {nomeGirone(torneo, g)}
            </button>
          ))}
        </nav>
      )}

      {/* (Fase 6e) Podio: appare quando il calendario è completo. */}
      <PodioTorneo torneo={torneo} squadre={squadre} incontri={incontri} gironeFiltro={gironeSel} />

      <Sezione titolo="🏆 Classifica">
        <ClassificaTorneo
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          gironeFiltro={gironeSel}
        />
      </Sezione>

      <Sezione titolo="📅 Calendario e risultati">
        <Risultati
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          gestore={gestore}
          prenByIncontro={dati.prenByIncontro}
          miaSquadraId={miaSquadraId}
          compBySquadra={dati.perSquadraComp}
          gironeFiltro={gironeSel}
        />
      </Sezione>
    </div>
  )

  return (
    <div className="card">
      <div className="torneo-hero">
        <div className="torneo-hero-nome">{torneo.nome}</div>
        {gestore ? (
          // Lo stato si cambia direttamente qui, in alto a destra.
          <select
            className="torneo-hero-stato"
            value={torneo.stato}
            onChange={(e) => cambiaStato.mutate(e.target.value as StatoTorneo)}
          >
            {Object.entries(STATI_TORNEO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <span className={'pill' + (torneo.stato !== 'in_corso' ? ' off' : '')}>
            {STATI_TORNEO[torneo.stato]}
          </span>
        )}
      </div>
      {/* Formato + periodo: fuori dal riquadro verde, sotto al titolo. */}
      <div className="torneo-hero-sub">
        {(FORMATI_TORNEO[torneo.formato] ?? torneo.formato) + periodo}
      </div>

      {gestore ? (
        <>
          <nav className="mt-4 mb-4 flex flex-wrap gap-1.5" aria-label="Sezioni torneo">
            <button
              type="button"
              className={'subtab-btn' + (scheda === 'gestione' ? ' attivo' : '')}
              onClick={() => setScheda('gestione')}
            >
              ⚙️ Gestione torneo
            </button>
            <button
              type="button"
              className={'subtab-btn' + (scheda === 'risultati' ? ' attivo' : '')}
              onClick={() => setScheda('risultati')}
            >
              🏆 Risultati e Classifica
            </button>
          </nav>
          {scheda === 'gestione' ? schedaGestione : schedaRisultati}
        </>
      ) : (
        <div className="mt-4">{schedaRisultati}</div>
      )}
    </div>
  )
}
