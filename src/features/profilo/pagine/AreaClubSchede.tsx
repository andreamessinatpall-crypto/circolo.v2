import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useMemo, useState } from 'react'
import { dataEstesa, titleCase, inizialiDaEtichetta } from '@/lib/formato'
import { oraLocale, ymd } from '@/features/prenotazioni/orari'
import { SportIcona } from '@/components/IconeSport'
import { IconaMeteo } from '@/components/IconeMeteo'
import { useMeteo } from '@/hooks/useMeteo'
import Avatar from '@/components/Avatar'
import { MedagliaPodio } from '@/components/MedagliaPodio'
import { CaroselloFrecce } from '@/components/Carosello'
import { useSociEtichette } from '@/features/prenotazioni/datiAmichevoli'
import { useAmici, ruoloDa, type VoceAmico, type VoceStaff, type SocioPubblico } from '../amici/useAmici'
import DettaglioAmicoModal from '../amici/DettaglioAmicoModal'
import ChatModal from '@/features/chat/ChatModal'
import { useConversazioni } from '@/features/chat/useChat'
import DisponibilitaIstruttoreModal from '@/features/lezioni/DisponibilitaIstruttoreModal'
import { CardIstruttorePassaporto } from './IstruttoriPagina'
import { useRichiestePartner } from '@/features/compagni/useRichiestePartner'
import { useProssimaAttivita, useTop3Classifica } from './useAnteprimeAreaClub'
import { useStatGioc } from '@/features/segreteria/StatistichePage'
import { useTornei } from '@/features/tornei/datiTornei'
import { torneoInProgrammaAttivo } from '@/features/tornei/tipi'
import { annuncioAttivo, useAnnunci } from '@/features/profilo/datiAnnunci'
import { useSaldoCrediti, useModalitaPremi } from '@/features/premi/datiPremi'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti } from '@/features/profilo/livelliPunti'
import type { Ruolo } from '@/features/profilo/ruoloBadge'
import { useSoci } from '@/features/segreteria/datiSoci'
import DettaglioGiocatore from '@/features/segreteria/DettaglioGiocatore'

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

function troncaTesto(s: string, max = 100): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// Livello (dai punti) o ruolo (per lo staff) + sport, sotto il nome nelle
// minicard di Giocatori/Amici — stessa informazione mostrata nelle minicard
// di admin/collaboratore in GestioneGiocatori.tsx.
const RUOLO_COLORE: Record<Ruolo, string> = { admin: '#c8972e', collaboratore: '#c8a83a', istruttore: '#be5436' }
const RUOLO_NOME: Record<Ruolo, string> = { admin: 'Admin', collaboratore: 'Collaboratore', istruttore: 'Istruttore' }

