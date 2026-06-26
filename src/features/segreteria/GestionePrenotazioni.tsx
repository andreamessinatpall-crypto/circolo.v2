import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { classiErrore, classiOk } from '@/components/stili'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { useCampi } from '@/features/prenotazioni/datiPrenotazioni'
import { mancaColonnaManuale, useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { SchedaPartita } from '@/features/prenotazioni/MieAmichevoli'
import { assegnaPuntiPresenza, annullaPuntiPresenza } from '@/features/prenotazioni/puntiPresenze'
import { oraLocale } from '@/features/prenotazioni/orari'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import { useValoriPunti } from './datiPunti'
import { useIntervalliCrediti } from './datiIntervalli'
import { usePrenotazioniAdminIntervallo } from './datiPrenotazioniAdmin'
import { SLOT_DEF, costruisciSlots } from '@/features/prenotazioni/slotGiornata'
import { costruisciCsv, scaricaCsv } from '@/lib/csv'
import type { MiaPrenotazione, Partecipante } from '@/features/prenotazioni/datiAmichevoli'
import type { Campo, Sport } from '@/features/prenotazioni/tipi'

// ── Utilità sulle date (settimana lun→dom, in ora locale) ──
function lunedi(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // lunedì = 0
  x.setDate(x.getDate() - dow)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${g}`
}
const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// "Nome Cognome" → "Cognome N."
function cogIniz(etichetta: string): string {
  const p = etichetta.trim().split(/\s+/)
  if (p.length < 2) return etichetta
  const cognome = p[p.length - 1]
  const iniz = p[0][0]?.toUpperCase() ?? ''
  return iniz ? `${cognome} ${iniz}.` : cognome
}

// (Fase 8g · B) Modifica manuale degli orari: tendine HH : MM (minuti 00/15/30/45).
const ORE = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTI = ['00', '15', '30', '45']
// "HH:MM" da una data locale.
function hhmm(d: Date): string {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
// Minuti dall'inizio della giornata di una "HH:MM".
function minutiDa(hhmmStr: string): number {
  const [h, m] = hhmmStr.split(':').map(Number)
  return h * 60 + m
}
// Costruisce una data locale dal giorno "AAAA-MM-GG" e da una "HH:MM".
function dataConOra(giorno: string, hhmmStr: string): Date {
  const [y, m, g] = giorno.split('-').map(Number)
  const [h, mi] = hhmmStr.split(':').map(Number)
  return new Date(y, m - 1, g, h, mi)
}

// Uno slot selezionato = la finestra aperta su una cella del tabellone.
interface SlotScelto {
  campo: Campo
  inizio: Date
  fine: Date
  booking: MiaPrenotazione | null
  // Minuti liberi fino al prossimo confine (per scegliere la durata creabile).
  disponibileMin: number
}

// (Fase 8g) Segreteria · calendario settimanale + tabellone a slot per campo;
// cliccando uno slot si aprono gestione giocatori e conferma presenze.
export default function GestionePrenotazioni() {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const [sport, setSport] = useState<Sport>('padel')
  const [inizioSettimana, setInizioSettimana] = useState<Date>(() => lunedi(new Date()))
  const [giornoSel, setGiornoSel] = useState<string>(() => ymd(new Date()))
  const [slot, setSlot] = useState<SlotScelto | null>(null)
  // (Fase 8g · B) Editor degli orari aperto? Lo stato sta qui perché il trigger
  // (icona matita) è nell'intestazione della finestra, separato dall'editor.
  const [editOrario, setEditOrario] = useState(false)

  const campiQuery = useCampi()
  const sociQuery = useSociPubblici()
  const istruttoriQuery = useQuery({
    queryKey: ['istruttori-attivi'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('istruttori_attivi')
      if (error) throw error
      return ((data ?? []) as Array<{ id: string; cognome: string; nome: string }>).map((s) => ({
        id: s.id,
        etichetta: `${s.cognome} ${s.nome}`.trim(),
      }))
    },
  })
  const istruttori = istruttoriQuery.data ?? []
  const valoriQuery = useValoriPunti()
  const modalitaPremiQuery = useModalitaPremi()
  const intervalliQuery = useIntervalliCrediti()

  const campiSport = useMemo(
    () =>
      (campiQuery.data ?? [])
        .filter((c) => c.sport === sport)
        .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0)),
    [campiQuery.data, sport],
  )
  const idCampi = useMemo(() => campiSport.map((c) => c.id), [campiSport])

  const giorni = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(inizioSettimana, i)),
    [inizioSettimana],
  )
  const daIso = inizioSettimana.toISOString()
  const aIso = addDays(inizioSettimana, 7).toISOString()
  const pren = usePrenotazioniAdminIntervallo(idCampi, daIso, aIso)

  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    return m
  }, [sociQuery.data])

  // Prenotazioni per giorno (ymd) e partecipanti per prenotazione.
  const prenPerGiorno = new Map<string, MiaPrenotazione[]>()
  for (const p of pren.data?.lista ?? []) {
    const k = ymd(new Date(p.inizio))
    if (!prenPerGiorno.has(k)) prenPerGiorno.set(k, [])
    prenPerGiorno.get(k)!.push(p)
  }
  const partsByPren = new Map<string, Partecipante[]>()
  for (const r of pren.data?.parts ?? []) {
    const k = String(r.prenotazione_id)
    if (!partsByPren.has(k)) partsByPren.set(k, [])
    partsByPren.get(k)!.push(r)
  }

  // Una prenotazione è "confermato" se ha partecipanti e sono tutti confermati,
  // altrimenti è "attesa" (da confermare).
  const statoPren = (prenId: number | string): 'confermato' | 'attesa' => {
    const parts = partsByPren.get(String(prenId)) ?? []
    return parts.length > 0 && parts.every((p) => p.confermato) ? 'confermato' : 'attesa'
  }

  const aggiorna = () => {
    qc.invalidateQueries({ queryKey: ['pren-admin'] })
    qc.invalidateQueries({ queryKey: ['prenotazioni'] })
  }
  const aggiornaSaldi = () => {
    qc.invalidateQueries({ queryKey: ['soci'] })
    qc.invalidateQueries({ queryKey: ['saldo-crediti'] })
    qc.invalidateQueries({ queryKey: ['riepilogo-stat'] })
    qc.invalidateQueries({ queryKey: ['storico-movimenti'] })
  }

  const aggiungi = useMutation({
    mutationFn: async ({ prenId, socioId }: { prenId: number | string; socioId: string }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .upsert([{ prenotazione_id: prenId, socio_id: socioId, confermato: false }], {
          onConflict: 'prenotazione_id,socio_id',
          ignoreDuplicates: true,
        })
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Aggiunta non riuscita: ' + messaggioErrore(e)),
  })

  const aggiungiOspite = useMutation({
    mutationFn: async ({ prenId, nome }: { prenId: number | string; nome: string }) => {
      const { error } = await supabase.from('partecipanti_amichevole').insert({
        prenotazione_id: prenId,
        socio_id: null,
        nome_manuale: nome,
        confermato: false,
      })
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) =>
      window.alert(
        mancaColonnaManuale(e)
          ? 'Per aggiungere ospiti esegui lo script tappa15-partecipanti-id.sql su Supabase.'
          : 'Aggiunta non riuscita: ' + messaggioErrore(e),
      ),
  })

  const rimuovi = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('partecipanti_amichevole').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Rimozione non riuscita: ' + messaggioErrore(e)),
  })

  // Conferma/annulla presenza + punti/crediti.
  const conferma = useMutation({
    mutationFn: async ({
      part,
      pren: p,
      valore,
    }: {
      part: Partecipante
      pren: MiaPrenotazione
      valore: boolean
    }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .update({ confermato: valore })
        .eq('id', part.id)
      if (error) throw error
      if (part.socio_id && valoriQuery.data) {
        if (valore)
          await assegnaPuntiPresenza(
            p,
            part.socio_id,
            sport,
            valoriQuery.data,
            !!modalitaPremiQuery.data,
            intervalliQuery.data ?? [],
          )
        else await annullaPuntiPresenza(p.id, part.socio_id)
      }
    },
    onSuccess: () => {
      aggiorna()
      aggiornaSaldi()
    },
    onError: (e: unknown) => window.alert('Operazione non riuscita: ' + messaggioErrore(e)),
  })

  // Crea una prenotazione su uno slot libero (organizzatore = admin). La durata
  // (in minuti) la decide chi prenota: 90 = default, 60 = allenamento da 1h.
  const crea = useMutation({
    mutationFn: async ({
      campo,
      inizio,
      durataMin,
      allenamento,
      istruttoreId,
    }: {
      campo: Campo
      inizio: Date
      durataMin: number
      allenamento: boolean
      istruttoreId?: string
    }) => {
      const fine = new Date(inizio.getTime() + durataMin * 60000)
      const dati: Record<string, unknown> = {
        campo_id: campo.id,
        socio_id: profilo!.id,
        inizio: inizio.toISOString(),
        fine: fine.toISOString(),
      }
      if (allenamento) {
        dati.allenamento = true
        dati.allenatore_id = istruttoreId ?? profilo!.id
      }
      const { data, error } = await supabase.from('prenotazioni').insert(dati).select('*').single()
      if (error) throw error
      return data as MiaPrenotazione
    },
    onSuccess: (data) => {
      aggiorna()
      // La finestra passa subito alla gestione della prenotazione appena creata.
      setSlot((s) => (s ? { ...s, booking: data } : null))
    },
    onError: (e: unknown) => {
      const err = e as { code?: string }
      if (err.code === '23505') window.alert('Questo slot è appena stato prenotato.')
      else if (err.code === '23514')
        window.alert(
          'Il database non accetta una durata diversa da 1h30 (vincolo CHECK sulla tabella prenotazioni): serve una modifica. Segnalamelo.',
        )
      else if (err.code === '42501')
        window.alert(
          'Il database ha rifiutato la prenotazione (probabilmente perché nel passato): serve una modifica alle regole RLS. Segnalamelo.',
        )
      else window.alert('Prenotazione non riuscita: ' + messaggioErrore(e))
    },
  })

  const annulla = useMutation({
    mutationFn: async (prenId: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', prenId)
      if (error) throw error
    },
    onSuccess: () => {
      aggiorna()
      setSlot(null)
    },
    onError: (e: unknown) => window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })

  const modificaIstruttore = useMutation({
    mutationFn: async ({ prenId, istruttoreId }: { prenId: number | string; istruttoreId: string }) => {
      const { error } = await supabase
        .from('prenotazioni')
        .update({ allenatore_id: istruttoreId })
        .eq('id', prenId)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Modifica istruttore non riuscita: ' + messaggioErrore(e)),
  })

  // (Fase 8g · B) Modifica manuale degli orari di una prenotazione esistente.
  const modificaOrario = useMutation({
    mutationFn: async ({
      id,
      inizio,
      fine,
    }: {
      id: number | string
      inizio: Date
      fine: Date
    }) => {
      const { error } = await supabase
        .from('prenotazioni')
        .update({ inizio: inizio.toISOString(), fine: fine.toISOString() })
        .eq('id', id)
      if (error) throw error
      return { inizio, fine }
    },
    onSuccess: ({ inizio, fine }) => {
      aggiorna()
      setEditOrario(false)
      // Riflette subito i nuovi orari nell'intestazione e nella prenotazione aperta.
      setSlot((s) =>
        s && s.booking
          ? {
              ...s,
              inizio,
              fine,
              booking: { ...s.booking, inizio: inizio.toISOString(), fine: fine.toISOString() },
            }
          : s,
      )
    },
    onError: (e: unknown) => {
      const err = e as { code?: string }
      if (err.code === '23505') window.alert('In quell’orario il campo risulta già occupato.')
      else if (err.code === '23514')
        window.alert(
          'Il database non accetta questa durata (vincolo CHECK sulla tabella prenotazioni): serve una modifica. Segnalamelo.',
        )
      else if (err.code === '42501')
        window.alert('Il database ha rifiutato la modifica (regole RLS): segnalamelo.')
      else window.alert('Modifica orario non riuscita: ' + messaggioErrore(e))
    },
  })

  // Chiude la finestra e, con essa, l'eventuale editor degli orari.
  const chiudiFinestra = () => {
    setSlot(null)
    setEditOrario(false)
  }

  const [msgCsv, setMsgCsv] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [csvDal, setCsvDal] = useState('')
  const [csvAl, setCsvAl] = useState('')

  const esportaCsv = useMutation({
    mutationFn: async () => {
      // Fetch tutte le prenotazioni con il nome del campo.
      let q = supabase
        .from('prenotazioni')
        .select('*, campo:campi(nome, sport)')
        .order('inizio', { ascending: false })
      if (csvDal) q = q.gte('inizio', csvDal + 'T00:00:00')
      if (csvAl)  q = q.lte('inizio', csvAl  + 'T23:59:59')
      const { data: pren, error } = await q
      if (error) throw error
      const lista = (pren ?? []) as Array<Record<string, unknown> & {
        id: number | string
        campo: { nome: string; sport: string } | null
        incontro_id?: number | string | null
        allenamento?: boolean | null
      }>
      if (!lista.length) return { vuoto: true }

      // Fetch partecipanti per tutte le prenotazioni.
      const ids = lista.map((p) => p.id)
      const { data: parts } = await supabase
        .from('partecipanti_amichevole')
        .select('prenotazione_id, socio_id, nome_manuale, confermato')
        .in('prenotazione_id', ids)
      const partsByPren = new Map<string, Array<{ socio_id: string | null; nome_manuale: string | null; confermato: boolean }>>()
      for (const r of (parts ?? []) as Array<{ prenotazione_id: number | string; socio_id: string | null; nome_manuale: string | null; confermato: boolean }>) {
        const k = String(r.prenotazione_id)
        if (!partsByPren.has(k)) partsByPren.set(k, [])
        partsByPren.get(k)!.push(r)
      }

      // Mappa socio_id → nome leggibile.
      const nomi = new Map<string, string>()
      for (const s of sociQuery.data ?? []) nomi.set(s.id, s.etichetta)

      const due = (n: number) => String(n).padStart(2, '0')
      function fmtData(iso: string) {
        const d = new Date(iso)
        return `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()}`
      }
      function fmtOra(iso: string) {
        const d = new Date(iso)
        return `${due(d.getHours())}:${due(d.getMinutes())}`
      }

      const righe = lista.map((p) => {
        const pp = partsByPren.get(String(p.id)) ?? []
        const tipo = p.incontro_id ? 'Torneo' : p.allenamento ? 'Allenamento' : 'Partita'
        const nomeCampo = p.campo ? (p.campo as { nome: string }).nome : ''
        const sportCampo = p.campo ? (p.campo as { sport: string }).sport : ''
        const prenotante = p.socio_id ? (nomi.get(p.socio_id as string) ?? String(p.socio_id)) : ''
        const partecipanti = pp
          .map((r) => r.socio_id ? (nomi.get(r.socio_id) ?? r.socio_id) : (r.nome_manuale ?? 'Ospite'))
          .join(', ')
        const confermati = pp.length > 0 && pp.every((r) => r.confermato) ? 'Sì' : 'No'
        return {
          Data: fmtData(p.inizio as string),
          Inizio: fmtOra(p.inizio as string),
          Fine: fmtOra(p.fine as string),
          Campo: nomeCampo,
          Sport: sportCampo,
          Tipo: tipo,
          Prenotante: prenotante,
          Partecipanti: partecipanti,
          'Presenze confermate': confermati,
        }
      })

      const csv = costruisciCsv(righe as Record<string, unknown>[])
      scaricaCsv('storico_prenotazioni.csv', csv)
      return { vuoto: false }
    },
    onSuccess: (r) =>
      setMsgCsv(
        r?.vuoto
          ? { tipo: 'errore', testo: 'Nessuna prenotazione da esportare.' }
          : { tipo: 'ok', testo: 'CSV scaricato.' },
      ),
    onError: (e: unknown) =>
      setMsgCsv({ tipo: 'errore', testo: 'Esportazione non riuscita: ' + messaggioErrore(e) }),
  })

  if (!profilo) return null

  const adesso = new Date()
  const oggiStr = ymd(new Date())
  const candidati = sociQuery.data ?? []
  const meseLabel =
    giorni[0].getMonth() === giorni[6].getMonth()
      ? giorni[0].toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      : `${giorni[0].toLocaleDateString('it-IT', { month: 'short' })} – ${giorni[6].toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`

  const prenGiorno = prenPerGiorno.get(giornoSel) ?? []
  const labelGiornoSel = new Date(`${giornoSel}T00:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Prenotazione aggiornata dello slot aperto (per riflettere i partecipanti).
  const bookingSlot =
    slot?.booking != null
      ? (prenGiorno.find((p) => String(p.id) === String(slot.booking!.id)) ?? slot.booking)
      : null

  return (
    <div>
      <div className="eyebrow">Prenotazioni</div>

      {/* Sport */}
      <nav className="mb-3 flex gap-1.5" aria-label="Sport">
        <button
          type="button"
          className={'subtab-btn' + (sport === 'padel' ? ' attivo' : '')}
          onClick={() => setSport('padel')}
        >
          🎾 Padel
        </button>
        <button
          type="button"
          className={'subtab-btn' + (sport === 'calcio' ? ' attivo' : '')}
          onClick={() => setSport('calcio')}
        >
          ⚽ Calcio
        </button>
      </nav>

      {/* Calendario settimanale */}
      <div className="cal-sett">
        <div className="cal-sett-head">
          <div className="cal-sett-mese">{meseLabel}</div>
          <div className="cal-sett-nav">
            <button
              type="button"
              className="btn btn-secondario btn-mini !mt-0"
              onClick={() => setInizioSettimana((s) => addDays(s, -7))}
              title="Settimana precedente"
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn-secondario btn-mini !mt-0"
              onClick={() => {
                setInizioSettimana(lunedi(new Date()))
                setGiornoSel(ymd(new Date()))
              }}
            >
              Oggi
            </button>
            <button
              type="button"
              className="btn btn-secondario btn-mini !mt-0"
              onClick={() => setInizioSettimana((s) => addDays(s, 7))}
              title="Settimana successiva"
            >
              ›
            </button>
          </div>
        </div>

        <div className="cal-sett-griglia">
          {giorni.map((d, i) => {
            const key = ymd(d)
            const conta = prenPerGiorno.get(key)?.length ?? 0
            const classi =
              'cal-giorno' + (key === oggiStr ? ' oggi' : '') + (key === giornoSel ? ' sel' : '')
            return (
              <button type="button" key={key} className={classi} onClick={() => setGiornoSel(key)}>
                <span className="cal-giorno-dow">{DOW[i]}</span>
                <span className="cal-giorno-num">{d.getDate()}</span>
                {conta > 0 && <span className="cal-giorno-badge">{conta}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabellone del giorno selezionato */}
      <div className="eyebrow capitalize">{labelGiornoSel}</div>
      {pren.isLoading || campiQuery.isLoading ? (
        <p className="sub">Caricamento…</p>
      ) : pren.error && mancaTabella(pren.error, 'partecipanti_amichevole') ? (
        <p className="sub">
          Funzione non ancora attiva: esegui lo script{' '}
          <code className="rounded bg-verde-50 px-1">tappa3a-amichevoli.sql</code> su Supabase.
        </p>
      ) : pren.error ? (
        <p className="sub">Impossibile caricare le prenotazioni: {messaggioErrore(pren.error)}</p>
      ) : campiSport.length === 0 ? (
        <p className="sub">Nessun campo {sport} configurato.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-2">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-3.5 w-1 rounded-sm" style={{ background: 'var(--v700)' }} />
              Partita
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-3.5 w-1 rounded-sm" style={{ background: 'var(--g500)' }} />
              Allenamento
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-3.5 w-1 rounded-sm" style={{ background: 'var(--terra)' }} />
              Torneo
            </span>
            <span className="text-ink-3">·</span>
            <span className="flex items-center gap-1.5">
              <i
                className="inline-block h-3.5 w-3.5 rounded-full"
                style={{ background: 'var(--ok, #2e9e5b)' }}
              />
              Confermato
            </span>
            <span className="flex items-center gap-1.5">
              <i
                className="inline-block h-3.5 w-3.5 rounded-full border-2"
                style={{ borderColor: 'var(--g500)' }}
              />
              Da confermare
            </span>
          </div>
          {campiSport.map((campo) => (
          <CampoSlots
            key={campo.id}
            campo={campo}
            giorno={giornoSel}
            adesso={adesso}
            prenotazioni={prenGiorno.filter((p) => String(p.campo_id) === String(campo.id))}
            etichette={etichette}
            statoDi={statoPren}
            onSlot={(inizio, fine, booking, disponibileMin) => {
              setEditOrario(false)
              setSlot({ campo, inizio, fine, booking, disponibileMin })
            }}
          />
          ))}
        </>
      )}

      {/* Storico CSV */}
      {profilo.is_admin && (
        <div className="mt-8 border-t border-verde-100 pt-6">
          <div className="eyebrow">Storico prenotazioni</div>
          <div className="card">
            <p className="sub m-0 mb-3">
              Scarica un CSV con tutte le prenotazioni effettuate, inclusi partecipanti e stato presenze.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="etichetta !mb-1">Dal</span>
                <input
                  type="date"
                  max="9999-12-31"
                  className="campo !mt-0 !w-auto"
                  value={csvDal}
                  onChange={(e) => { setCsvDal(e.target.value); setMsgCsv(null) }}
                />
              </label>
              <label className="block">
                <span className="etichetta !mb-1">Al</span>
                <input
                  type="date"
                  max="9999-12-31"
                  className="campo !mt-0 !w-auto"
                  value={csvAl}
                  onChange={(e) => { setCsvAl(e.target.value); setMsgCsv(null) }}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondario !mt-0"
                disabled={esportaCsv.isPending}
                onClick={() => { setMsgCsv(null); esportaCsv.mutate() }}
              >
                {esportaCsv.isPending ? 'Preparazione…' : 'Scarica CSV'}
              </button>
            </div>
            {msgCsv && (
              <p className={`mt-3 ${msgCsv.tipo === 'ok' ? classiOk : classiErrore}`}>
                {msgCsv.testo}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Finestra dello slot */}
      {slot && (
        <div
          className="fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain bg-black/40 p-4"
          onClick={chiudiFinestra}
        >
          <div className="card my-auto w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-verde-100 pb-3">
              <div>
                <h2 className="m-0 text-lg font-bold">{slot.campo.nome}</h2>
                <p className="sub m-0 flex items-center gap-1 capitalize">
                  <span>
                    {slot.inizio.toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}{' '}
                    · {oraLocale(slot.inizio)}–{oraLocale(slot.fine)}
                  </span>
                  {/* (Fase 8g · B) Matita accanto all'orario: apre l'editor. */}
                  {bookingSlot && (
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-2 transition hover:bg-black/5 hover:text-verde-700"
                      title="Modifica orario"
                      aria-label="Modifica orario"
                      onClick={() => setEditOrario(true)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  )}
                </p>
              </div>
              <button type="button" className="x text-2xl" title="Chiudi" onClick={chiudiFinestra}>
                ×
              </button>
            </div>

            {bookingSlot ? (
              <>
              <ModificaOrario
                key={String(bookingSlot.id)}
                aperto={editOrario}
                onChiudi={() => setEditOrario(false)}
                pren={bookingSlot}
                campo={slot.campo}
                altre={prenGiorno.filter(
                  (p) =>
                    String(p.campo_id) === String(slot.campo.id) &&
                    String(p.id) !== String(bookingSlot.id),
                )}
                disabilitato={modificaOrario.isPending}
                onSalva={(inizio, fine) =>
                  modificaOrario.mutate({ id: bookingSlot.id, inizio, fine })
                }
              />
              {bookingSlot.allenamento && istruttori.length > 0 && (
                <CambiaIstruttore
                  key={`istr-${bookingSlot.id}-${bookingSlot.allenatore_id ?? ''}`}
                  istruttoreAttualeId={bookingSlot.allenatore_id ?? ''}
                  istruttori={istruttori}
                  disabilitato={modificaIstruttore.isPending}
                  onSalva={(istrId) =>
                    modificaIstruttore.mutate({ prenId: bookingSlot.id, istruttoreId: istrId })
                  }
                />
              )}
              <SchedaPartita
                sport={sport}
                pren={bookingSlot}
                campo={slot.campo}
                partecipanti={partsByPren.get(String(bookingSlot.id)) ?? []}
                etichette={etichette}
                candidati={candidati}
                staff
                mioId={profilo.id}
                amiciVuoti={false}
                confermaCliccando
                inModale
                onAggiungi={(socioId) => aggiungi.mutate({ prenId: bookingSlot.id, socioId })}
                onAggiungiOspite={(nome) => aggiungiOspite.mutate({ prenId: bookingSlot.id, nome })}
                onConferma={(part, valore) =>
                  conferma.mutate({ part, pren: bookingSlot, valore })
                }
                onRimuovi={(part) => rimuovi.mutate(part.id)}
                onAnnulla={() => {
                  if (window.confirm(`Annullare la prenotazione su ${slot.campo.nome}?`))
                    annulla.mutate(bookingSlot.id)
                }}
              />
              </>
            ) : (
              <SlotLibero
                disponibileMin={slot.disponibileMin}
                disabilitato={crea.isPending}
                istruttori={istruttori}
                onCrea={(allenamento, durataMin, istruttoreId) =>
                  crea.mutate({ campo: slot.campo, inizio: slot.inizio, durataMin, allenamento, istruttoreId })
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Slot di un campo per il giorno scelto: sequenza dinamica (vedi costruisciSlots)
// con i tempi liberi che si adattano alle durate reali delle prenotazioni.
function CampoSlots({
  campo,
  giorno,
  adesso,
  prenotazioni,
  etichette,
  statoDi,
  onSlot,
}: {
  campo: Campo
  giorno: string
  adesso: Date
  prenotazioni: MiaPrenotazione[]
  etichette: Map<string, string>
  statoDi: (prenId: number | string) => 'confermato' | 'attesa'
  onSlot: (
    inizio: Date,
    fine: Date,
    booking: MiaPrenotazione | null,
    disponibileMin: number,
  ) => void
}) {
  const fuoriServizio = campo.in_servizio === false
  const slots = costruisciSlots(campo, giorno, prenotazioni)

  return (
    <div className="campo-blocco">
      <div className="campo-titolo">
        {campo.nome}
        {fuoriServizio && <span className="pill off">Fuori servizio</span>}
      </div>

      {fuoriServizio ? (
        <p className="sub">
          {campo.nota_servizio
            ? 'Campo momentaneamente sospeso: ' + campo.nota_servizio
            : 'Campo momentaneamente sospeso.'}
        </p>
      ) : (
        <div className="slot-griglia">
          {slots.map((s) => {
            const p = s.booking
            const passato = s.inizio <= adesso

            let classe = 'slot'
            let chi: string
            let stato: 'confermato' | 'attesa' | null = null
            if (p) {
              stato = statoDi(p.id)
              const tipo = p.incontro_id ? 'torneo' : p.allenamento ? 'allenamento' : 'partita'
              classe += ' occupato gestibile tipo-' + tipo
              chi = p.incontro_id
                ? 'Torneo'
                : p.allenamento
                  ? 'Allenamento'
                  : cogIniz(etichette.get(p.socio_id) ?? 'Prenotato')
            } else {
              // Blocco libero "corto" (< 1h30): buco fra prenotazioni, colore diverso.
              classe += ' libero' + (passato ? ' libero-passato' : '')
              if (s.disponibileMin < SLOT_DEF) classe += ' corto'
              chi = 'Libero'
            }

            return (
              <button
                key={`${s.inizio.getTime()}-${p?.id ?? 'free'}`}
                type="button"
                className={classe}
                onClick={() => onSlot(s.inizio, s.fine, p, s.disponibileMin)}
              >
                <span>
                  {oraLocale(s.inizio)}–{oraLocale(s.fine)}
                </span>
                <span className="chi">
                  <span className="chi-t">{chi}</span>
                  {stato === 'confermato' && (
                    <svg
                      className="chi-ok"
                      viewBox="0 0 24 24"
                      aria-label="Presenze confermate"
                      role="img"
                    >
                      <path d="M5 12.5l4 4L19 7" />
                    </svg>
                  )}
                  {stato === 'attesa' && <span className="chi-att" title="Da confermare" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Durata leggibile (es. 90 -> "1h 30min", 60 -> "1h").
function durataLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return (h ? `${h}h` : '') + (m ? ` ${m}min` : '')
}

// (Fase 8g · B) Editor degli orari di una prenotazione esistente. Lo apre la
// matita accanto all'orario nell'intestazione (stato `aperto` nel padre); mostra
// le tendine Inizio/Fine e valida la scelta (durata minima, dentro l'apertura
// del campo, nessuna sovrapposizione).
function ModificaOrario({
  pren,
  campo,
  altre,
  aperto,
  disabilitato,
  onChiudi,
  onSalva,
}: {
  pren: MiaPrenotazione
  campo: Campo
  altre: MiaPrenotazione[]
  aperto: boolean
  disabilitato: boolean
  onChiudi: () => void
  onSalva: (inizio: Date, fine: Date) => void
}) {
  const giorno = ymd(new Date(pren.inizio))
  const [oraInizio, setOraInizio] = useState(hhmm(new Date(pren.inizio)))
  const [oraFine, setOraFine] = useState(hhmm(new Date(pren.fine)))
  const [errore, setErrore] = useState<string | null>(null)

  const apertura = (campo.apertura || '08:00').slice(0, 5)
  const chiusura = (campo.chiusura || '22:00').slice(0, 5)

  function salva() {
    setErrore(null)
    const iMin = minutiDa(oraInizio)
    const fMin = minutiDa(oraFine)
    if (fMin - iMin < 30) {
      setErrore('La fine deve venire almeno 30 minuti dopo l’inizio.')
      return
    }
    if (iMin < minutiDa(apertura) || fMin > minutiDa(chiusura)) {
      setErrore(`Orario fuori dall’apertura del campo (${apertura}–${chiusura}).`)
      return
    }
    // Sovrapposizione con un'altra prenotazione dello stesso campo, stesso giorno.
    for (const a of altre) {
      const ai = new Date(a.inizio)
      const af = new Date(a.fine)
      const aiMin = ai.getHours() * 60 + ai.getMinutes()
      const afMin = af.getHours() * 60 + af.getMinutes()
      if (iMin < afMin && fMin > aiMin) {
        setErrore('Il nuovo orario si sovrappone a un’altra prenotazione del campo.')
        return
      }
    }
    onSalva(dataConOra(giorno, oraInizio), dataConOra(giorno, oraFine))
  }

  if (!aperto) return null

  return (
    <div className="mb-4 rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="etichetta !mb-1">Inizio</span>
          <SelettoreOra
            valore={oraInizio}
            onChange={(v) => {
              setOraInizio(v)
              setErrore(null)
            }}
          />
        </label>
        <label className="block">
          <span className="etichetta !mb-1">Fine</span>
          <SelettoreOra
            valore={oraFine}
            onChange={(v) => {
              setOraFine(v)
              setErrore(null)
            }}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className="btn btn-mini !mt-0" disabled={disabilitato} onClick={salva}>
          Salva orario
        </button>
        <button
          type="button"
          className="btn btn-secondario btn-mini !mt-0"
          onClick={() => {
            setErrore(null)
            setOraInizio(hhmm(new Date(pren.inizio)))
            setOraFine(hhmm(new Date(pren.fine)))
            onChiudi()
          }}
        >
          Annulla
        </button>
      </div>
      {errore && <p className={`mt-2 ${classiErrore}`}>{errore}</p>}
    </div>
  )
}

// Due tendine HH : MM (minuti 00/15/30/45, più il minuto corrente se diverso).
function SelettoreOra({ valore, onChange }: { valore: string; onChange: (v: string) => void }) {
  const [h, m] = valore.split(':')
  const minuti = MINUTI.includes(m) ? MINUTI : [...MINUTI, m].sort()
  return (
    <span className="inline-flex items-center gap-1">
      <select
        className="campo !mt-0 !w-auto"
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
      >
        {ORE.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="text-ink-3">:</span>
      <select
        className="campo !mt-0 !w-auto"
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
      >
        {minuti.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </span>
  )
}

function CambiaIstruttore({
  istruttoreAttualeId,
  istruttori,
  disabilitato,
  onSalva,
}: {
  istruttoreAttualeId: string
  istruttori: { id: string; etichetta: string }[]
  disabilitato: boolean
  onSalva: (istruttoreId: string) => void
}) {
  const [istrId, setIstrId] = useState(istruttoreAttualeId)
  const cambiato = istrId !== istruttoreAttualeId

  return (
    <div className="mb-4 rounded-xl border border-dashed border-verde-200 bg-verde-50 px-4 py-3">
      <span className="etichetta !mb-1 block">Istruttore</span>
      <div className="flex items-center gap-2">
        <select
          className="campo !mt-0 flex-1"
          value={istrId}
          onChange={(e) => setIstrId(e.target.value)}
        >
          <option value="">— Nessuno —</option>
          {istruttori.map((i) => (
            <option key={i.id} value={i.id}>
              {i.etichetta}
            </option>
          ))}
        </select>
        {cambiato && istrId && (
          <button
            type="button"
            className="btn btn-mini !mt-0"
            disabled={disabilitato}
            onClick={() => onSalva(istrId)}
          >
            Salva
          </button>
        )}
      </div>
    </div>
  )
}

function SlotLibero({
  disponibileMin,
  disabilitato,
  istruttori,
  onCrea,
}: {
  disponibileMin: number
  disabilitato: boolean
  istruttori: { id: string; etichetta: string }[]
  onCrea: (allenamento: boolean, durataMin: number, istruttoreId?: string) => void
}) {
  const puo90 = disponibileMin >= 90
  const puo60 = disponibileMin >= 60
  const [istrId, setIstrId] = useState('')

  return (
    <div>
      <p className="sub mb-3">Slot libero ({durataLabel(disponibileMin)} disponibili). Cosa crei?</p>
      {puo90 && (
        <button
          type="button"
          className="btn btn-block mb-2"
          disabled={disabilitato}
          onClick={() => onCrea(false, 90)}
        >
          Prenotazione campo
        </button>
      )}
      {puo60 && (
        <>
          {istruttori.length > 0 && (
            <div className="mb-2">
              <label className="etichetta !mb-1">Istruttore</label>
              <select
                className="campo !mt-0 w-full"
                value={istrId}
                onChange={(e) => setIstrId(e.target.value)}
              >
                <option value="">— Seleziona istruttore —</option>
                {istruttori.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.etichetta}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            className="btn btn-secondario btn-block"
            disabled={disabilitato || (istruttori.length > 0 && !istrId)}
            onClick={() => onCrea(true, 60, istrId || undefined)}
          >
            🏋️ Allenamento · 1h
          </button>
          {istruttori.length > 0 && !istrId && (
            <p className="mt-1.5 text-xs text-ink-3">Seleziona un istruttore per creare l'allenamento.</p>
          )}
        </>
      )}
      {!puo60 && (
        <p className="sub">Spazio troppo corto ({durataLabel(disponibileMin)}) per una sessione.</p>
      )}
    </div>
  )
}
