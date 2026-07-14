import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { SportIcona } from '@/components/IconeSport'
import { TipoAttivitaIcona } from '@/components/IconeAttivita'
import { IconaMeteo } from '@/components/IconeMeteo'
import { useMeteo } from '@/hooks/useMeteo'
import { useCampi } from './datiPrenotazioni'
import { useMieLezioni, useSociEtichette, useSociPubblici } from './datiAmichevoli'
import { oraLocale, ymd } from './orari'
import GestioneDisponibilita from '@/features/lezioni/GestioneDisponibilita'
import RichiesteLezioneSezione from '@/features/lezioni/RichiesteLezioneSezione'
import CreaLezioneGruppo from '@/features/lezioni/CreaLezioneGruppo'
import { MenuAmici } from './MieAmichevoli'
import type { MiaPrenotazione, Partecipante } from './datiAmichevoli'
import type { Campo } from './tipi'

const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

// Ripiego quando non c'è previsione per quel giorno (oltre i 16 giorni
// coperti da Open-Meteo, vedi useMeteo.ts): stessa icona generica di
// AttivitaInProgramma.tsx, per restare identici.
const ICONA_GIORNO_GENERICA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
  </svg>
)

// Pagina "Le tue lezioni" dell'istruttore (raggiunta dalla scheda omonima in
// Area Club, vedi GestioneLezioniPagina.tsx): le sue disponibilità (Fase 4),
// l'elenco degli allenamenti di cui è istruttore, per tutti gli sport (non
// filtrato, a differenza di prima quando viveva dentro la pagina per-sport).
// L'istruttore gestisce direttamente i propri allenamenti — annullamento e
// aggiunta/rimozione dei giocatori — ma non le presenze (quelle restano ad
// admin/collaboratore, vedi GestionePrenotazioni.tsx): le policy RLS dedicate
// (tappa37/tappa55) già lo permettevano, mancava solo l'interfaccia.
export default function VistaLezioni() {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const campiQuery = useCampi()
  const meteoQuery = useMeteo()
  // soci_etichette (non soci_pubblici): un allievo già in una lezione
  // registrata deve restare leggibile col vero nome anche se sospeso o
  // se ha cancellato l'account nel frattempo.
  const sociQuery = useSociEtichette()
  // soci_pubblici invece per il menu "aggiungi giocatore": qui servono solo
  // i soci attivi tra cui scegliere, non anche sospesi/cancellati.
  const sociPubbliciQuery = useSociPubblici()

  const idCampi = useMemo(
    () => (campiQuery.data ?? []).map((c) => c.id),
    [campiQuery.data],
  )
  const campiById = useMemo(() => {
    const m = new Map<string, Campo>()
    for (const c of campiQuery.data ?? []) m.set(String(c.id), c)
    return m
  }, [campiQuery.data])

  const lezioni = useMieLezioni(idCampi, profilo?.id ?? '')

  const invalidaLezioni = () => qc.invalidateQueries({ queryKey: ['lezioni', profilo?.id] })

  const annullaAllenamento = useMutation({
    mutationFn: async (prenId: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', prenId)
      if (error) throw error
    },
    onSuccess: invalidaLezioni,
    onError: (e: unknown) => window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })

  const aggiungiGiocatore = useMutation({
    mutationFn: async ({ prenId, socioId }: { prenId: number | string; socioId: string }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .upsert(
          [{ prenotazione_id: prenId, socio_id: socioId, confermato: false }],
          { onConflict: 'prenotazione_id,socio_id', ignoreDuplicates: true },
        )
      if (error) throw error
    },
    onSuccess: invalidaLezioni,
    onError: (e: unknown) => window.alert('Aggiunta non riuscita: ' + messaggioErrore(e)),
  })

  // Nessun id di riga disponibile (stesso limite di AttivitaInProgramma.tsx):
  // la coppia prenotazione+socio identifica comunque in modo univoco la riga.
  const rimuoviGiocatore = useMutation({
    mutationFn: async ({ prenId, socioId }: { prenId: number | string; socioId: string }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .delete()
        .eq('prenotazione_id', prenId)
        .eq('socio_id', socioId)
      if (error) throw error
    },
    onSuccess: invalidaLezioni,
    onError: (e: unknown) => window.alert('Rimozione non riuscita: ' + messaggioErrore(e)),
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
    onSuccess: invalidaLezioni,
    onError: (e: unknown) => window.alert('Aggiunta non riuscita: ' + messaggioErrore(e)),
  })

  const rimuoviOspite = useMutation({
    mutationFn: async ({ prenId, nome }: { prenId: number | string; nome: string }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .delete()
        .eq('prenotazione_id', prenId)
        .is('socio_id', null)
        .eq('nome_manuale', nome)
      if (error) throw error
    },
    onSuccess: invalidaLezioni,
    onError: (e: unknown) => window.alert('Rimozione non riuscita: ' + messaggioErrore(e)),
  })

  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    if (profilo) m.set(profilo.id, `${profilo.nome} ${profilo.cognome}`)
    return m
  }, [sociQuery.data, profilo])

  // Ogni socio attivo tranne l'istruttore stesso: opzioni del menu "+ giocatore".
  const opzioniGiocatori = useMemo(
    () => (sociPubbliciQuery.data ?? []).filter((s) => s.id !== profilo?.id),
    [sociPubbliciQuery.data, profilo?.id],
  )

  if (!profilo) return null
  if (lezioni.isLoading || campiQuery.isLoading) return <p className="sub">Caricamento…</p>
  if (lezioni.error && mancaTabella(lezioni.error, 'partecipanti_amichevole')) {
    return (
      <p className="sub">
        Funzione non ancora attiva: esegui lo script{' '}
        <code className="rounded bg-verde-50 px-1">tappa3a-amichevoli.sql</code> su Supabase.
      </p>
    )
  }
  if (lezioni.error) {
    return <p className="sub">Impossibile caricare le lezioni: {messaggioErrore(lezioni.error)}</p>
  }

  const lista = lezioni.data?.lista ?? []

  const partsByPren = new Map<string, Partecipante[]>()
  for (const r of lezioni.data?.parts ?? []) {
    const k = String(r.prenotazione_id)
    if (!partsByPren.has(k)) partsByPren.set(k, [])
    partsByPren.get(k)!.push(r)
  }

  return (
    <div>
      <RichiesteLezioneSezione istruttoreId={profilo.id} etichette={etichette} />

      <CreaLezioneGruppo istruttoreId={profilo.id} sport={profilo.sport_preferito} />

      {lista.length === 0 ? (
        <p className="sub mt-3">
          Non hai lezioni in programma. Gli allenamenti di cui sei istruttore compariranno qui.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((p) => (
            <SchedaLezioneVista
              key={p.id}
              pren={p}
              campo={campiById.get(String(p.campo_id))}
              partecipanti={partsByPren.get(String(p.id)) ?? []}
              etichette={etichette}
              opzioniGiocatori={opzioniGiocatori}
              previsione={meteoQuery.data?.get(ymd(new Date(p.inizio)))}
              onAnnulla={() => annullaAllenamento.mutate(p.id)}
              annullaPending={annullaAllenamento.isPending}
              onAggiungiGiocatore={(socioId) => aggiungiGiocatore.mutate({ prenId: p.id, socioId })}
              onRimuoviGiocatore={(socioId) => rimuoviGiocatore.mutate({ prenId: p.id, socioId })}
              onAggiungiOspite={(nome) => aggiungiOspite.mutate({ prenId: p.id, nome })}
              onRimuoviOspite={(nome) => rimuoviOspite.mutate({ prenId: p.id, nome })}
            />
          ))}
        </div>
      )}

      {/* Sempre in fondo alla pagina, dopo l'elenco degli allenamenti — non
          più la prima cosa che si vede aprendo "Le tue lezioni". */}
      <GestioneDisponibilita istruttoreId={profilo.id} sport={profilo.sport_preferito} />
    </div>
  )
}

