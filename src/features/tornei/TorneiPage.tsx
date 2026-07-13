import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ModalConferma from '@/components/ModalConferma'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { puoGestireTornei } from '@/auth/ruoli'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { dataEstesa } from '@/lib/formato'
import { classiErrore, classiInput, classiOk } from '@/components/stili'
import NumeroInput from '@/components/NumeroInput'
import { useTornei } from './datiTornei'
import { useCampi } from '@/features/prenotazioni/datiPrenotazioni'
import type { DatiTornei } from './datiTornei'
import GestioneSquadre from './GestioneSquadre'
import GestioneGironi from './GestioneGironi'
import GestioneCalendario from './GestioneCalendario'
import GestioneCalendarioEliminazione from './GestioneCalendarioEliminazione'
import ClassificaTorneo from './ClassificaTorneo'
import PodioTorneo from './PodioTorneo'
import Risultati from './Risultati'
import TabelloneEliminazione from './TabelloneEliminazione'
import RiepilogoPunti from './RiepilogoPunti'
import ImpostazioniTorneo from './ImpostazioniTorneo'
import EditorPuntiTorneo from './EditorPuntiTorneo'
import EditorPuntiPosizioni from './EditorPuntiPosizioni'
import GestioneGiocatoriAmericano from './GestioneGiocatoriAmericano'
import GestioneAmericano from './GestioneAmericano'
import ClassificaAmericano from './ClassificaAmericano'
import PodioAmericano from './PodioAmericano'
import Sezione from '@/components/Sezione'
import SezioneTorneiAmici from '@/features/torneiAmici/SezioneTorneiAmici'
import { costruisciPuntiGironi, nomeGirone, numGironi, unitaTorneo } from './gironi'
import { incontroDisputato } from './calendario'
import { FORMATI_TORNEO, STATI_TORNEO } from './tipi'
import type { PuntiSet, StatoTorneo, Torneo } from './tipi'
import { azzeraChiave } from '@/lib/punti'
import { assegnaPuntiAmericano } from './punti'
import { SportIcona } from '@/components/IconeSport'
import { ICO_COPIA, ICO_TRASH, ICO_WARN, IcoMedaglia } from './icone'

// Terna di punti tutta a zero (default dei form).
const puntiZero = (): PuntiSet => ({ iscrizione: 0, vittoria: 0, torneo: 0 })


function I({ d, children }: { d?: string; children?: import('react').ReactNode }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px', marginRight: 5, flexShrink: 0 }}>
      {d ? <path d={d} /> : children}
    </svg>
  )
}


