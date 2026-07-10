import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { dataEstesa, titleCase } from '@/lib/formato'
import { oraLocale } from '@/features/prenotazioni/orari'
import { useAmici } from '../amici/useAmici'
import { useRichiestePartner } from '@/features/compagni/useRichiestePartner'
import { useTornei } from '@/features/tornei/datiTornei'
import { usePremiCatalogo, useSaldoCrediti } from '@/features/premi/datiPremi'
import { useProssimaAttivita, useTop3Classifica } from './useAnteprimeAreaClub'

const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

function IcoCalendario() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IcoAmici() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="7" r="3"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  )
}
function IcoPremi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  )
}
function IcoCompagni() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>
    </svg>
  )
}
function IcoTrofeoClassifica() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function IcoZap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}
function IcoOrologio() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
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
function IcoFreccia() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function IcoAggiungiPersona() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="4" /><path d="M1 21v-1a6 6 0 0 1 6-6h1" /><line x1="17" y1="9" x2="17" y2="15" /><line x1="14" y1="12" x2="20" y2="12" />
    </svg>
  )
}

function Testata({ icona, titolo, sub }: { icona: ReactNode; titolo: string; sub?: string }) {
  return (
    <div className="club-tile-testata">
      <span className="club-tile-testata-ico">{icona}</span>
      <span className="club-tile-testata-testi">
        <span className="club-tile-titolo">{titolo}</span>
        {sub && <span className="club-tile-sub">{sub}</span>}
      </span>
    </div>
  )
}

function VediTutti({ etichetta = 'Vedi tutti' }: { etichetta?: string }) {
  return (
    <span className="club-tile-vedi-tutti">
      {etichetta} <IcoFreccia />
    </span>
  )
}

// "Cognome Nome" (formato di etichetta) → solo il nome di battesimo.
function primoNome(etichetta: string): string {
  const parti = titleCase(etichetta).trim().split(/\s+/)
  return parti[parti.length - 1] ?? etichetta
}

function MiniPersona({ foto, nome, tag }: { foto?: string | null; nome: string; tag?: string }) {
  const iniziale = nome.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="mini-persona">
      {foto ? (
        <img src={foto} alt="" className="mini-persona-foto" />
      ) : (
        <span className="mini-persona-foto mini-persona-foto-vuota">{iniziale}</span>
      )}
      <span className="mini-persona-nome">{nome}</span>
      {tag && <span className="mini-persona-tag">{tag}</span>}
    </div>
  )
}

// ── Attività in programma (card in evidenza, tutta cliccabile) ────────────
function CardAttivita() {
  const { data: prossima, isLoading } = useProssimaAttivita()
  return (
    <Link to="/profilo/attivita-in-programma" className="club-tile club-tile--grande club-tile--blu">
      <Testata icona={<IcoCalendario />} titolo="Attività in programma" sub="Le tue prossime partite e lezioni" />
      {isLoading ? (
        <p className="club-tile-testo-anteprima">Caricamento…</p>
      ) : prossima ? (
        <p className="club-tile-testo-anteprima">
          <strong>{dataEstesa(prossima.inizio.slice(0, 10))}</strong>, {oraLocale(new Date(prossima.inizio))}–{oraLocale(new Date(prossima.fine))}
          <br />
          {SPORT_LABEL[prossima.sport] ?? prossima.sport} · {prossima.campo_nome ?? 'Campo'}
        </p>
      ) : (
        <p className="club-tile-testo-anteprima">Nessuna attività in programma.</p>
      )}
      <VediTutti etichetta="Vedi tutte le attività" />
    </Link>
  )
}

