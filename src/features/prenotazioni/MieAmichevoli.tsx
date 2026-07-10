import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { useAmici } from '@/features/profilo/amici/useAmici'
import { useValoriPunti } from '@/features/segreteria/datiPunti'
import { useIntervalliCrediti } from '@/features/segreteria/datiIntervalli'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import { useCampi } from './datiPrenotazioni'
import { mancaColonnaManuale, useMieAmichevoli, useSociEtichette, useSociPubblici } from './datiAmichevoli'
import { assegnaPuntiPresenza, annullaPuntiPresenza } from './puntiPresenze'
import { oraLocale } from './orari'
import { TipoAttivitaIcona } from '@/components/IconeAttivita'
import type { MiaPrenotazione, Partecipante } from './datiAmichevoli'
import type { Campo, Sport } from './tipi'

const ICONA_GIORNO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
  </svg>
)

export default function MieAmichevoli({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const campiQuery = useCampi()
  const sociQuery = useSociPubblici()
  const etichetteQuery = useSociEtichette()
  const amiciData = useAmici(profilo?.id ?? '')
  const valoriQuery = useValoriPunti()
  const modalitaPremiQuery = useModalitaPremi()
  const intervalliQuery = useIntervalliCrediti()

  const idCampi = useMemo(
    () => (campiQuery.data ?? []).filter((c) => c.sport === sport).map((c) => c.id),
    [campiQuery.data, sport],
  )
  const campiById = useMemo(() => {
    const m = new Map<string, Campo>()
    for (const c of campiQuery.data ?? []) m.set(String(c.id), c)
    return m
  }, [campiQuery.data])

  const amichevoli = useMieAmichevoli(sport, idCampi, profilo?.id ?? '')

  // Nomi già presenti in una prenotazione (storico): usa soci_etichette, non
  // soci_pubblici, così un partecipante sospeso o cancellato resta leggibile
  // col suo vero nome invece di sparire dietro un placeholder generico.
  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of etichetteQuery.data ?? []) m.set(s.id, s.etichetta)
    if (profilo) m.set(profilo.id, `${profilo.nome} ${profilo.cognome}`)
    return m
  }, [etichetteQuery.data, profilo])

  const aggiorna = () => {
    qc.invalidateQueries({ queryKey: ['amichevoli'] })
    qc.invalidateQueries({ queryKey: ['prenotazioni'] })
  }

  // Dopo aver mosso punti/crediti: aggiorna i saldi e i riepiloghi a video.
  const aggiornaSaldi = () => {
    qc.invalidateQueries({ queryKey: ['soci'] })
    qc.invalidateQueries({ queryKey: ['saldo-crediti'] })
    qc.invalidateQueries({ queryKey: ['riepilogo-stat'] })
    qc.invalidateQueries({ queryKey: ['storico-movimenti'] })
  }

  const aggiungi = useMutation({
    mutationFn: async ({
      prenId,
      socioId,
      primo,
    }: {
      prenId: number | string
      socioId: string
      primo: boolean
    }) => {
      const righe = [{ prenotazione_id: prenId, socio_id: socioId, confermato: false }]
      if (primo && socioId !== profilo!.id) {
        righe.push({ prenotazione_id: prenId, socio_id: profilo!.id, confermato: false })
      }
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .upsert(righe, { onConflict: 'prenotazione_id,socio_id', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => {
      const err = e as { code?: string }
      if (err.code === '42501') {
        window.alert('Puoi aggiungere solo i tuoi amici (e te stesso) alle tue prenotazioni.')
      } else if (mancaTabella(e, 'partecipanti_amichevole')) {
        window.alert('Funzione non ancora attiva: esegui lo script tappa3a-amichevoli.sql su Supabase.')
      } else {
        window.alert('Aggiunta non riuscita: ' + messaggioErrore(e))
      }
    },
  })

  const rimuovi = useMutation({
    // Rimozione per id della riga: funziona anche per gli ospiti (socio_id null).
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('partecipanti_amichevole').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Rimozione non riuscita: ' + messaggioErrore(e)),
  })

  // (Tappa 11) Solo l'admin: aggiunge un ospite non registrato (socio_id null).
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

  // (Tappa 11) Solo l'admin: conferma/annulla la presenza di un partecipante.
  // (Fase 8d) Confermare assegna punti/crediti; annullare li ritoglie. Gli
  // ospiti (socio_id null) non hanno account: nessun punto.
  const conferma = useMutation({
    mutationFn: async ({
      part,
      pren,
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
            pren,
            part.socio_id,
            sport,
            valoriQuery.data,
            !!modalitaPremiQuery.data,
            intervalliQuery.data ?? [],
          )
        else await annullaPuntiPresenza(pren.id, part.socio_id)
      }
    },
    onSuccess: () => {
      aggiorna()
      aggiornaSaldi()
    },
    onError: (e: unknown) => window.alert('Operazione non riuscita: ' + messaggioErrore(e)),
  })

  const annulla = useMutation({
    mutationFn: async (prenId: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', prenId)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })

  if (!profilo) return null
  if (amichevoli.isLoading || campiQuery.isLoading) return <p className="sub">Caricamento…</p>
  if (amichevoli.error && mancaTabella(amichevoli.error, 'partecipanti_amichevole')) {
    return (
      <p className="sub">
        Funzione non ancora attiva: esegui lo script{' '}
        <code className="rounded bg-verde-50 px-1">tappa3a-amichevoli.sql</code> su Supabase.
      </p>
    )
  }
  if (amichevoli.error) {
    return <p className="sub">Impossibile caricare le prenotazioni: {messaggioErrore(amichevoli.error)}</p>
  }

  const lista = amichevoli.data?.lista ?? []
  if (lista.length === 0) {
    return (
      <p className="sub">
        Quando prenoti un campo, qui potrai indicare gli altri giocatori prima della partita. Le
        presenze le conferma poi l'admin.
      </p>
    )
  }

  const partsByPren = new Map<string, Partecipante[]>()
  for (const r of amichevoli.data?.parts ?? []) {
    const k = String(r.prenotazione_id)
    if (!partsByPren.has(k)) partsByPren.set(k, [])
    partsByPren.get(k)!.push(r)
  }

  const staff = !!(profilo.is_allenatore || profilo.is_admin || profilo.e_allenatore)
  const admin = !!profilo.is_admin
  const candidati = staff
    ? (sociQuery.data ?? []).filter((s) => s.id !== profilo.id)
    : amiciData.amici.map((a) => ({ id: a.id, etichetta: a.etichetta }))

  // Raggruppa per giorno.
  const gruppi: { giorno: string; etichetta: string; pren: MiaPrenotazione[] }[] = []
  for (const p of lista) {
    const d = new Date(p.inizio)
    const chiave = d.toDateString()
    let g = gruppi.find((x) => x.giorno === chiave)
    if (!g) {
      g = {
        giorno: chiave,
        etichetta: d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
        pren: [],
      }
      gruppi.push(g)
    }
    g.pren.push(p)
  }

  return (
    <div>
      {gruppi.map((g) => (
        <div key={g.giorno} className="gruppo-giorno">
          <div className="giorno-partite">
            {ICONA_GIORNO}
            <span>{g.etichetta}</span>
          </div>
          <div className="schede-griglia">
            {g.pren.map((p) => (
              <SchedaPartita
                key={p.id}
                sport={sport}
                pren={p}
                campo={campiById.get(String(p.campo_id))}
                partecipanti={partsByPren.get(String(p.id)) ?? []}
                etichette={etichette}
                candidati={candidati}
                staff={staff}
                mioId={profilo.id}
                amiciVuoti={!staff && amiciData.amici.length === 0}
                onAggiungi={(socioId, primo) => aggiungi.mutate({ prenId: p.id, socioId, primo })}
                // Nelle partite normali gli ospiti e la conferma sono solo per l'admin.
                onAggiungiOspite={
                  admin ? (nome) => aggiungiOspite.mutate({ prenId: p.id, nome }) : undefined
                }
                onConferma={
                  admin ? (part, valore) => conferma.mutate({ part, pren: p, valore }) : undefined
                }
                onRimuovi={(part) => rimuovi.mutate(part.id)}
                onAnnulla={() => {
                  const quando =
                    new Date(p.inizio).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    }) +
                    ' alle ' +
                    oraLocale(new Date(p.inizio))
                  const dove = campiById.get(String(p.campo_id))?.nome ?? 'il campo'
                  if (window.confirm(`Annullare la tua prenotazione su ${dove} (${quando})?`))
                    annulla.mutate(p.id)
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SchedaPartita({
  sport,
  pren,
  campo,
  partecipanti,
  etichette,
  candidati,
  staff,
  mioId,
  amiciVuoti,
  onAggiungi,
  onAggiungiOspite,
  onConferma,
  onRimuovi,
  onAnnulla,
  confermaCliccando = false,
  inModale = false,
}: {
  sport: Sport
  pren: MiaPrenotazione
  campo: Campo | undefined
  partecipanti: Partecipante[]
  etichette: Map<string, string>
  candidati: { id: string; etichetta: string }[]
  staff: boolean
  mioId: string
  amiciVuoti: boolean
  onAggiungi: (socioId: string, primo: boolean) => void
  onAggiungiOspite?: (nome: string) => void
  onConferma?: (part: Partecipante, valore: boolean) => void
  onRimuovi: (part: Partecipante) => void
  onAnnulla: () => void
  // (Fase 8g) Modalità admin: la presenza si conferma con un clic sull'icona
  // accanto al nome (la capsula diventa verde), e solo dopo l'orario di inizio.
  confermaCliccando?: boolean
  // Scheda incassata in una finestra (pannello Prenotazioni admin): niente
  // riquadro proprio e niente data/ora/campo (sono già nell'intestazione).
  inModale?: boolean
}) {
  const inizio = new Date(pren.inizio)
  const fine = new Date(pren.fine)
  // È iniziata? Solo allora si possono confermare le presenze (modalità admin).
  const adesso = new Date()
  const iniziata = inizio <= adesso
  const lista = [...partecipanti].sort((a, b) => Number(b.confermato) - Number(a.confermato))
  const giaIds = new Set(lista.map((r) => r.socio_id).filter((x): x is string => !!x))
  const selezionabili = candidati.filter((c) => !giaIds.has(c.id))

  const cap4 = sport === 'padel' && !pren.allenamento && lista.length >= 4
  const disabilita = amiciVuoti
  const testoVuoto = staff ? '— Aggiungi giocatori —' : ''
  // Ha amici ma li ha già aggiunti tutti a questa partita: niente da
  // proporre, si nasconde in silenzio (come a coppie complete) invece di
  // mostrare "Non hai ancora amici", che sarebbe fuorviante.
  const nienteDaAggiungere = !staff && !amiciVuoti && selezionabili.length === 0
  const tipo = pren.allenamento ? 'allenamento' : pren.torneo_nome ? 'torneo' : 'partita'

  return (
    <div className={'amichevole-riga' + (inModale ? ` in-modale tipo-${tipo}` : '')}>
      <div className="amichevole-cap">
        <div className="sp-top">
          <div className="sp-riga1">
            {!inModale && (
              <div className="orario">
                {oraLocale(inizio)}–{oraLocale(fine)}
                {campo && (
                  <>
                    <span className="orario-sep">·</span>
                    <span className="orario-campo">{campo.nome}</span>
                  </>
                )}
              </div>
            )}
            {/* Nella scheda di admin/collaboratori (inModale) il tipo si distingue
                con la striscia laterale colorata sulla card, non con l'icona:
                l'icona resta solo lato giocatore. */}
            {!inModale && (
              <TipoAttivitaIcona tipo={tipo} titolo={pren.torneo_nome ?? undefined} />
            )}
          </div>
          {pren.allenamento && pren.allenatore_id && (
            <div className="dove">Istruttore: {etichette.get(pren.allenatore_id) ?? '—'}</div>
          )}
        </div>
      </div>

      {lista.length === 0 ? (
        <>
          <div className="part-vuoto">
            {staff
              ? 'Aggiungi i giocatori di questa partita.'
              : pren.incontro_id
                ? 'I giocatori vengono gestiti dall\'organizzatore del torneo.'
                : 'Indica gli altri giocatori di questa partita: verrai aggiunto in automatico.'}
          </div>
          {staff ? (
            <Selettore
              opzioni={selezionabili}
              disabilitato={disabilita}
              testoVuoto={testoVuoto}
              onScegli={(id) => onAggiungi(id, false)}
              onOspite={onAggiungiOspite}
            />
          ) : !pren.incontro_id ? (
            <button
              type="button"
              className="btn btn-secondario btn-mini mt-2"
              onClick={() => onAggiungi(mioId, true)}
            >
              Indica i giocatori
            </button>
          ) : null}
        </>
      ) : (
        <>
          <div className="chips">
            {lista.map((r) => {
              const nome = r.socio_id ? (etichette.get(r.socio_id) ?? 'Socio') : (r.nome_manuale ?? 'Ospite')
              const ospite = !r.socio_id && (
                <span className="stato" title="Giocatore non registrato">
                  ospite
                </span>
              )

              // (Fase 8g) Modalità admin: l'intera capsula è il pulsante di
              // conferma (verde quando confermata), attiva solo dopo l'inizio.
              if (confermaCliccando && onConferma) {
                // Non ancora iniziata: lucchetto al posto dell'icona di conferma.
                if (!iniziata) {
                  return (
                    <span key={r.id} className="chip">
                      <span
                        className="chip-lock"
                        title="Confermabile dopo l’orario di inizio"
                        aria-label="Bloccato"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="5" y="11" width="14" height="9" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      </span>
                      {nome}
                      {ospite}
                      {/* Non si può mai togliere il proprio nominativo dalla prenotazione. */}
                      {!r.confermato && r.socio_id !== mioId && (
                        <button type="button" className="x" title="Togli" onClick={() => { if (window.confirm(`Rimuovere ${nome} da questa partita?`)) onRimuovi(r) }}>
                          ×
                        </button>
                      )}
                    </span>
                  )
                }
                return (
                  <span
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    className={'chip chip-clickable' + (r.confermato ? ' conf' : '')}
                    aria-pressed={r.confermato}
                    title={r.confermato ? 'Annulla la conferma' : 'Conferma la presenza'}
                    onClick={() => onConferma(r, !r.confermato)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onConferma(r, !r.confermato)
                      }
                    }}
                  >
                    <span className="chip-conf" aria-hidden="true">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M8 12.4l2.6 2.6L16 9" />
                      </svg>
                    </span>
                    {nome}
                    {ospite}
                    {/* Non si può mai togliere il proprio nominativo dalla prenotazione. */}
                    {!r.confermato && r.socio_id !== mioId && (
                      <button
                        type="button"
                        className="x"
                        title="Togli"
                        onClick={(e) => { e.stopPropagation(); if (window.confirm(`Rimuovere ${nome} da questa partita?`)) onRimuovi(r) }}
                      >
                        ×
                      </button>
                    )}
                  </span>
                )
              }

              return (
                <span key={r.id} className={'chip' + (r.confermato ? ' conf' : '')}>
                  {nome}
                  {ospite}
                  {r.confermato ? (
                    onConferma ? (
                      <button
                        type="button"
                        className="x"
                        title="Annulla conferma"
                        onClick={() => onConferma(r, false)}
                      >
                        ✓
                      </button>
                    ) : (
                      <span className="stato" title="Presenza confermata dall'admin">
                        ✓
                      </span>
                    )
                  ) : (
                    <>
                      {onConferma && (
                        <button
                          type="button"
                          className="x"
                          title="Conferma presenza"
                          onClick={() => onConferma(r, true)}
                        >
                          ✓
                        </button>
                      )}
                      {/* Non si può mai togliere il proprio nominativo dalla prenotazione. */}
                      {r.socio_id !== mioId && (
                        <button
                          type="button"
                          className="x"
                          title="Togli"
                          onClick={() => { if (window.confirm(`Rimuovere ${nome} da questa partita?`)) onRimuovi(r) }}
                        >
                          ×
                        </button>
                      )}
                    </>
                  )}
                </span>
              )
            })}
            {!cap4 && !staff && !pren.incontro_id && !nienteDaAggiungere && (
              <Selettore
                opzioni={selezionabili}
                disabilitato={disabilita}
                testoVuoto={testoVuoto}
                onScegli={(id) => onAggiungi(id, false)}
                onOspite={onAggiungiOspite}
                variante="icona"
              />
            )}
          </div>
          {!cap4 && staff && (
            <Selettore
              opzioni={selezionabili}
              disabilitato={disabilita}
              testoVuoto={testoVuoto}
              onScegli={(id) => onAggiungi(id, false)}
              onOspite={onAggiungiOspite}
            />
          )}
        </>
      )}

      <div className="mt-auto pt-3">
        <button type="button" className="btn btn-pericolo btn-mini w-full" onClick={onAnnulla}>
          Annulla la prenotazione
        </button>
      </div>
    </div>
  )
}

function IconaPiuAmico() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  )
}

function Selettore({
  opzioni,
  disabilitato,
  testoVuoto,
  onScegli,
  onOspite,
  variante,
}: {
  opzioni: { id: string; etichetta: string }[]
  disabilitato: boolean
  testoVuoto: string
  onScegli: (id: string) => void
  onOspite?: (nome: string) => void
  // "icona": bottone tondo con icona "+ amico" al posto del testo (usato per
  // i soci normali). Il menu che si apre mostra solo i nomi degli amici,
  // senza voce vuota "Annulla": si chiude toccando fuori, come ogni menu.
  variante?: 'icona'
}) {
  if (variante === 'icona') {
    // Niente amici da invitare: niente pulsante, un messaggio con un link
    // diretto alla sezione "Aggiungi un amico" del profilo.
    if (disabilitato) {
      return (
        <span className="chips-nessun-amico">
          Non hai ancora amici.{' '}
          <Link to="/profilo?sezione=amici">Aggiungi amici</Link>
        </span>
      )
    }
    return <MenuAmici opzioni={opzioni} onScegli={onScegli} onOspite={onOspite} />
  }

  return (
    <div className="aggiungi-part">
      <select
        value=""
        disabled={disabilitato}
        onChange={(e) => {
          const v = e.target.value
          if (!v) return
          // (Tappa 11) Voce "ospite": chiede il nome in una finestra a comparsa
          // e aggiunge un giocatore non registrato.
          if (v === '__ospite__') {
            const nome = window.prompt('Nome dell’ospite (giocatore non registrato):')
            if (nome && nome.trim()) onOspite?.(nome.trim())
            return
          }
          onScegli(v)
        }}
      >
        <option value="">{testoVuoto}</option>
        {onOspite && <option value="__ospite__">＋ Ospite (non registrato)…</option>}
        {opzioni.map((o) => (
          <option key={o.id} value={o.id}>
            {o.etichetta}
          </option>
        ))}
      </select>
    </div>
  )
}

// Bottone tondo "+ amico" con menu a comparsa personalizzato (soci normali).
// Sostituisce il vecchio trucco del <select> nativo reso invisibile e
// sovrapposto al bottone: su iPhone, Safari disegnava comunque la sua
// tendina di sistema con la spunta di selezione sopra i nomi. Con un menu
// tutto nostro (stessa lista già usata per "Cerca amico" nel profilo) il
// risultato è identico su ogni dispositivo.
export function MenuAmici({
  opzioni,
  onScegli,
  onOspite,
}: {
  opzioni: { id: string; etichetta: string }[]
  onScegli: (id: string) => void
  onOspite?: (nome: string) => void
}) {
  const [aperto, setAperto] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aperto) return
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAperto(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [aperto])

  function scegli(id: string) {
    setAperto(false)
    onScegli(id)
  }

  function scegliOspite() {
    setAperto(false)
    const nome = window.prompt('Nome dell’ospite (giocatore non registrato):')
    if (nome && nome.trim()) onOspite?.(nome.trim())
  }

  return (
    <div ref={wrapRef} className="aggiungi-part-icona">
      <button
        type="button"
        className="btn-icona-amico"
        aria-label="Aggiungi un amico alla partita"
        aria-haspopup="true"
        aria-expanded={aperto}
        onClick={() => setAperto((v) => !v)}
      >
        <IconaPiuAmico />
      </button>
      {aperto && (
        <div className="cerca-lista">
          {onOspite && (
            <button type="button" className="cerca-riga" onClick={scegliOspite}>
              <span className="cerca-riga-nome">Ospite (non registrato)</span>
              <span className="cerca-riga-ico" aria-hidden="true">+</span>
            </button>
          )}
          {opzioni.map((o) => (
            <button key={o.id} type="button" className="cerca-riga" onClick={() => scegli(o.id)}>
              <span className="cerca-riga-nome">{o.etichetta}</span>
              <span className="cerca-riga-ico" aria-hidden="true">+</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
