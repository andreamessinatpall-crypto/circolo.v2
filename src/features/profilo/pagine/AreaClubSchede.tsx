import type { ReactNode, WheelEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useEffect, useMemo, useRef, useState } from 'react'
import { dataEstesa, titleCase, inizialiDaEtichetta } from '@/lib/formato'
import { oraLocale, ymd } from '@/features/prenotazioni/orari'
import { SportIcona } from '@/components/IconeSport'
import { IconaMeteo } from '@/components/IconeMeteo'
import { useMeteo } from '@/hooks/useMeteo'
import Avatar from '@/components/Avatar'
import { useSociEtichette } from '@/features/prenotazioni/datiAmichevoli'
import { useAmici, ruoloDa, type VoceAmico, type SocioPubblico } from '../amici/useAmici'
import DettaglioAmicoModal from '../amici/DettaglioAmicoModal'
import ChatModal from '@/features/chat/ChatModal'
import { useRichiestePartner } from '@/features/compagni/useRichiestePartner'
import { useProssimaAttivita } from './useAnteprimeAreaClub'
import { useStatGioc } from '@/features/segreteria/StatistichePage'

const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

// Scatola regalo con fiocco: per "Rewards" (premi da riscattare).
function IcoRewards() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="9" width="18" height="4" rx="1" />
      <rect x="4.5" y="13" width="15" height="8" rx="1" />
      <line x1="12" y1="9" x2="12" y2="21" />
      <path d="M12 9c-1.2-3-4-4.5-5.5-3S6 9 8 9z" />
      <path d="M12 9c1.2-3 4-4.5 5.5-3S18 9 16 9z" />
    </svg>
  )
}
// Podio a tre gradini: più leggibile di un trofeo per "classifica" a colpo d'occhio.
function IcoTrofeoClassifica() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="13" width="5.5" height="8" rx="1" />
      <rect x="9.25" y="8" width="5.5" height="13" rx="1" />
      <rect x="16" y="15.5" width="5.5" height="5.5" rx="1" />
    </svg>
  )
}
// Bacheca/giornale: per "Annunci" (comunicazioni del club + tornei in programma).
function IcoMegafono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M19 8h1a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2" />
      <line x1="7" y1="8" x2="13" y2="8" />
      <line x1="7" y1="12" x2="16" y2="12" />
      <line x1="7" y1="15.5" x2="16" y2="15.5" />
    </svg>
  )
}
function IcoBadge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="10" r="2.2"/><path d="M8 16.5a4 4 0 0 1 8 0"/>
    </svg>
  )
}
// Statistiche: non più una scorciatoia in fondo con l'iconcina blu, ma una
// vera scheda in cima ad Area Club per l'admin (vedi CardStatistiche sotto).
function IcoStatistiche() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}
function IcoFreccia() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IcoFrecciaCarosello({ sinistra }: { sinistra?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={sinistra ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}

// Carosello orizzontale con frecce prev/next a metà altezza invece della
// scrollbar da trascinare col mouse (richiesto esplicitamente per il
// browser: la scrollbar era scomoda da usare). Le frecce si nascondono da
// sole ai due estremi e restano visibili solo su dispositivi con mouse
// (vedi media query hover:hover in index.css) — su touch lo scroll
// orizzontale funziona già col dito.
function CaroselloFrecce({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [puoSx, setPuoSx] = useState(false)
  const [puoDx, setPuoDx] = useState(false)

  function aggiornaFrecce() {
    const el = ref.current
    if (!el) return
    setPuoSx(el.scrollLeft > 4)
    setPuoDx(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  // Al primo render il carosello potrebbe non avere ancora tutte le
  // minischede (i dati arrivano async): ricontrolliamo quando cambiano i
  // children e al resize, non solo sullo scroll manuale.
  useEffect(() => {
    aggiornaFrecce()
    window.addEventListener('resize', aggiornaFrecce)
    return () => window.removeEventListener('resize', aggiornaFrecce)
  }, [children])

  function scorri(verso: 1 | -1) {
    ref.current?.scrollBy({ left: verso * 280, behavior: 'smooth' })
  }

  // Rotellina del mouse (verticale) tradotta in scroll orizzontale: senza
  // questo, sul browser passare il mouse sul carosello e scorrere la
  // rotellina non muoveva nulla (il div non ha overflow verticale da
  // scrollare). Se non c'è più margine in quella direzione lasciamo che
  // l'evento risalga normalmente, così la pagina scorre come al solito.
  function onWheel(e: WheelEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || e.deltaY === 0) return
    const puoScorrere = e.deltaY > 0
      ? el.scrollLeft < el.scrollWidth - el.clientWidth - 1
      : el.scrollLeft > 1
    if (!puoScorrere) return
    e.preventDefault()
    el.scrollLeft += e.deltaY
  }

  return (
    <div className="carosello-frecce">
      <div className="club-tile-carosello" ref={ref} onScroll={aggiornaFrecce} onWheel={onWheel}>
        {children}
      </div>
      <button
        type="button"
        className="carosello-freccia carosello-freccia-sx"
        onClick={() => scorri(-1)}
        disabled={!puoSx}
        aria-label="Scorri a sinistra"
      >
        <IcoFrecciaCarosello sinistra />
      </button>
      <button
        type="button"
        className="carosello-freccia carosello-freccia-dx"
        onClick={() => scorri(1)}
        disabled={!puoDx}
        aria-label="Scorri a destra"
      >
        <IcoFrecciaCarosello />
      </button>
    </div>
  )
}
function IcoAggiungiPersona() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="4" /><path d="M1 21v-1a6 6 0 0 1 6-6h1" /><line x1="17" y1="9" x2="17" y2="15" /><line x1="14" y1="12" x2="20" y2="12" />
    </svg>
  )
}
function IcoPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function IcoCalendarioMini() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

// "Cognome Nome" (formato di etichetta) → solo il nome di battesimo.
function primoNome(etichetta: string): string {
  const parti = titleCase(etichetta).trim().split(/\s+/)
  return parti[parti.length - 1] ?? etichetta
}

// Titolo della sezione + azione ("Gestisci"/"Vedi tutti") sulla stessa riga,
// sempre fuori dalla scheda — stesso schema per tutte le card. Niente icona
// (eccetto le tre scorciatoie Contatti/Classifica/Premi, icona+nome dentro).
function TestataSezione({ titolo, to, azione = 'Vedi tutti' }: { titolo: string; to: string; azione?: string }) {
  return (
    <div className="club-col-testata">
      <div className="club-col-titolo">{titolo}</div>
      <Link to={to} className="club-col-azione">
        {azione} <IcoFreccia />
      </Link>
    </div>
  )
}

// ── Attività (Le mie prenotazioni + Attività in programma unite): scheda
// "wow" con sfondo verde sfumato scuro, stesso linguaggio visivo dell'hero
// account (.riep-wow) e delle card torneo in evidenza (.torneo-club-card.verde)
// — così l'unica attività davvero imminente del socio salta all'occhio invece
// di essere un'anteprima testuale uguale alle altre. ─────────────────────────
function CardAttivita() {
  const { profilo } = useAuth()
  const { data: prossima, isLoading } = useProssimaAttivita()
  const sociQuery = useSociEtichette()
  const amici = useAmici(profilo?.id ?? '')
  const meteoQuery = useMeteo()
  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    if (profilo) m.set(profilo.id, `${profilo.nome} ${profilo.cognome}`)
    return m
  }, [sociQuery.data, profilo])
  const fotoPerId = useMemo(
    () => new Map(amici.sociPubblici.map((s) => [s.id, s.foto_url ?? null])),
    [amici.sociPubblici],
  )
  const label = (id: string) => etichette.get(id) ?? 'Giocatore'
  const previsione = prossima ? meteoQuery.data?.get(ymd(new Date(prossima.inizio))) : undefined

  return (
    <div className="club-col">
      <TestataSezione titolo="La tua prossima attività" to="/profilo/mie-prenotazioni" azione="Gestisci" />
      <Link
        to={prossima || isLoading ? '/profilo/mie-prenotazioni' : '/prenota'}
        className={'club-tile' + (prossima ? ' club-tile-hero' : isLoading ? '' : ' club-tile-hero club-tile-vuota')}
      >
        {isLoading ? (
          <p className="club-tile-testo-anteprima">Caricamento…</p>
        ) : prossima ? (
          <>
            <div className="prossima-wow-fascia">
              <span className="prossima-wow-sport">
                <SportIcona sport={prossima.sport} size={16} />
                {SPORT_LABEL[prossima.sport] ?? prossima.sport}
              </span>
              {previsione && (
                <span className="prossima-wow-meteo">
                  <IconaMeteo codice={previsione.weathercode} size={17} />
                  {Math.round(previsione.tempMax)}°
                </span>
              )}
            </div>
            <div className="prossima-wow-giorno">{dataEstesa(prossima.inizio.slice(0, 10))}</div>
            <div className="prossima-wow-orario">
              {oraLocale(new Date(prossima.inizio))}
              <span className="prossima-wow-trattino">–</span>
              {oraLocale(new Date(prossima.fine))}
            </div>
            <div className="prossima-wow-campo">
              <IcoPin /> {prossima.campo_nome ?? 'Campo'}
            </div>
            {prossima.partecipanti.length > 0 && (
              <div className="prossima-wow-avatars">
                {prossima.partecipanti.map((id) => (
                  <Avatar
                    key={id}
                    foto={fotoPerId.get(id) ?? null}
                    iniziali={inizialiDaEtichetta(label(id))}
                    titolo={label(id)}
                    size={30}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="club-tile-vuota-testo">Nessuna attività in programma.</p>
            <span className="club-tile-vuota-cta">
              <span className="club-tile-vuota-piu" aria-hidden="true">+</span>
              Prenota un campo
            </span>
          </>
        )}
      </Link>
    </div>
  )
}

// ── Cerca partita (ultimo annuncio, tutta cliccabile): stessa scheda "wow"
// di CardAttivita — sfondo blu-notte sfumato, ma con l'avatar di chi cerca
// compagni al posto dell'orario in evidenza. Anche lo stato vuoto è un unico
// invito cliccabile, non più testo + link separati. ─────────────────────────
function CardCercaPartita() {
  const { profilo } = useAuth()
  const { richieste, sociById, fotoById } = useRichiestePartner(profilo?.id)
  const ultima = richieste[0]

  return (
    <div className="club-col">
      <TestataSezione titolo="Cerca partita" to="/profilo/cerco-giocatori" />
      {ultima ? (
        <Link to="/profilo/cerco-giocatori" className="club-tile club-tile-hero">
          <div className="cerca-wow-chi">
            <Avatar
              foto={fotoById.get(ultima.socio_id) ?? null}
              iniziali={inizialiDaEtichetta(sociById.get(ultima.socio_id) ?? '?')}
              size={40}
            />
            <div className="cerca-wow-testi">
              <div className="cerca-wow-nome">{titleCase(sociById.get(ultima.socio_id) ?? 'Un socio')}</div>
              <div className="cerca-wow-sub">
                cerca giocatori di {SPORT_LABEL[ultima.sport] ?? ultima.sport}
              </div>
            </div>
          </div>
          <div className="cerca-wow-quando">
            <IcoCalendarioMini />
            {dataEstesa(ultima.giorno?.slice(0, 10))} · {ultima.ora_inizio?.slice(0, 5)}
          </div>
        </Link>
      ) : (
        <Link
          to="/profilo/cerco-giocatori"
          state={{ apriNuovo: true }}
          className="club-tile club-tile-hero club-tile-vuota"
        >
          <p className="club-tile-vuota-testo">Nessuna partita al momento.</p>
          <span className="club-tile-vuota-cta">
            <span className="club-tile-vuota-piu" aria-hidden="true">+</span>
            Crea una partita
          </span>
        </Link>
      )}
    </div>
  )
}

// ── Statistiche (solo admin, al posto di "La tua prossima attività"):
// non più un generico invito, ma un'anteprima con i numeri più rilevanti
// (iscritti totali, nuovi questo mese, attivi ultimi 7 giorni) — stesso
// principio delle altre schede "wow" che mostrano un vero assaggio dei
// dati invece di un testo di circostanza. Usa solo useStatGioc() (una RPC
// leggera): useStatPren() resta nella pagina dedicata, è pesante (scarica
// tutte le prenotazioni dell'anno) e appesantirebbe ogni apertura di Area
// Club per niente. ──────────────────────────────────────────────────────
function CardStatistiche() {
  const { data: stat, isLoading } = useStatGioc()

  return (
    <div className="club-col">
      <TestataSezione titolo="Statistiche" to="/statistiche" azione="Apri" />
      <Link to="/statistiche" className="club-tile club-tile-hero">
        <div className="prossima-wow-fascia">
          <span className="prossima-wow-sport">
            <IcoStatistiche /> Giocatori
          </span>
        </div>
        {isLoading || !stat ? (
          <p className="club-tile-testo-anteprima">Caricamento…</p>
        ) : (
          <div className="stat-anteprima-riga">
            <div className="stat-anteprima-cella">
              <span className="stat-anteprima-n">{stat.totale}</span>
              <span className="stat-anteprima-lbl">Iscritti</span>
            </div>
            <div className="stat-anteprima-cella">
              <span className="stat-anteprima-n">{stat.nuoviMese}</span>
              <span className="stat-anteprima-lbl">Nuovi questo mese</span>
            </div>
            <div className="stat-anteprima-cella">
              <span className="stat-anteprima-n">{stat.attiviUltimi7}</span>
              <span className="stat-anteprima-lbl">Attivi ultimi 7gg</span>
            </div>
          </div>
        )}
      </Link>
    </div>
  )
}

// ── Giocatori (minicard di tutti i soci, non solo amici): per l'admin
// sostituisce "Cerca partita", per i collaboratori sostituisce "Amici" —
// come staff sono già "connessi" a chiunque, non serve il giro
// richiesta/accetta. Mostra gli ultimi iscritti (ordinati per
// data_iscrizione), "Visualizza" apre la stessa scheda dettaglio (di sola
// lettura, niente "Rimuovi") usata per gli amici veri. ─────────────────────
function CardGiocatori() {
  const { profilo } = useAuth()
  const amici = useAmici(profilo?.id ?? '')
  const [visualizzato, setVisualizzato] = useState<SocioPubblico | null>(null)
  const [chatCon, setChatCon] = useState<{ id: string; etichetta: string } | null>(null)

  const ultimiIscritti = useMemo(() => {
    return amici.sociPubblici
      .filter((s) => s.id !== profilo?.id)
      .slice()
      .sort((a, b) => (b.data_iscrizione ?? '').localeCompare(a.data_iscrizione ?? ''))
      .slice(0, 12)
  }, [amici.sociPubblici, profilo?.id])

  return (
    <div className="club-col">
      <TestataSezione titolo="Giocatori" to="/soci" />
      <CaroselloFrecce>
        {ultimiIscritti.map((s) => (
          <div key={s.id} className="mini-persona mini-persona-wow">
            <Avatar foto={s.foto_url ?? null} iniziali={inizialiDaEtichetta(s.etichetta)} titolo={s.etichetta} size={72} />
            <span className="mini-persona-nome">{primoNome(s.etichetta)}</span>
            <button
              type="button"
              className="mini-persona-btn mini-persona-btn-secondario"
              onClick={() => setVisualizzato(s)}
            >
              Visualizza
            </button>
          </div>
        ))}
      </CaroselloFrecce>

      {visualizzato && (
        <DettaglioAmicoModal
          key={visualizzato.id}
          voce={{
            id: visualizzato.id,
            etichetta: visualizzato.etichetta,
            ruolo: ruoloDa(visualizzato),
            punti: visualizzato.punti,
            sport: visualizzato.sport_preferito,
            foto_url: visualizzato.foto_url ?? null,
          }}
          amiciCount={
            amici.amicizieTutte.filter(
              (a) =>
                a.stato === 'accettata' &&
                (a.richiedente === visualizzato.id || a.destinatario === visualizzato.id),
            ).length
          }
          onChat={() => {
            setChatCon({ id: visualizzato.id, etichetta: titleCase(visualizzato.etichetta) })
            setVisualizzato(null)
          }}
          onChiudi={() => setVisualizzato(null)}
        />
      )}
      {chatCon && profilo && (
        <ChatModal profiloId={profilo.id} amico={chatCon} onChiudi={() => setChatCon(null)} />
      )}
    </div>
  )
}

// ── Scorciatoie a icona: Contatti / Classifica / Premi ──────────────────────
function TileScorciatoia({
  titolo,
  icona,
  to,
  state,
}: {
  titolo: string
  icona: ReactNode
  to: string
  state?: Record<string, unknown>
}) {
  return (
    <Link to={to} state={state} className="club-tile club-tile-scorciatoia">
      <span className="club-tile-scorciatoia-ico">{icona}</span>
      <span className="club-tile-scorciatoia-nome">{titolo}</span>
    </Link>
  )
}

// ── Amici (prima card "Aggiungi nuovo amico", poi fino a 5 contatti tra
// amici già collegati, richieste inviate ancora in attesa e giocatori
// suggeriti). Amici → "Visualizza" apre la scheda dettaglio (stessa di
// AmiciProfilo.tsx); richieste in attesa → "Annulla" ritira la richiesta
// (niente più etichetta "In attesa": il pulsante stesso rende chiaro lo
// stato); suggeriti → "Aggiungi" invia la richiesta senza uscire dalla
// card. Niente scheda bianca dietro al carosello: le minischede
// "galleggiano" sulla pagina, allineate alle schede che le delimitano
// sopra/sotto. ────────────────────────────────────────────────────────
type StatoContatto = 'amico' | 'in_attesa' | 'suggerito'
interface Contatto {
  id: string
  nome: string
  etichetta: string
  foto: string | null
  stato: StatoContatto
  voce?: VoceAmico
}

function CardAmici() {
  const { profilo } = useAuth()
  const amici = useAmici(profilo?.id ?? '')
  const [dettaglioAmico, setDettaglioAmico] = useState<VoceAmico | null>(null)
  const [chatAmico, setChatAmico] = useState<VoceAmico | null>(null)
  const collegati = new Set<string>([
    profilo?.id ?? '',
    ...amici.staffIds,
    ...amici.amici.map((v) => v.id),
    ...amici.ricevute.map((v) => v.id),
    ...amici.inviate.map((v) => v.id),
  ])
  const suggeriti = amici.sociPubblici.filter((s) => !collegati.has(s.id) && !s.account_privato)

  const contatti: Contatto[] = [
    ...amici.amici.map((a) => ({ id: a.id, nome: primoNome(a.etichetta), etichetta: a.etichetta, foto: a.foto_url, stato: 'amico' as const, voce: a })),
    ...amici.inviate.map((a) => ({ id: a.id, nome: primoNome(a.etichetta), etichetta: a.etichetta, foto: a.foto_url, stato: 'in_attesa' as const, voce: a })),
    ...suggeriti.map((s) => ({ id: s.id, nome: primoNome(s.etichetta), etichetta: s.etichetta, foto: s.foto_url ?? null, stato: 'suggerito' as const })),
  ].slice(0, 5)

  return (
    <div className="club-col">
      <TestataSezione titolo="Amici" to="/profilo/amici" />
      <CaroselloFrecce>
        <Link to="/profilo/amici" className="mini-persona mini-persona-wow mini-persona-aggiungi">
          <span className="mini-persona-foto mini-persona-foto-aggiungi"><IcoAggiungiPersona /></span>
          <span className="mini-persona-nome">Aggiungi</span>
        </Link>
        {contatti.map((c) => (
          <div key={c.id} className="mini-persona mini-persona-wow">
            <Avatar foto={c.foto} iniziali={inizialiDaEtichetta(c.etichetta)} titolo={c.etichetta} size={72} />
            <span className="mini-persona-nome">{c.nome}</span>
            {c.stato === 'amico' && (
              <button type="button" className="mini-persona-btn mini-persona-btn-secondario" onClick={() => setDettaglioAmico(c.voce!)}>
                Visualizza
              </button>
            )}
            {c.stato === 'in_attesa' && (
              <button
                type="button"
                className="mini-persona-btn mini-persona-btn-pericolo"
                disabled={amici.rimuovi.isPending}
                onClick={() => amici.rimuovi.mutate(c.voce!.rec)}
              >
                Annulla
              </button>
            )}
            {c.stato === 'suggerito' && (
              <button
                type="button"
                className="mini-persona-btn"
                disabled={amici.invia.isPending}
                onClick={() => amici.invia.mutate(c.id)}
              >
                Aggiungi
              </button>
            )}
          </div>
        ))}
      </CaroselloFrecce>

      {dettaglioAmico && (
        <DettaglioAmicoModal
          key={dettaglioAmico.id}
          voce={dettaglioAmico}
          amiciCount={
            amici.amicizieTutte.filter(
              (a) =>
                a.stato === 'accettata' &&
                (a.richiedente === dettaglioAmico.id || a.destinatario === dettaglioAmico.id),
            ).length
          }
          onChat={() => { setChatAmico(dettaglioAmico); setDettaglioAmico(null) }}
          onRimuovi={() => {
            if (window.confirm(`Rimuovere ${dettaglioAmico.etichetta} dai tuoi amici?`)) {
              amici.rimuovi.mutate(dettaglioAmico.rec)
            }
            setDettaglioAmico(null)
          }}
          onChiudi={() => setDettaglioAmico(null)}
        />
      )}
      {chatAmico && profilo && (
        <ChatModal profiloId={profilo.id} amico={chatAmico} onChiudi={() => setChatAmico(null)} />
      )}
    </div>
  )
}

// Area Club: i nomi delle sezioni stanno sempre fuori dalle schede, senza
// icona (eccetto le scorciatoie Contatti/Classifica/Annunci/Rewards, che
// hanno icona+nome dentro la scheda per essere riconoscibili a colpo
// d'occhio).
// Stessa griglia per socio/collaboratore/admin (vedi ProfiloPage.tsx: solo
// l'istruttore non arriva qui), con le prime schede diverse a seconda del
// ruolo — vedi composizione qui sotto.
export default function AreaClubSchede({ modalitaPremi }: { modalitaPremi: boolean }) {
  const { profilo } = useAuth()
  const isAdmin = !!profilo?.is_admin
  const isCollaboratore = !!profilo?.is_allenatore && !profilo?.is_admin

  return (
    <div className="club-tile-grid">
      {isAdmin && (
        <>
          <CardStatistiche />
          <CardCercaPartita />
          <CardGiocatori />
        </>
      )}
      {isCollaboratore && (
        <>
          <CardAttivita />
          <CardCercaPartita />
          <CardGiocatori />
        </>
      )}
      {!isAdmin && !isCollaboratore && (
        <>
          <CardAttivita />
          <CardCercaPartita />
          <CardAmici />
        </>
      )}

      <div className="club-riga-scorciatoie">
        <TileScorciatoia titolo="Contatti" icona={<IcoBadge />} to="/profilo/staff" />
        <TileScorciatoia titolo="Classifica" icona={<IcoTrofeoClassifica />} to="/profilo/classifica" />
        <TileScorciatoia
          titolo="Annunci"
          icona={<IcoMegafono />}
          to="/profilo"
          state={{ apriNotificheAnnunci: true }}
        />
        {modalitaPremi && <TileScorciatoia titolo="Rewards" icona={<IcoRewards />} to="/profilo/premi" />}
      </div>
    </div>
  )
}