// ── Amici (prima card "Aggiungi nuovo amico", poi fino a 5 contatti tra
// amici già collegati e giocatori suggeriti — per questi ultimi un
// pulsante "Aggiungi" invia la richiesta senza uscire dalla card. Non
// cliccabile su tutta la superficie per via dello scroll orizzontale
// interno: solo la prima mini-card e "Vedi tutti" portano alla pagina
// completa. ────────────────────────────────────────────────────────────
function CardAmici() {
  const { profilo } = useAuth()
  const amici = useAmici(profilo?.id ?? '')
  const collegati = new Set<string>([
    profilo?.id ?? '',
    ...amici.staffIds,
    ...amici.amici.map((v) => v.id),
    ...amici.ricevute.map((v) => v.id),
    ...amici.inviate.map((v) => v.id),
  ])
  const suggeriti = amici.sociPubblici.filter((s) => !collegati.has(s.id) && !s.account_privato)

  const contatti = [
    ...amici.amici.map((a) => ({ id: a.id, nome: primoNome(a.etichetta), foto: null as string | null, amico: true })),
    ...suggeriti.map((s) => ({ id: s.id, nome: primoNome(s.etichetta), foto: s.foto_url ?? null, amico: false })),
  ].slice(0, 5)

  return (
    <div className="club-tile club-tile--larga club-tile--fluttua">
      <Testata icona={<IcoAmici />} titolo="Amici" />
      <div className="club-tile-carosello">
        <Link to="/profilo/amici" className="mini-persona mini-persona-aggiungi">
          <span className="mini-persona-foto mini-persona-foto-aggiungi"><IcoAggiungiPersona /></span>
          <span className="mini-persona-nome">Aggiungi</span>
        </Link>
        {contatti.map((c) => (
          <div key={c.id} className="mini-persona">
            {c.foto ? (
              <img src={c.foto} alt="" className="mini-persona-foto" />
            ) : (
              <span className="mini-persona-foto mini-persona-foto-vuota">{c.nome.charAt(0).toUpperCase() || '?'}</span>
            )}
            <span className="mini-persona-nome">{c.nome}</span>
            {!c.amico && (
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
      </div>
      <Link to="/profilo/amici" className="club-tile-vedi-tutti">Vedi tutti gli amici <IcoFreccia /></Link>
    </div>
  )
}

// ── Cerco giocatori (ultimo annuncio, tutta cliccabile) ─────────────────────
function CardCercoGiocatori() {
  const { profilo } = useAuth()
  const { richieste, sociById } = useRichiestePartner(profilo?.id)
  const ultima = richieste[0]

  return (
    <Link to="/profilo/cerco-giocatori" className="club-tile club-tile--larga">
      <Testata icona={<IcoCompagni />} titolo="Cerco giocatori" sub="Annunci per trovare un compagno" />
      {ultima ? (
        <p className="club-tile-testo-anteprima">
          <strong>{titleCase(sociById.get(ultima.socio_id) ?? 'Un socio')}</strong> cerca giocatori di {SPORT_LABEL[ultima.sport] ?? ultima.sport}
          <br />
          {dataEstesa(ultima.giorno?.slice(0, 10))} · {ultima.ora_inizio?.slice(0, 5)}
        </p>
      ) : (
        <p className="club-tile-testo-anteprima">Nessun annuncio al momento.</p>
      )}
      <VediTutti etichetta="Cerca dei giocatori per una partita" />
    </Link>
  )
}

// ── Tornei in corso / in programma (caroselli) ─────────────────────────────
function CardTorneiCarosello({
  to,
  titolo,
  sub,
  icona,
  tema,
  stato,
}: {
  to: string
  titolo: string
  sub: string
  icona: ReactNode
  tema: string
  stato: 'in_corso' | 'in_programma'
}) {
  const { data } = useTornei()
  const lista = (data?.tornei ?? []).filter((t) => t.stato === stato)

  return (
    <div className={`club-tile club-tile--larga club-tile--${tema}`}>
      <Testata icona={icona} titolo={titolo} sub={sub} />
      {lista.length === 0 ? (
        <p className="club-tile-testo-anteprima">Nessun torneo al momento.</p>
      ) : (
        <div className="club-tile-carosello">
          {lista.map((t) => (
            <div key={t.id} className="mini-torneo">
              <div className="mini-torneo-nome">{t.nome}</div>
              <div className="mini-torneo-info">
                {SPORT_LABEL[t.sport] ?? t.sport}
                {t.data_inizio && <> · {dataEstesa(t.data_inizio.slice(0, 10))}</>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Link to={to} className="club-tile-vedi-tutti">Vedi tutti i tornei <IcoFreccia /></Link>
    </div>
  )
}

// ── Staff del club (carosello) ──────────────────────────────────────────────
function CardStaff() {
  const { profilo } = useAuth()
  const { staff } = useAmici(profilo?.id ?? '')

  return (
    <div className="club-tile club-tile--larga club-tile--slate">
      <Testata icona={<IcoBadge />} titolo="Staff del club" sub="Maestri e collaboratori" />
      {staff.length === 0 ? (
        <p className="club-tile-testo-anteprima">Nessun membro dello staff al momento.</p>
      ) : (
        <div className="club-tile-carosello">
          {staff.map((s) => (
            <MiniPersona key={s.id} nome={titleCase(s.etichetta)} tag={s.ruolo ?? undefined} />
          ))}
        </div>
      )}
      <Link to="/profilo/staff" className="club-tile-vedi-tutti">Vedi tutto lo staff <IcoFreccia /></Link>
    </div>
  )
}

// ── Classifica (top 3, tutta cliccabile) ────────────────────────────────────
function CardClassifica() {
  const { data } = useTop3Classifica()
  return (
    <Link to="/profilo/classifica" className="club-tile club-tile--larga club-tile--notte">
      <Testata icona={<IcoTrofeoClassifica />} titolo="Classifica" sub="La tua posizione nel club" />
      {data && data.length > 0 ? (
        <div className="club-tile-classifica-top3">
          {data.map((r) => (
            <div key={r.posizione} className={'club-tile-classifica-riga' + (r.is_me ? ' io' : '')}>
              <span className="club-tile-classifica-pos">{r.posizione}º</span>
              <span className="club-tile-classifica-nome">{r.etichetta ? titleCase(r.etichetta) : '—'}</span>
              <span className="club-tile-classifica-punti">{r.punti ?? 0} pt</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="club-tile-testo-anteprima">Nessun dato in classifica.</p>
      )}
      <VediTutti etichetta="Classifica completa" />
    </Link>
  )
}

// ── Premi (mini-card + crediti disponibili, tutta cliccabile) ──────────────
function CardPremi() {
  const { profilo } = useAuth()
  const { data: premi } = usePremiCatalogo()
  const { data: crediti } = useSaldoCrediti(profilo?.id)

  return (
    <Link to="/profilo/premi" className="club-tile club-tile--larga club-tile--bronzo">
      <Testata icona={<IcoPremi />} titolo="Premi" sub={`Hai ${crediti ?? 0} crediti disponibili`} />
      {premi && premi.length > 0 ? (
        <div className="club-tile-carosello">
          {premi.slice(0, 8).map((p) => (
            <div key={p.id} className="mini-premio">
              <div className="mini-premio-nome">{p.nome}</div>
              <div className="mini-premio-costo">{p.costo ?? 0} crediti</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="club-tile-testo-anteprima">Nessun premio disponibile al momento.</p>
      )}
      <VediTutti etichetta="Riscatta i tuoi punti" />
    </Link>
  )
}

// Area Club (Fase anteprime): ogni card mostra un'anteprima reale del suo
// contenuto (prossima attività, amici/staff con foto, ultimo annuncio,
// tornei, top 3 classifica, premi disponibili) invece di una semplice
// icona — richiesto esplicitamente. Le card con un carosello interno non
// sono link cliccabili su tutta la superficie (per non confliggere con lo
// scroll orizzontale): solo la testata/riga finale "Vedi tutti" porta alla
// pagina completa. Solo per il giocatore regolare — vedi ProfiloPage.tsx.
export default function AreaClubSchede({ modalitaPremi }: { modalitaPremi: boolean }) {
  return (
    <div className="club-tile-grid">
      <CardAttivita />
      <CardAmici />
      <CardCercoGiocatori />
      <CardTorneiCarosello
        to="/profilo/tornei-in-corso"
        titolo="Tornei in corso"
        sub="Segui le partite live"
        icona={<IcoZap />}
        tema="terra"
        stato="in_corso"
      />
      <CardTorneiCarosello
        to="/profilo/tornei-in-programma"
        titolo="Tornei in programma"
        sub="Iscriviti al prossimo torneo"
        icona={<IcoOrologio />}
        tema="ciano"
        stato="in_programma"
      />
      <CardStaff />
      <CardClassifica />
      {modalitaPremi && <CardPremi />}
    </div>
  )
}