export function MiniInfoLivelloSport({ ruolo, punti, sport }: { ruolo: Ruolo | null; punti: number; sport: string | null }) {
  const lv = livelloDaPunti(punti, LIVELLI_PUNTI_DEFAULT)
  const cfg = LIVELLI_PUNTI_DEFAULT[lv - 1]
  const nome = ruolo ? RUOLO_NOME[ruolo] : cfg.nome
  const colore = ruolo ? RUOLO_COLORE[ruolo] : cfg.colore
  return (
    <span className="mini-persona-info">
      <span style={{ color: colore }}>{nome}</span>
      {sport && (
        <>
          <span className="mini-persona-info-sep">·</span>
          <SportIcona sport={sport} size={12} />
        </>
      )}
    </span>
  )
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
      {isLoading ? (
        <div className="club-tile club-tile-hero">
          <p className="club-tile-testo-anteprima">Caricamento…</p>
        </div>
      ) : prossima ? (
        <Link to="/profilo/mie-prenotazioni" className="club-tile club-tile-hero">
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
        </Link>
      ) : (
        <div className="club-tile club-tile-hero club-tile-vuota cerca-vuota">
          <span className="cerca-vuota-titolo-grande">Prenota la tua prossima partita</span>
          <Link to="/prenota" className="cerca-vuota-bottone">
            Clicca qui
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Cerca partita (ultimo annuncio, tutta cliccabile): stessa scheda "wow"
// di CardAttivita — sfondo blu-notte sfumato, ma con l'avatar di chi cerca
// compagni al posto dell'orario in evidenza. Stato vuoto: titolo grande +
// pulsante "Crea una partita" che apre direttamente il form (vedi
// SezioneCompagni.tsx, apriNuovo). ──────────────────────────────────────────
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
        <div className="club-tile club-tile-hero club-tile-vuota cerca-vuota">
          <span className="cerca-vuota-titolo-grande">Cerca giocatori per la tua prossima partita</span>
          <Link to="/profilo/cerco-giocatori" state={{ apriNuovo: true }} className="cerca-vuota-bottone">
            Clicca qui
          </Link>
        </div>
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
  const sociAdminQuery = useSoci()
  const { data: modalitaPremi } = useModalitaPremi()
  const [visualizzato, setVisualizzato] = useState<SocioPubblico | null>(null)
  const [chatCon, setChatCon] = useState<{ id: string; etichetta: string } | null>(null)
  const [gestisciId, setGestisciId] = useState<string | null>(null)

  const ultimiIscritti = useMemo(() => {
    return amici.sociPubblici
      .filter((s) => s.id !== profilo?.id)
      .slice()
      .sort((a, b) => (b.data_iscrizione ?? '').localeCompare(a.data_iscrizione ?? ''))
      .slice(0, 12)
  }, [amici.sociPubblici, profilo?.id])

  const gestisciSocio = sociAdminQuery.data?.find((s) => s.id === gestisciId) ?? null

  return (
    <div className="club-col">
      <TestataSezione titolo="Giocatori" to="/soci" />
      <CaroselloFrecce>
        {ultimiIscritti.map((s) => (
          <div key={s.id} className="mini-persona mini-persona-wow">
            <Avatar foto={s.foto_url ?? null} iniziali={inizialiDaEtichetta(s.etichetta)} titolo={s.etichetta} size={72} />
            <span className="mini-persona-nome">{primoNome(s.etichetta)}</span>
            <MiniInfoLivelloSport ruolo={ruoloDa(s)} punti={s.punti} sport={s.sport_preferito} />
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
          onGestisci={() => {
            setGestisciId(visualizzato.id)
            setVisualizzato(null)
          }}
          nascondiPrenotaInsieme={!!profilo?.is_admin}
          onChiudi={() => setVisualizzato(null)}
        />
      )}
      {gestisciSocio && (
        <DettaglioGiocatore
          socio={gestisciSocio}
          modalitaPremi={!!modalitaPremi}
          meId={profilo?.id}
          onChiudi={() => setGestisciId(null)}
        />
      )}
      {chatCon && profilo && (
        <ChatModal profiloId={profilo.id} amico={chatCon} onChiudi={() => setChatCon(null)} />
      )}
    </div>
  )
}

// ── Classifica: non più una scorciatoia a icona, ma una scheda con
// l'anteprima dei primi 3 classificati (stessa RPC di ClassificaClub.tsx,
// vedi useTop3Classifica). ──────────────────────────────────────────────────
function CardClassifica() {
  const { data, isLoading } = useTop3Classifica()
  const lista = data ?? []

  return (
    <div className="club-col">
      <TestataSezione titolo="Classifica" to="/profilo/classifica" />
      <Link to="/profilo/classifica" className="club-tile club-tile-hero">
        {isLoading ? (
          <p className="club-tile-testo-anteprima">Caricamento…</p>
        ) : lista.length === 0 ? (
          <p className="club-tile-testo-anteprima">Nessun socio in classifica.</p>
        ) : (
          <div className="club-tile-classifica-top3">
            {lista.map((r) => (
              <div key={r.posizione} className={'club-tile-classifica-riga' + (r.is_me ? ' io' : '')}>
                <span className="club-tile-classifica-pos">
                  {r.posizione <= 3 ? <MedagliaPodio pos={r.posizione as 1 | 2 | 3} size={20} /> : `${r.posizione}º`}
                </span>
                <span className="club-tile-classifica-nome">{r.etichetta ? titleCase(r.etichetta) : 'Giocatore'}</span>
                <span className="club-tile-classifica-punti">{r.punti ?? 0} pt</span>
              </div>
            ))}
          </div>
        )}
      </Link>
    </div>
  )
}

// ── Novità (ex "Annunci"): anteprima dell'ultimo torneo in programma non
// ancora iniziato + l'ultima comunicazione del club non ancora scaduta. Se
// non c'è nessuno dei due la scheda non compare affatto; se ce n'è solo uno,
// si mostra solo quello. ─────────────────────────────────────────────────────
function CardNovita() {
  const { profilo } = useAuth()
  const torneiQuery = useTornei()
  const annunciQuery = useAnnunci()
  const sport = profilo?.sport_preferito ?? 'entrambi'

  const torneo = useMemo(() => {
    const oggi = ymd(new Date())
    const lista = torneiQuery.data?.tornei ?? []
    return (
      lista.find(
        (t) => torneoInProgrammaAttivo(t, oggi) && (sport === 'entrambi' || t.sport === sport),
      ) ?? null
    )
  }, [torneiQuery.data, sport])

  const annuncio = useMemo(
    () => (annunciQuery.data ?? []).find((a) => annuncioAttivo(a)) ?? null,
    [annunciQuery.data],
  )

  if (torneiQuery.isLoading || annunciQuery.isLoading) return null
  if (!torneo && !annuncio) return null

  return (
    <div className="club-col">
      <TestataSezione titolo="Novità" to="/profilo/annunci" />
      <Link to="/profilo/annunci" className="club-tile club-tile-hero">
        <div className="club-tile-novita-corpo">
          {torneo && (
            <div>
              <div className="cerca-wow-nome">{torneo.nome}</div>
              {torneo.data_inizio && <div className="club-tile-sub">Dal {dataEstesa(torneo.data_inizio)}</div>}
            </div>
          )}
          {torneo && annuncio && <div className="club-tile-divisore" />}
          {annuncio && (
            <div>
              {annuncio.immagine ? (
                <div className="annuncio-img-wrap">
                  <img src={annuncio.immagine} alt="" className="annuncio-img" />
                  <div className="annuncio-img-titolo">{annuncio.titolo}</div>
                </div>
              ) : (
                <div className="cerca-wow-nome">{annuncio.titolo}</div>
              )}
              {annuncio.testo && <p className="club-tile-testo-anteprima">{troncaTesto(annuncio.testo)}</p>}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

// ── Premi: non più una scorciatoia "Rewards", ma i crediti disponibili del
// socio (stesso saldo di PremiPage.tsx) con l'invito a riscattarli. Nascosta
// del tutto se la modalità premi del club non è attiva (vedi modalitaPremi
// più sotto). ────────────────────────────────────────────────────────────────
function CardCrediti() {
  const { profilo } = useAuth()
  const { data: crediti, isLoading } = useSaldoCrediti(profilo?.id)

  return (
    <div className="club-col">
      <TestataSezione titolo="Rewards" to="/profilo/premi" azione="Riscatta il tuo premio" />
      <Link to="/profilo/premi" className="club-tile club-tile-hero credito-tile">
        <div className="credito-corpo">
          <span className="credito-etichetta">
            <IcoRewards /> Crediti disponibili
          </span>
          <span className="credito-fascia-numero">{isLoading ? '···' : crediti ?? 0}</span>
        </div>
      </Link>
    </div>
  )
}

// ── Lezioni: le minicard "passaporto" degli istruttori (stesse di
// IstruttoriPagina.tsx, non duplicate) in un carosello direttamente nella
// scheda di Area Club, come già fatto per Giocatori/Amici — non solo un
// riepilogo che rimanda alla pagina dedicata. Il click apre la scheda con
// disponibilità e richiesta lezione (stesso DisponibilitaIstruttoreModal
// già usato in Contatti). ──────────────────────────────────────────────
function CardIstruttori() {
  const [istruttoreAperto, setIstruttoreAperto] = useState<VoceStaff | null>(null)
  const [chatCon, setChatCon] = useState<VoceStaff | null>(null)
  const { profilo } = useAuth()
  const { staff, caricamento } = useAmici(profilo?.id ?? '')
  const istruttori = staff.filter((s) => s.ruolo === 'istruttore')
  const { conversazioni } = useConversazioni(profilo?.id)
  const nonLettiPerStaff = new Map(conversazioni.map((c) => [c.altroId, c.nonLetti]))

  if (caricamento) return null
  if (istruttori.length === 0) return null

  return (
    <div className="club-col">
      <TestataSezione titolo="Lezioni" to="/profilo/lezioni" />
      <CaroselloFrecce>
        {istruttori.map((s) => (
          <CardIstruttorePassaporto
            key={s.id}
            voce={s}
            onClick={() => setIstruttoreAperto(s)}
            onChat={() => setChatCon(s)}
            nonLetti={nonLettiPerStaff.get(s.id) ?? 0}
          />
        ))}
      </CaroselloFrecce>

      {istruttoreAperto && (
        <DisponibilitaIstruttoreModal
          istruttore={istruttoreAperto}
          onChiudi={() => setIstruttoreAperto(null)}
        />
      )}

      {chatCon && profilo && (
        <ChatModal
          key={chatCon.id}
          profiloId={profilo.id}
          amico={chatCon}
          onChiudi={() => setChatCon(null)}
        />
      )}
    </div>
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
  ruolo: Ruolo | null
  punti: number
  sport: string | null
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
    ...amici.amici.map((a) => ({ id: a.id, nome: primoNome(a.etichetta), etichetta: a.etichetta, foto: a.foto_url, stato: 'amico' as const, ruolo: a.ruolo, punti: a.punti, sport: a.sport, voce: a })),
    ...amici.inviate.map((a) => ({ id: a.id, nome: primoNome(a.etichetta), etichetta: a.etichetta, foto: a.foto_url, stato: 'in_attesa' as const, ruolo: a.ruolo, punti: a.punti, sport: a.sport, voce: a })),
    ...suggeriti.map((s) => ({ id: s.id, nome: primoNome(s.etichetta), etichetta: s.etichetta, foto: s.foto_url ?? null, stato: 'suggerito' as const, ruolo: ruoloDa(s), punti: s.punti, sport: s.sport_preferito })),
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
            <MiniInfoLivelloSport ruolo={c.ruolo} punti={c.punti} sport={c.sport} />
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
// icona (non più minischede-scorciatoia a sé stanti — Contatti è stata
// spostata nel menu profilo, sezione "Supporto", vedi MenuUtente.tsx).
// Classifica e Premi vanno in fondo, affiancate; Premi sparisce del tutto
// se la modalità premi non è attiva.
// Stessa griglia per socio/collaboratore/admin (vedi ProfiloPage.tsx: solo
// l'istruttore non arriva qui), con le prime schede diverse a seconda del
// ruolo — vedi composizione qui sotto.
export default function AreaClubSchede({ modalitaPremi }: { modalitaPremi: boolean }) {
  const { profilo } = useAuth()
  const isAdmin = !!profilo?.is_admin
  const isCollaboratore = !!profilo?.is_allenatore && !profilo?.is_admin

  return (
    <div className="club-tile-grid">
      <CardNovita />

      {isAdmin && (
        <>
          <CardStatistiche />
          <CardGiocatori />
          <CardCercaPartita />
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

      {modalitaPremi ? (
        <div className="club-riga club-riga-2">
          <CardClassifica />
          <CardCrediti />
        </div>
      ) : (
        <CardClassifica />
      )}

      <CardIstruttori />
    </div>
  )
}