// Scheda di un allenamento: l'istruttore può annullarlo e aggiungere/
// togliere giocatori (o ospiti non registrati), ma non toccare le presenze
// (niente "conferma", quella resta ad admin/collaboratore).
function SchedaLezioneVista({
  pren,
  campo,
  partecipanti,
  etichette,
  opzioniGiocatori,
  previsione,
  onAnnulla,
  annullaPending,
  onAggiungiGiocatore,
  onRimuoviGiocatore,
  onAggiungiOspite,
  onRimuoviOspite,
}: {
  pren: MiaPrenotazione
  campo: Campo | undefined
  partecipanti: Partecipante[]
  etichette: Map<string, string>
  opzioniGiocatori: { id: string; etichetta: string }[]
  previsione: { weathercode: number; tempMax: number } | undefined
  onAnnulla: () => void
  annullaPending: boolean
  onAggiungiGiocatore: (socioId: string) => void
  onRimuoviGiocatore: (socioId: string) => void
  onAggiungiOspite: (nome: string) => void
  onRimuoviOspite: (nome: string) => void
}) {
  const inizio = new Date(pren.inizio)
  const fine = new Date(pren.fine)
  const giornoLabel = inizio.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  const lista = [...partecipanti].sort((a, b) => Number(b.confermato) - Number(a.confermato))
  const giaIds = new Set(lista.map((r) => r.socio_id).filter((id): id is string => !!id))
  const selezionabili = opzioniGiocatori.filter((s) => !giaIds.has(s.id))

  const menuAggiungi = (
    <MenuAmici
      opzioni={selezionabili}
      onScegli={onAggiungiGiocatore}
      onOspite={onAggiungiOspite}
      ariaLabel="Aggiungi un giocatore all'allenamento"
      testoVuoto="Nessun giocatore trovato."
    />
  )

  return (
    <div className="amichevole-riga att-wow att-wow-bianco">
      <div className="att-wow-giorno">
        <span>{giornoLabel}</span>
        <span className="att-wow-meteo">
          {previsione ? (
            <>
              <IconaMeteo codice={previsione.weathercode} size={16} />
              {Math.round(previsione.tempMax)}°
            </>
          ) : (
            ICONA_GIORNO_GENERICA
          )}
        </span>
      </div>

      <div className="amichevole-cap">
        <div>
          <div className="orario orario-blu">
            {oraLocale(inizio)}–{oraLocale(fine)}
          </div>
          <div className="att-sport">
            {campo && (
              <>
                <span className="att-sport-ic"><SportIcona sport={campo.sport} /></span>
                {SPORT_LABEL[campo.sport] ?? campo.sport}
                <span className="att-parti-sep">·</span>
              </>
            )}
            <span className="att-campo">{campo?.nome ?? 'Campo'}</span>
          </div>
          {pren.lezione_gruppo && <div className="allenamento-badge">Lezione di gruppo</div>}
          {pren.allenatore_id && (
            <div className="dove">Istruttore: {etichette.get(pren.allenatore_id) ?? '—'}</div>
          )}
        </div>
        <TipoAttivitaIcona tipo="allenamento" titolo={pren.lezione_gruppo ? 'Lezione di gruppo' : 'Allenamento'} />
      </div>

      <div className="att-wow-hr" />

      {lista.length === 0 ? (
        <>
          <div className="part-vuoto">Nessun partecipante indicato.</div>
          {menuAggiungi}
        </>
      ) : (
        <div className="chips">
          {lista.map((r) => {
            const nome = r.socio_id ? (etichette.get(r.socio_id) ?? 'Socio') : (r.nome_manuale ?? 'Ospite')
            return (
              <span key={r.id} className={'chip' + (r.confermato ? ' conf' : '')}>
                {nome}
                {!r.socio_id && (
                  <span className="stato" title="Giocatore non registrato">
                    ospite
                  </span>
                )}
                {r.confermato && (
                  <span className="stato" title="Presenza confermata">
                    ✓
                  </span>
                )}
                <button
                  type="button"
                  className="x"
                  title="Togli"
                  onClick={() => {
                    if (!window.confirm(`Rimuovere ${nome} da questo allenamento?`)) return
                    if (r.socio_id) onRimuoviGiocatore(r.socio_id)
                    else onRimuoviOspite(r.nome_manuale!)
                  }}
                >
                  ×
                </button>
              </span>
            )
          })}
          {menuAggiungi}
        </div>
      )}

      <div className="mt-auto">
        <div className="att-wow-hr" />
        <button
          type="button"
          className="btn btn-pericolo btn-mini w-full"
          disabled={annullaPending}
          onClick={() => {
            const quando = giornoLabel + ' alle ' + oraLocale(inizio)
            if (window.confirm(`Annullare l'allenamento (${quando})?`)) onAnnulla()
          }}
        >
          Annulla l'allenamento
        </button>
      </div>
    </div>
  )
}