const ICO_TROFEO = <I d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" />
const ICO_CAL = <I><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></I>
const ICO_UTENTI = (
  <svg width="13" height="13" viewBox="0 -2 24 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px', marginRight: 5, flexShrink: 0 }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const ICO_GRIGLIA = <I><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></I>
const ICO_GRAFICO = <I><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></I>
const ICO_STAR = <I><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></I>
const ICO_SETTINGS = <I d="M12 20h9M4.22 4.22l1.42 1.42M20.78 4.22l-1.42 1.42M1 12h3M20 12h3M4.22 19.78l1.42-1.42M20.78 19.78l-1.42-1.42M12 1v3M12 20v3" />

// Card di un torneo ufficiale nell'elenco — stesso linguaggio grafico sobrio
// dei tornei tra amici: nome, poi una riga informativa in testo piano
// (niente capsule né emoji), poi la barra in fondo (avanzamento partite o,
// se il torneo non è ancora iniziato, una barra vuota con lo stato).
function CardTorneoClub({
  torneo,
  dati,
  onApri,
}: {
  torneo: Torneo
  dati: DatiTornei
  onApri: () => void
}) {
  const squadre = dati.perTorneoSquadre[String(torneo.id)] ?? []
  const incontri = dati.perTorneoIncontri[String(torneo.id)] ?? []
  const nGironi = numGironi(torneo)
  const nSquadre = squadre.length
  const nIncontri = incontri.length
  const disputate = incontri.filter(incontroDisputato).length
  const pct = nIncontri > 0 ? Math.round((disputate / nIncontri) * 100) : 0
  let periodo = ''
  if (torneo.data_inizio && torneo.data_fine) periodo = 'dal ' + dataEstesa(torneo.data_inizio) + ' al ' + dataEstesa(torneo.data_fine)
  else if (torneo.data_inizio) periodo = 'dal ' + dataEstesa(torneo.data_inizio)
  else if (torneo.data_fine) periodo = 'fino al ' + dataEstesa(torneo.data_fine)
  const formato = FORMATI_TORNEO[torneo.formato] ?? torneo.formato
  const sportLabel = torneo.sport === 'padel' ? 'Padel' : 'Calcio'
  const unita = unitaTorneo(torneo.sport, nSquadre !== 1)

  const concluso = torneo.stato === 'concluso'

  return (
    <div className={'torneo-club-card' + (concluso ? ' concluso' : ' verde')}>
      <button type="button" className="torneo-club-header" onClick={onApri}>
        <div className="tcl-top-row">
          <div className="tcl-nome">{torneo.nome}</div>
          <span className="tcl-chevron" aria-hidden>▸</span>
        </div>

        <div className="tcl-info-riga">
          <div className="tcl-info-sport">
            <SportIcona sport={torneo.sport} size={14} /> {sportLabel} · {formato}
            {nGironi > 1 && ` · ${nGironi} gironi`}
          </div>
          <div className="tcl-info-dettagli">
            {periodo && <>{periodo}<br /></>}
            {nSquadre} {unita} iscritte
          </div>
        </div>

        <div className="tcl-progress">
          <div className="tcl-progress-track">
            {nIncontri > 0 && <div className="tcl-progress-fill" style={{ width: pct + '%' }} />}
          </div>
          <span className="tcl-progress-label">
            {nIncontri > 0 ? `${disputate}/${nIncontri} partite giocate` : (STATI_TORNEO[torneo.stato] ?? torneo.stato)}
          </span>
        </div>
      </button>
    </div>
  )
}

export default function TorneiPage() {
  const { profilo } = useAuth()
  const [searchParams] = useSearchParams()
  // Deep link da altre pagine (es. "Crea un torneo con i tuoi amici" negli
  // Amici del profilo): ?vista=amici apre subito la scheda giusta.
  const [vista, setVista] = useState<'club' | 'amici'>(() =>
    searchParams.get('vista') === 'amici' ? 'amici' : 'club',
  )
  const torneiQuery = useTornei()
  const [apertoId, setApertoId] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  if (!profilo) return null

  // Scelta tra tornei ufficiali del club e tornei privati tra amici: due
  // funzioni indipendenti, quindi il toggle resta accessibile anche se
  // una delle due ha ancora dati da caricare o in errore.
  const toggleVista = (
    <div className="seg-group mb-4">
      <button type="button" className={'seg-btn' + (vista === 'club' ? ' attivo' : '')} onClick={() => setVista('club')}>
        Tornei del club
      </button>
      <button type="button" className={'seg-btn' + (vista === 'amici' ? ' attivo' : '')} onClick={() => setVista('amici')}>
        Tra amici
      </button>
    </div>
  )

  if (vista === 'amici') {
    return (
      <div>
        {toggleVista}
        <SezioneTorneiAmici />
      </div>
    )
  }

  if (torneiQuery.isLoading) {
    return (
      <div>
        {toggleVista}
        <p className="sub">Caricamento…</p>
      </div>
    )
  }
  if (torneiQuery.error) {
    return (
      <div>
        {toggleVista}
        <div className="card text-ink-2">
          {mancaTabella(torneiQuery.error, 'tornei')
            ? 'Esegui lo script tappa3b1-tornei.sql su Supabase per attivare i tornei.'
            : 'Impossibile caricare: ' + messaggioErrore(torneiQuery.error)}
        </div>
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
  const torneoAperto = visibili.find((t) => String(t.id) === apertoId)

  if (creando) {
    return (
      <div>
        {toggleVista}
        <button type="button" className="btn btn-secondario btn-mini mb-3" onClick={() => setCreando(false)}>← Tornei</button>
        <NuovoTorneo onCreato={(id) => { setCreando(false); setApertoId(String(id)) }} />
      </div>
    )
  }

  if (torneoAperto) {
    return (
      <div>
        {toggleVista}
        <button type="button" className="btn btn-secondario btn-mini mb-3" onClick={() => setApertoId(null)}>← Tornei</button>
        <DettaglioTorneo
          key={String(torneoAperto.id)}
          torneo={torneoAperto}
          gestore={gestore}
          dati={d}
          onCancellato={() => setApertoId(null)}
          onDuplicato={(id) => setApertoId(String(id))}
        />
      </div>
    )
  }

  return (
    <div>
      {toggleVista}
      {gestore && (
        <button type="button" className="btn btn-aggiungi btn-block mb-3" onClick={() => setCreando(true)}>
          Aggiungi nuovo torneo del club
        </button>
      )}

      {attivi.length > 0 ? (
        <div className="flex flex-col gap-3 mb-3">
          {attivi.map((t) => (
            <CardTorneoClub key={t.id} torneo={t} dati={d} onApri={() => setApertoId(String(t.id))} />
          ))}
        </div>
      ) : (
        <p className="sub mb-3">Nessun torneo attivo al momento.</p>
      )}

      {conclusi.length > 0 && (
        <Sezione titolo={`Conclusi (${conclusi.length})`} apertaIniziale={false} variante="chiaro">
          <div className="flex flex-col gap-3 mb-3">
            {conclusi.map((t) => (
              <CardTorneoClub key={t.id} torneo={t} dati={d} onApri={() => setApertoId(String(t.id))} />
            ))}
          </div>
        </Sezione>
      )}
    </div>
  )
}

const schema = z
  .object({
    nome: z.string().trim().min(1, 'Inserisci il nome'),
    sport: z.enum(['padel', 'calcio']),
    formato: z.enum(['girone', 'eliminazione', 'americano']),
    data_inizio: z.string().optional(),
    data_fine: z.string().optional(),
    numero_gironi: z.coerce.number().int().min(1).max(12),
    durata_minuti: z.coerce.number().int().min(1).max(1440),
    max_squadre: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().int().min(2).max(500).nullable(),
    ),
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
  // Ore e minuti separati per gli input liberi; il valore totale va in durata_minuti.
  const [durataOre, setDurataOre] = useState(1)
  const [durataMin, setDurataMin] = useState(30)
  const [puntiIscrizioneAm, setPuntiIscrizioneAm] = useState(0)
  const [puntiPosizioniAm, setPuntiPosizioniAm] = useState<Record<string, number>>({})
  // Slot americano: campi (più di uno) + data + orario inizio/fine.
  const [amCampiIds, setAmCampiIds] = useState<string[]>([])
  const [amData, setAmData] = useState('')
  const [amOraInizio, setAmOraInizio] = useState('')
  const [amOraFine, setAmOraFine] = useState('')
  const campiQuery = useCampi()
  // (Tappa 31) Andata/ritorno, finale secca, terzo posto.
  const [andataRitorno, setAndataRitorno] = useState(false)
  const [finaleSecca, setFinaleSecca] = useState(false)
  const [terzoPosto, setTerzoPosto] = useState(false)
  // (Fase 6bis) Solo americano: Normale o Misto (coppie uomo-donna).
  const [modalitaAmericano, setModalitaAmericano] = useState<'normale' | 'misto'>('normale')

  const slotDisponibile = useQuery({
    queryKey: ['am-disponibilita', amCampiIds, amData, amOraInizio, amOraFine],
    enabled: !!(amCampiIds.length > 0 && amData && amOraInizio && amOraFine && amOraFine > amOraInizio),
    queryFn: async () => {
      const inizio = new Date(`${amData}T${amOraInizio}`).toISOString()
      const fine   = new Date(`${amData}T${amOraFine}`).toISOString()
      const { data } = await supabase
        .from('prenotazioni')
        .select('id, inizio, fine, campo_id')
        .in('campo_id', amCampiIds.map(Number))
        .lt('inizio', fine)
        .gt('fine', inizio)
      return (data ?? []) as Array<{ id: unknown; inizio: string; fine: string; campo_id: number }>
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormTorneoIn, unknown, FormTorneoOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      sport: 'padel',
      formato: 'girone',
      numero_gironi: 1,
      durata_minuti: 90,
      max_squadre: null,
    },
  })

  const sportRaw = useWatch({ control, name: 'sport' })
  const formattoRaw = useWatch({ control, name: 'formato' })
  const isEliminazione = formattoRaw === 'eliminazione'
  const isAmericano = formattoRaw === 'americano'
  const numeroGironiRaw = useWatch({ control, name: 'numero_gironi' })
  const numeroGironi = (isEliminazione || isAmericano) ? 1 : Math.min(12, Math.max(1, Number(numeroGironiRaw) || 1))

  const orarioNonValido = isAmericano && !!amOraFine && !!amOraInizio && amOraFine <= amOraInizio
  const slotOccupato    = isAmericano && !!(slotDisponibile.data && slotDisponibile.data.length > 0)

  async function onSubmit(v: FormTorneoOut) {
    setMsg(null)
    if (v.formato === 'americano') {
      if (orarioNonValido) {
        setMsg({ tipo: 'errore', testo: "L'orario di fine non può essere uguale o precedente all'orario di inizio." })
        return
      }
      if (slotOccupato) {
        setMsg({ tipo: 'errore', testo: 'Uno o più campi selezionati non sono disponibili in questo orario. Scegli un orario libero.' })
        return
      }
    }
    const puntiGironi = costruisciPuntiGironi(v.numero_gironi, gironi)
    const puntiBaseVal = v.numero_gironi > 1 ? (gironi[0] ?? puntiZero()) : base

    // Per l'americano calcola durata dal blocco orario; fallback 120 min.
    let durata = v.durata_minuti
    if (v.formato === 'americano' && amOraInizio && amOraFine) {
      const [hi, mi] = amOraInizio.split(':').map(Number)
      const [hf, mf] = amOraFine.split(':').map(Number)
      const diff = (hf * 60 + mf) - (hi * 60 + mi)
      if (diff > 0) durata = diff
    }

    const payload: Record<string, unknown> = {
      nome: v.nome,
      sport: v.sport,
      formato: v.formato,
      data_inizio: v.formato === 'americano' ? (amData || null) : (v.data_inizio || null),
      data_fine: v.formato === 'americano' ? (amData || null) : (v.data_fine || null),
      creato_da: profilo!.id,
      numero_gironi: v.numero_gironi,
      durata_minuti: durata,
      max_squadre: v.max_squadre ?? null,
      punti_iscrizione: puntiBaseVal.iscrizione,
      punti_vittoria: puntiBaseVal.vittoria,
      punti_torneo: puntiBaseVal.torneo,
      andata_ritorno: andataRitorno,
      finale_secca: v.formato === 'eliminazione' ? finaleSecca : false,
      terzo_posto: v.formato === 'eliminazione' ? terzoPosto : false,
      modalita_americano: v.formato === 'americano' ? modalitaAmericano : 'normale',
    }
    if (puntiGironi) payload.punti_gironi = puntiGironi
    if (v.formato === 'americano') {
      payload.americano_campo_id  = amCampiIds.length ? Number(amCampiIds[0]) : null
      payload.americano_campi_ids = amCampiIds.length ? amCampiIds.map(Number) : null
      payload.americano_inizio = amData && amOraInizio ? new Date(`${amData}T${amOraInizio}`).toISOString() : null
      payload.americano_fine   = amData && amOraFine   ? new Date(`${amData}T${amOraFine}`).toISOString()   : null
      payload.punti_iscrizione = puntiIscrizioneAm
      payload.punti_posizioni  = Object.keys(puntiPosizioniAm).length ? puntiPosizioniAm : null
    }

    const { data, error } = await supabase.from('tornei').insert(payload).select('id').single()

    if (error) {
      const err = error as { code?: string; message?: string }
      const m = (err.message ?? '').toLowerCase()
      const mancaPuntiGironi = puntiGironi != null && (err.code === '42703' || m.includes('punti_gironi'))
      const mancaCol = err.code === '42703' || m.includes('punti_iscrizione') || m.includes('data_fine')
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

    // Crea una prenotazione per ogni campo che blocca lo slot nel calendario.
    if (v.formato === 'americano' && amCampiIds.length > 0 && amData && amOraInizio && amOraFine && data?.id) {
      for (const campoId of amCampiIds) {
        await supabase.from('prenotazioni').insert({
          campo_id: Number(campoId),
          socio_id: profilo!.id,
          inizio: new Date(`${amData}T${amOraInizio}`).toISOString(),
          fine:   new Date(`${amData}T${amOraFine}`).toISOString(),
          torneo_id: data.id,
        })
      }
    }

    reset()
    setBase(puntiZero())
    setGironi(Array.from({ length: 12 }, puntiZero))
    setAmCampiIds([]); setAmData(''); setAmOraInizio(''); setAmOraFine('')
    setPuntiIscrizioneAm(0); setPuntiPosizioniAm({})
    setAndataRitorno(false); setFinaleSecca(false); setTerzoPosto(false)
    setModalitaAmericano('normale')
    // Aspetta che il refetch completi: così il nuovo torneo è già in cache
    // quando onCreato naviga verso il suo ID, evitando la pagina bianca.
    await qc.invalidateQueries({ queryKey: ['tornei'] })
    if (data?.id != null) onCreato(data.id)
  }

  const orarioOpts = Array.from({ length: 36 }, (_, i) => {
    const h = Math.floor(i / 2) + 6
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="card form-verde">

        {/* ── Nome ──────────────────────────────────────────────── */}
        <label style={{ marginTop: 0 }}>Nome torneo</label>
        <input
          className={classiInput}
          placeholder="Es. Trofeo Estate"
          {...register('nome')}
        />
        {errors.nome && <p className="mt-1 text-xs text-red-700">{errors.nome.message}</p>}

        {/* ── Sport ─────────────────────────────────────────────── */}
        <label>Sport</label>
        <div className="seg-group">
          <button
            type="button"
            className={`seg-btn${sportRaw === 'padel' ? ' attivo' : ''}`}
            onClick={() => setValue('sport', 'padel')}
          >
            <SportIcona sport="padel" /> Padel
          </button>
          <button
            type="button"
            className={`seg-btn${sportRaw === 'calcio' ? ' attivo' : ''}`}
            onClick={() => {
              setValue('sport', 'calcio')
              if (formattoRaw === 'americano') setValue('formato', 'girone')
            }}
          >
            <SportIcona sport="calcio" /> Calcio
          </button>
        </div>
        {/* campi nascosti per react-hook-form */}
        <input type="hidden" {...register('sport')} />
        <input type="hidden" {...register('formato')} />

        {/* ── Formato ───────────────────────────────────────────── */}
        <label>Formato</label>
        <div className="formato-grid">
          <button
            type="button"
            className={`formato-btn${formattoRaw === 'girone' ? ' attivo' : ''}`}
            onClick={() => setValue('formato', 'girone')}
          >
            <span className="formato-icon">◉</span>
            <span className="formato-nome">Girone{' '}all'italiana</span>
          </button>
          <button
            type="button"
            className={`formato-btn${formattoRaw === 'eliminazione' ? ' attivo' : ''}`}
            onClick={() => setValue('formato', 'eliminazione')}
          >
            <span className="formato-icon">⚡</span>
            <span className="formato-nome">Eliminazione{' '}diretta</span>
          </button>
          {sportRaw === 'padel' && (
            <button
              type="button"
              className={`formato-btn${formattoRaw === 'americano' ? ' attivo' : ''}`}
              onClick={() => setValue('formato', 'americano')}
            >
              <span className="formato-icon">↺</span>
              <span className="formato-nome">Americano</span>
            </button>
          )}
        </div>

        {/* ── (Fase 6bis) Modalità Americano: Normale / Misto ──── */}
        {isAmericano && (
          <>
            <label>Modalità</label>
            <div className="opzione-grid">
              <button
                type="button"
                className={`opzione-btn${modalitaAmericano === 'normale' ? ' attivo' : ''}`}
                onClick={() => setModalitaAmericano('normale')}
              >
                <span className="opzione-btn-icon">◉</span>
                <span className="opzione-btn-nome">Normale</span>
              </button>
              <button
                type="button"
                className={`opzione-btn${modalitaAmericano === 'misto' ? ' attivo' : ''}`}
                onClick={() => setModalitaAmericano('misto')}
              >
                <span className="opzione-btn-icon">⚥</span>
                <span className="opzione-btn-nome">Misto</span>
              </button>
            </div>
            {modalitaAmericano === 'misto' && (
              <p className="sub mb-2" style={{ fontSize: '0.82rem' }}>
                Le coppie di ogni round saranno sempre uomo-donna. Servono lo stesso numero di
                uomini e donne iscritti (numeri pari).
              </p>
            )}
          </>
        )}

        {/* ── Sola andata / Andata e ritorno ───────────────────── */}
        <div className="opzione-grid">
          <button
            type="button"
            className={`opzione-btn${!andataRitorno ? ' attivo' : ''}`}
            onClick={() => { setAndataRitorno(false); setFinaleSecca(false) }}
          >
            <span className="opzione-btn-icon">→</span>
            <span className="opzione-btn-nome">Sola{' '}andata</span>
          </button>
          <button
            type="button"
            className={`opzione-btn${andataRitorno ? ' attivo' : ''}`}
            onClick={() => setAndataRitorno(true)}
          >
            <span className="opzione-btn-icon">⇄</span>
            <span className="opzione-btn-nome">Andata{' '}e ritorno</span>
          </button>
          {isEliminazione && andataRitorno && (
            <button
              type="button"
              className={`opzione-btn${finaleSecca ? ' attivo' : ''}`}
              onClick={() => setFinaleSecca(!finaleSecca)}
            >
              <span className="opzione-btn-icon">⚡</span>
              <span className="opzione-btn-nome">Finale{' '}secca</span>
            </button>
          )}
          {isEliminazione && (
            <button
              type="button"
              className={`opzione-btn${terzoPosto ? ' attivo' : ''}`}
              onClick={() => setTerzoPosto(!terzoPosto)}
            >
              <span className="opzione-btn-icon"><IcoMedaglia size={20} style={{ marginRight: 0 }} /></span>
              <span className="opzione-btn-nome">3°/4°{' '}posto</span>
            </button>
          )}
        </div>

        {/* ── Parametri ─────────────────────────────────────────── */}
        <div className="eyebrow">{ICO_SETTINGS}Parametri</div>

        <div
          className="param-grid"
          style={{ gridTemplateColumns: isAmericano ? '1fr' : '1fr 1fr' }}
        >
          {/* Num. squadre / giocatori — nel girone occupa tutta la riga */}
          <div style={(!isEliminazione && !isAmericano) ? { gridColumn: 'span 2' } : undefined}>
            <span className="param-label">{isAmericano ? 'Num. giocatori' : 'Num. squadre'}</span>
            <NumeroInput
              min={isAmericano ? 4 : 2}
              max={500}
              step={isAmericano ? 4 : 1}
              placeholder="—"
              style={{ textAlign: 'center' }}
              {...register('max_squadre')}
              onBlur={(e) => {
                if (isAmericano) {
                  const v = parseInt(e.target.value) || 4
                  const snapped = Math.max(4, Math.round(v / 4) * 4)
                  e.target.value = String(snapped)
                  setValue('max_squadre', snapped)
                }
                register('max_squadre').onBlur(e)
              }}
            />
            {errors.max_squadre && (
              <p className="mt-1 text-xs text-red-700">{errors.max_squadre.message as string}</p>
            )}
          </div>

          {/* Durata partita */}
          {!isAmericano && (
            <div>
              <span className="param-label">Durata partita</span>
              <div className="durata-wrap">
                <select
                  className={classiInput}
                  style={{ textAlign: 'center', width: '3.5rem', paddingInline: '4px' }}
                  value={durataOre}
                  onChange={(e) => {
                    const ore = Number(e.target.value)
                    setDurataOre(ore)
                    setValue('durata_minuti', ore * 60 + durataMin)
                  }}
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                </select>
                <span className="durata-sep">h</span>
                <select
                  className={classiInput}
                  style={{ textAlign: 'center', width: '4rem', paddingInline: '4px' }}
                  value={durataMin}
                  onChange={(e) => {
                    const min = Number(e.target.value)
                    setDurataMin(min)
                    setValue('durata_minuti', durataOre * 60 + min)
                  }}
                >
                  <option value={0}>00</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                </select>
                <span className="durata-sep">min</span>
              </div>
            </div>
          )}

          {/* Num. gironi */}
          {!isEliminazione && !isAmericano && (
            <div>
              <span className="param-label">Num. gironi</span>
              <NumeroInput
                min={1}
                max={12}
                inputMode="numeric"
                style={{ textAlign: 'center' }}
                {...register('numero_gironi')}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1
                  e.target.value = String(Math.min(12, Math.max(1, v)))
                  register('numero_gironi').onChange(e)
                }}
              />
              {errors.numero_gironi && (
                <p className="mt-1 text-xs text-red-700">{errors.numero_gironi.message as string}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Data e orario ─────────────────────────────────────── */}
        {isAmericano ? (
          <>
            <div className="eyebrow">{ICO_CAL}Campi e orario</div>
            <span className="param-label" style={{ marginBottom: 6 }}>Campi utilizzati</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {(campiQuery.data ?? [])
                .filter((c) => c.sport === 'padel' && c.in_servizio !== false)
                .map((c) => {
                  const sel = amCampiIds.includes(String(c.id))
                  return (
                    <label
                      key={c.id}
                      className={`opzione-btn${sel ? ' attivo' : ''}`}
                      style={{ minHeight: 0, minWidth: 0, flexDirection: 'row', padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={sel}
                        onChange={(e) =>
                          setAmCampiIds((prev) =>
                            e.target.checked
                              ? [...prev, String(c.id)]
                              : prev.filter((id) => id !== String(c.id))
                          )
                        }
                      />
                      {c.nome}
                    </label>
                  )
                })}
              {(campiQuery.data ?? []).filter((c) => c.sport === 'padel' && c.in_servizio !== false).length === 0 && (
                <p className="sub" style={{ fontSize: '0.82rem' }}>Nessun campo padel disponibile.</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <span className="param-label">Data</span>
                <input
                  type="date"
                  max="9999-12-31"
                  className={classiInput}
                  value={amData}
                  onChange={(e) => setAmData(e.target.value)}
                />
              </div>
              <div>
                <span className="param-label">Inizio</span>
                <select
                  className={classiInput}
                  value={amOraInizio}
                  onChange={(e) => {
                    setAmOraInizio(e.target.value)
                    if (e.target.value && amOraFine) {
                      const [hi, mi] = e.target.value.split(':').map(Number)
                      const [hf, mf] = amOraFine.split(':').map(Number)
                      const diff = (hf * 60 + mf) - (hi * 60 + mi)
                      if (diff > 0) setValue('durata_minuti', diff)
                    }
                  }}
                >
                  <option value="">—</option>
                  {orarioOpts.map((val) => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              <div>
                <span className="param-label">Fine</span>
                <select
                  className={classiInput}
                  value={amOraFine}
                  onChange={(e) => {
                    setAmOraFine(e.target.value)
                    if (amOraInizio && e.target.value) {
                      const [hi, mi] = amOraInizio.split(':').map(Number)
                      const [hf, mf] = e.target.value.split(':').map(Number)
                      const diff = (hf * 60 + mf) - (hi * 60 + mi)
                      if (diff > 0) setValue('durata_minuti', diff)
                    }
                  }}
                >
                  <option value="">—</option>
                  {orarioOpts.map((val) => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
            </div>

            {orarioNonValido && (
              <p className="sub mt-2" style={{ color: '#fb923c', fontSize: '0.82rem' }}>
                {ICO_WARN}L'orario di fine non può essere uguale o precedente all'orario di inizio.
              </p>
            )}

            {amCampiIds.length > 0 && amData && amOraInizio && amOraFine && amOraFine > amOraInizio && (
              <div className="mt-2">
                {slotDisponibile.isFetching ? (
                  <p className="sub" style={{ fontSize: '0.8rem' }}>Verifica disponibilità…</p>
                ) : slotDisponibile.data && slotDisponibile.data.length > 0 ? (
                  <p className="sub" style={{ color: '#fb923c', fontSize: '0.82rem' }}>
                    {ICO_WARN}{amCampiIds.length > 1 ? 'Uno o più campi già occupati' : 'Campo già occupato'} in questo orario ({slotDisponibile.data.length} conflitto/i).
                  </p>
                ) : slotDisponibile.data ? (
                  <p className="sub" style={{ color: '#86efac', fontSize: '0.82rem' }}>
                    ✓ {amCampiIds.length > 1 ? 'Tutti i campi disponibili' : 'Slot disponibile'}
                  </p>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="eyebrow">{ICO_CAL}Date</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="param-label">Data inizio</span>
                <input type="date" max="9999-12-31" className={classiInput} {...register('data_inizio')} />
              </div>
              <div>
                <span className="param-label">Data fine</span>
                <input type="date" max="9999-12-31" className={classiInput} {...register('data_fine')} />
                {errors.data_fine && (
                  <p className="mt-1 text-xs text-red-700">{errors.data_fine.message}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Punti ─────────────────────────────────────────────── */}
        <div className="eyebrow">{ICO_STAR}Punti</div>

        {isAmericano ? (
          <>
            <div style={{ maxWidth: 180 }}>
              <span className="param-label">Punti iscrizione</span>
              <NumeroInput
                min={0}
                style={{ textAlign: 'center' }}
                value={puntiIscrizioneAm}
                onChange={(e) => setPuntiIscrizioneAm(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <span className="param-label" style={{ marginTop: 14, display: 'block' }}>
              Punti per posizione in classifica
            </span>
            <EditorPuntiPosizioni value={puntiPosizioniAm} onChange={setPuntiPosizioniAm} />
          </>
        ) : (
          <>
            <p className="sub" style={{ marginTop: 0, marginBottom: 10, fontSize: '0.82rem' }}>
              {numeroGironi > 1
                ? 'Valgono solo per questo torneo. Con più gironi puoi assegnare punti diversi per ciascuno.'
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
          </>
        )}


        {/* ── Messaggio ed azione ───────────────────────────────── */}
        {msg && (
          <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}

        <button
          type="submit"
          className="btn btn-riflesso btn-block"
          style={{
            marginTop: 24,
            ...((orarioNonValido || slotOccupato) ? { opacity: 0.52, cursor: 'default' } : {}),
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            'Creazione in corso…'
          ) : (orarioNonValido || slotOccupato) ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Crea torneo
            </span>
          ) : (
            'Crea torneo'
          )}
        </button>

        <p className="sub" style={{ marginTop: 12, fontSize: '0.8rem', opacity: 0.75 }}>
          Il torneo nasce in <strong>Bozza</strong> — diventa visibile ai soci solo quando
          lo porti <strong>In corso</strong>.
        </p>
      </form>
    </>
  )
}


function DettaglioTorneo({
  torneo,
  gestore,
  dati,
  onCancellato,
  onDuplicato,
}: {
  torneo: Torneo
  gestore: boolean
  dati: DatiTornei
  onCancellato: () => void
  onDuplicato: (id: number | string) => void
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
  const americanoPartite = dati.perTorneoAmericano[String(torneo.id)] ?? []
  const n = numGironi(torneo)

  const isEliminazione = torneo.formato === 'eliminazione'
  const isAmericano = torneo.formato === 'americano'

  const [confermaCancellazione, setConfermaCancellazione] = useState(false)

  // Stato locale per i punti del torneo americano (gestione inline nella schedaGestione).
  const [amPtIscr, setAmPtIscr] = useState(torneo.punti_iscrizione ?? 0)
  const [amPtPos, setAmPtPos] = useState<Record<string, number>>(torneo.punti_posizioni ?? {})
  const [amPtMsg, setAmPtMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  const salvaPuntiAm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tornei').update({
        punti_iscrizione: amPtIscr,
        punti_posizioni: Object.keys(amPtPos).length ? amPtPos : null,
      }).eq('id', torneo.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tornei'] })
      setAmPtMsg({ tipo: 'ok', testo: 'Punti salvati.' })
    },
    onError: (e: unknown) => setAmPtMsg({ tipo: 'errore', testo: messaggioErrore(e) }),
  })

  // (Fase 6e) La squadra/coppia del socio in questo torneo (per il bottone "Sfida").
  const miaSquadraId = squadre.find((s) =>
    (dati.perSquadraComp[String(s.id)] ?? []).some((c) => c.socio_id === profilo?.id),
  )?.id

  const cambiaStato = useMutation({
    mutationFn: async (stato: StatoTorneo) => {
      const { error } = await supabase.from('tornei').update({ stato }).eq('id', torneo.id)
      if (error) throw error
      // Assegna i punti per posizione quando il torneo americano viene concluso.
      if (stato === 'concluso' && isAmericano) {
        await assegnaPuntiAmericano(torneo, squadre, americanoPartite, dati.perSquadraComp)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tornei'] }) },
    onError: (e: unknown) => window.alert('Aggiornamento non riuscito: ' + messaggioErrore(e)),
  })

  const cancella = useMutation({
    mutationFn: async () => {
      // Azzera tutte le chiavi punti prima di eliminare i record.
      for (const m of incontri) await azzeraChiave(`partita:${m.id}`)
      const ng = numGironi(torneo)
      for (let g = 1; g <= ng; g++) await azzeraChiave(`torneo:${torneo.id}:vittoria:${g}`)
      for (const s of squadre) {
        for (const c of dati.perSquadraComp[String(s.id)] ?? []) {
          if (c.socio_id) await azzeraChiave(`iscr:${s.id}:${c.socio_id}`)
        }
      }
      // Libera le prenotazioni collegate agli incontri di questo torneo.
      const incontroIds = incontri.map((m) => m.id)
      if (incontroIds.length > 0)
        await supabase.from('prenotazioni').delete().in('incontro_id', incontroIds)
      // Elimina in ordine: figli prima del padre.
      await supabase.from('incontri').delete().eq('torneo_id', torneo.id)
      await supabase.from('americano_partite').delete().eq('torneo_id', torneo.id)
      await supabase.from('richieste_iscrizione').delete().eq('torneo_id', torneo.id)
      await supabase.from('squadra_componenti').delete().eq('torneo_id', torneo.id)
      await supabase.from('squadre').delete().eq('torneo_id', torneo.id)
      const { error } = await supabase.from('tornei').delete().eq('id', torneo.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tornei'] })
      onCancellato()
    },
    onError: (e: unknown) => window.alert('Cancellazione non riuscita: ' + messaggioErrore(e)),
  })

  // Copia le regole del torneo (formato, punti, durata…) e gli iscritti
  // (squadre/giocatori con i loro componenti). Calendario, risultati e
  // richieste di iscrizione restano fuori: il nuovo torneo riparte da zero.
  const duplica = useMutation({
    mutationFn: async () => {
      const nuovoPayload = {
        nome: `${torneo.nome} (copia)`,
        sport: torneo.sport,
        formato: torneo.formato,
        stato: 'bozza' as StatoTorneo,
        data_inizio: null,
        data_fine: null,
        creato_da: profilo!.id,
        numero_gironi: torneo.numero_gironi,
        nomi_gironi: torneo.nomi_gironi,
        punti_gironi: torneo.punti_gironi,
        durata_minuti: torneo.durata_minuti,
        max_squadre: torneo.max_squadre,
        punti_iscrizione: torneo.punti_iscrizione,
        punti_vittoria: torneo.punti_vittoria,
        punti_torneo: torneo.punti_torneo,
        andata_ritorno: torneo.andata_ritorno,
        finale_secca: torneo.finale_secca,
        terzo_posto: torneo.terzo_posto,
        modalita_americano: torneo.modalita_americano,
        punti_posizioni: torneo.punti_posizioni,
        americano_campo_id: null,
        americano_campi_ids: null,
        americano_inizio: null,
        americano_fine: null,
        bracket_seed: null,
      }
      const { data: nuovo, error } = await supabase.from('tornei').insert(nuovoPayload).select('id').single()
      if (error) throw error
      const nuovoId = nuovo.id as number | string

      // Le squadre si inseriscono una alla volta (invece che in blocco) per
      // sapere con certezza a quale nuovo id corrisponde ciascuna squadra
      // originale, ed agganciarci i componenti giusti.
      const mappaSquadre = new Map<string, number | string>()
      for (const s of squadre) {
        const { data: nuovaSquadra, error: errSq } = await supabase
          .from('squadre')
          .insert({ torneo_id: nuovoId, nome: s.nome, logo_url: s.logo_url, girone: s.girone })
          .select('id')
          .single()
        if (errSq) throw errSq
        mappaSquadre.set(String(s.id), nuovaSquadra.id as number | string)
      }

      const nuoviComponenti = squadre.flatMap((s) => {
        const nuovaSquadraId = mappaSquadre.get(String(s.id))
        if (nuovaSquadraId == null) return []
        return (dati.perSquadraComp[String(s.id)] ?? []).map((c) => ({
          squadra_id: nuovaSquadraId,
          torneo_id: nuovoId,
          socio_id: c.socio_id,
          riserva: c.riserva,
          nome_manuale: c.nome_manuale ?? null,
          genere: c.genere ?? null,
        }))
      })
      if (nuoviComponenti.length) {
        const { error: errComp } = await supabase.from('squadra_componenti').insert(nuoviComponenti)
        if (errComp) throw errComp
      }

      return nuovoId
    },
    onSuccess: async (nuovoId) => {
      await qc.invalidateQueries({ queryKey: ['tornei'] })
      onDuplicato(nuovoId)
    },
    onError: (e: unknown) => window.alert('Duplicazione non riuscita: ' + messaggioErrore(e)),
  })

  function avviaCancellazione() {
    setConfermaCancellazione(true)
  }

  const fmt = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  let periodo = ''
  if (isAmericano) {
    if (torneo.americano_inizio) {
      const d = new Date(torneo.americano_inizio)
      const dataStr = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      const oraI = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      const oraF = torneo.americano_fine
        ? new Date(torneo.americano_fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        : null
      periodo = ' · il ' + dataStr + ' · ' + oraI + (oraF ? '–' + oraF : '')
    } else if (torneo.data_inizio) {
      periodo = ' · il ' + fmt(torneo.data_inizio)
    }
  } else {
    if (torneo.data_inizio && torneo.data_fine)
      periodo = ' · dal ' + fmt(torneo.data_inizio) + ' al ' + fmt(torneo.data_fine)
    else if (torneo.data_inizio) periodo = ' · dal ' + fmt(torneo.data_inizio)
    else if (torneo.data_fine) periodo = ' · fino al ' + fmt(torneo.data_fine)
  }

  // Contenuto della scheda "Gestione torneo" (solo organizzatori).
  const schedaGestione = (
    <div>
      <Sezione titolo={<>{ICO_UTENTI}{isAmericano ? 'Giocatori iscritti' : 'Squadre iscritte'}</>}>
        {isAmericano ? (
          <GestioneGiocatoriAmericano
            torneo={torneo}
            giocatori={squadre}
            compBySquadra={dati.perSquadraComp}
            assegnati={assegnati}
          />
        ) : (
          <GestioneSquadre
            torneo={torneo}
            squadre={squadre}
            compBySquadra={dati.perSquadraComp}
            assegnati={assegnati}
            richieste={dati.richiestePerTorneo[String(torneo.id)] ?? []}
          />
        )}
      </Sezione>

      {!isEliminazione && !isAmericano && (
        <Sezione titolo={<>{ICO_GRIGLIA}Gironi</>}>
          <GestioneGironi
            torneo={torneo}
            squadre={squadre}
            incontri={incontri}
            compBySquadra={dati.perSquadraComp}
          />
        </Sezione>
      )}

      {isAmericano ? (
        <Sezione titolo={<>{ICO_CAL}Turni</>}>
          <GestioneAmericano
            torneo={torneo}
            giocatori={squadre}
            compBySquadra={dati.perSquadraComp}
            partite={americanoPartite}
            gestore={true}
            soloControlli={true}
          />
        </Sezione>
      ) : (
        <Sezione titolo={<>{ICO_CAL}{isEliminazione ? 'Tabellone' : 'Calendario'}</>}>
          {isEliminazione ? (
            <GestioneCalendarioEliminazione
              torneo={torneo}
              squadre={squadre}
              incontri={incontri}
            />
          ) : (
            <GestioneCalendario
              torneo={torneo}
              squadre={squadre}
              incontri={incontri}
              compBySquadra={dati.perSquadraComp}
            />
          )}
        </Sezione>
      )}

      {isAmericano && (
        <Sezione titolo={<>{ICO_STAR}Punti di questo torneo</>}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Punti iscrizione</label>
              <NumeroInput
                min={0}
                value={amPtIscr}
                onChange={(e) => { setAmPtIscr(Math.max(0, parseInt(e.target.value) || 0)); setAmPtMsg(null) }}
              />
            </div>
          </div>
          <label className="mt-3 block">Punti per posizione in classifica</label>
          <EditorPuntiPosizioni value={amPtPos} onChange={(v) => { setAmPtPos(v); setAmPtMsg(null) }} />
          {amPtMsg && (
            <p className={`mt-3 ${amPtMsg.tipo === 'ok' ? classiOk : classiErrore}`}>{amPtMsg.testo}</p>
          )}
          <button
            type="button"
            className="btn mt-3"
            disabled={salvaPuntiAm.isPending}
            onClick={() => salvaPuntiAm.mutate()}
          >
            {salvaPuntiAm.isPending ? 'Salvataggio…' : 'Salva punti'}
          </button>
        </Sezione>
      )}

      <Sezione titolo={<>{ICO_GRAFICO}Riepilogo punti</>}>
        <RiepilogoPunti
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          compBySquadra={dati.perSquadraComp}
          americanoPartite={americanoPartite}
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

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <div className="eyebrow">Duplica torneo</div>
        <p className="sub mt-2 mb-3">
          Crea un nuovo torneo in bozza con le stesse regole (formato, punti, durata…) e gli stessi iscritti
          {isAmericano ? ' (giocatori)' : ' (squadre e componenti)'}. Calendario e risultati non vengono copiati.
        </p>
        <button
          type="button"
          className="btn btn-secondario"
          onClick={() => duplica.mutate()}
          disabled={duplica.isPending}
        >
          {duplica.isPending ? 'Duplico…' : <>{ICO_COPIA}Duplica torneo</>}
        </button>
      </div>

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <div className="eyebrow" style={{ color: 'var(--errore)' }}>Zona pericolosa</div>
        <p className="sub mt-2 mb-3">
          La cancellazione è definitiva e irreversibile: rimuove squadre, incontri, risultati e tutti i punti assegnati.
        </p>
        <button
          type="button"
          className="btn btn-pericolo"
          onClick={avviaCancellazione}
          disabled={cancella.isPending}
        >
          {cancella.isPending ? 'Cancellazione…' : <>{ICO_TRASH}Cancella torneo</>}
        </button>
      </div>
    </div>
  )

  // Contenuto della scheda "Risultati e Classifica" (visibile a tutti).
  const schedaRisultati = isAmericano ? (
    <div>
      <PodioAmericano giocatori={squadre} partite={americanoPartite} />
      <Sezione titolo={<>{ICO_TROFEO}Classifica</>}>
        <ClassificaAmericano
          giocatori={squadre}
          partite={americanoPartite}
        />
      </Sezione>
      <Sezione titolo={<>{ICO_CAL}Turni e risultati</>}>
        <GestioneAmericano
          torneo={torneo}
          giocatori={squadre}
          compBySquadra={dati.perSquadraComp}
          partite={americanoPartite}
          gestore={false}
          puoModificare={gestore}
        />
      </Sezione>
    </div>
  ) : isEliminazione ? (
    <div>
      <Sezione titolo={<>{ICO_TROFEO}Tabellone</>}>
        <TabelloneEliminazione
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          gestore={gestore}
          prenByIncontro={dati.prenByIncontro}
          miaSquadraId={miaSquadraId}
          compBySquadra={dati.perSquadraComp}
        />
      </Sezione>
    </div>
  ) : (
    <div>
      {/* (Fase 7c) Con più gironi: tasti per scegliere quale girone vedere. */}
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

      <Sezione titolo={<>{ICO_TROFEO}Classifica</>}>
        <ClassificaTorneo
          torneo={torneo}
          squadre={squadre}
          incontri={incontri}
          gironeFiltro={gironeSel}
        />
      </Sezione>

      <Sezione titolo={<>{ICO_CAL}Calendario e risultati</>}>
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
      {/* Stato: riga distinta sopra al blocco nome */}
      <div className="torneo-stato-row">
        {gestore ? (
          <select
            className="torneo-hero-stato"
            value={torneo.stato}
            onChange={(e) => cambiaStato.mutate(e.target.value as StatoTorneo)}
          >
            {Object.entries(STATI_TORNEO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        ) : (
          <span className={'pill torneo-hero-pill' + (torneo.stato !== 'in_corso' ? ' off' : '')}>
            {STATI_TORNEO[torneo.stato]}
          </span>
        )}
      </div>

      {/* Blocco nome: solo il nome, senza interferenze */}
      <div className={'torneo-hero torneo-hero-' + torneo.sport}>
        <div className="torneo-hero-nome">{torneo.nome}</div>
      </div>
      {/* Formato + periodo: fuori dal riquadro verde, sotto al titolo. */}
      <div className="torneo-hero-sub">
        {(FORMATI_TORNEO[torneo.formato] ?? torneo.formato) +
          (isAmericano && torneo.modalita_americano === 'misto' ? ' · Misto' : '') +
          periodo}
      </div>

      {gestore ? (
        <>
          <nav className="mt-4 mb-4 flex flex-wrap gap-1.5" aria-label="Sezioni torneo">
            <button
              type="button"
              className={'subtab-btn' + (scheda === 'gestione' ? ' attivo' : '')}
              onClick={() => setScheda('gestione')}
            >
              {ICO_SETTINGS}Gestione torneo
            </button>
            <button
              type="button"
              className={'subtab-btn' + (scheda === 'risultati' ? ' attivo' : '')}
              onClick={() => setScheda('risultati')}
            >
              {ICO_TROFEO}Risultati e Classifica
            </button>
          </nav>
          {scheda === 'gestione' ? schedaGestione : schedaRisultati}
        </>
      ) : (
        <div className="mt-4">{schedaRisultati}</div>
      )}

      {confermaCancellazione && (
        <ModalConferma
          titolo="Cancellare il torneo?"
          messaggio={<>Verranno eliminati definitivamente squadre, incontri e risultati di <strong>{torneo.nome}</strong>. Questa azione non è reversibile.</>}
          labelConferma="Sì, cancella"
          pericolo
          onConferma={() => { setConfermaCancellazione(false); cancella.mutate() }}
          onAnnulla={() => setConfermaCancellazione(false)}
        />
      )}
    </div>
  )
}
