import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { inizialiDaEtichetta } from '@/lib/formato'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import Avatar from '@/components/Avatar'
import { SportIcona } from '@/components/IconeSport'
import CardPartita from '@/features/profilo/CardPartita'
import { CaroselloFrecce } from '@/components/Carosello'
import {
  ETICHETTA_ARTO,
  ETICHETTE_SPORT,
  GIORNI,
  ORARI,
  POSIZIONI,
  preferenzeImpostate,
  type Sport,
} from '@/features/profilo/preferenze/domande'
import { usePartiteConAmico } from './usePartiteConAmico'
import { usePartiteTotaliSocio, usePreferenzeAmico, useUltimiRisultatiSocio } from './useSchedaGiocatore'
import type { VoceAmico } from './useAmici'

function IcoChat() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function IcoCalendario() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IcoBidone() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

// Chiave inglese: per "Gestisci" (admin/collaboratore), apre la scheda di
// gestione completa (punti, crediti, sospensione…) — vedi DettaglioGiocatore.
function IcoGestisci() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l-1 3 3-1 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.8 2.8-2-2z" />
    </svg>
  )
}

// Riga "Attività · Amici · Punti": tabella riepilogo sotto il nome, sfondo
// tenue e puntino centrale come separatore (stesso segno di .att-parti-sep,
// qui usato tra celle invece che tra nomi).
function TabellaStatistiche({ attivita, amici, punti }: { attivita: number | undefined; amici: number; punti: number }) {
  const celle: { n: number | undefined; lbl: string }[] = [
    { n: attivita, lbl: 'Attività' },
    { n: amici, lbl: 'Amici' },
    { n: punti, lbl: 'Punti' },
  ]
  return (
    <div className="amico-dett-stats">
      {celle.map((c, i) => (
        <Fragment key={c.lbl}>
          {i > 0 && <span className="amico-dett-stats-sep">·</span>}
          <div className="amico-dett-stats-cella">
            <span className="amico-dett-stats-n">{c.n ?? '—'}</span>
            <span className="amico-dett-stats-lbl">{c.lbl}</span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

// Card di uno sport (Padel o Calcio): livello (segnaposto ELO, il calcolo
// vero verrà programmato in seguito), preferenze del giocatore per quello
// sport, ultimi 5 risultati come minicard scorrevoli.
function CardSport({ socioId, sport }: { socioId: string; sport: Sport }) {
  const preferenzeQuery = usePreferenzeAmico(socioId)
  const risultatiQuery = useUltimiRisultatiSocio(socioId, sport)
  const pref = preferenzeQuery.data?.[sport] ?? null
  const impostate = preferenzeImpostate(pref)
  const orarioLabel = ORARI.find((o) => o.id === pref?.orario_preferito)?.label
  const posizioneLabel = POSIZIONI[sport].find((p) => p.id === pref?.posizione)?.label
  // I giorni sono salvati nell'ordine in cui l'utente li ha selezionati (vedi
  // alternaGiorno in QuestionarioPreferenze.tsx), qui vanno mostrati da
  // lunedì a domenica: riordino secondo GIORNI, che è già in quell'ordine.
  const giorniOrdinati = GIORNI.filter((g) => pref?.giorni_preferiti.includes(g.id))

  return (
    <div className="amico-dett-sport-card">
      <div className="livello-gioco-riga">
        <div className="livello-gioco-info">
          <span className="livello-gioco-sport">Livello (ELO)</span>
          <span className="livello-gioco-stato">Non disponibile</span>
        </div>
      </div>

      {!preferenzeQuery.isLoading && impostate && pref && (
        <div className="amico-dett-sotto">
          <span className="club-sez-titolo">Preferenze</span>
          <div className="pref-lista">
            {pref.mano_piede_preferito && (
              <div className="pref-riga">
                <span className="pref-etichetta">{ETICHETTA_ARTO[sport]}</span>
                <span className="pref-valore">{pref.mano_piede_preferito === 'destra' ? 'Destra' : 'Sinistra'}</span>
              </div>
            )}
            {posizioneLabel && (
              <div className="pref-riga">
                <span className="pref-etichetta">Posizione preferita</span>
                <span className="pref-valore">{posizioneLabel}</span>
              </div>
            )}
            {orarioLabel && (
              <div className="pref-riga">
                <span className="pref-etichetta">Orario preferito</span>
                <span className="pref-valore">{orarioLabel}</span>
              </div>
            )}
            {giorniOrdinati.length > 0 && (
              <div className="pref-riga">
                <span className="pref-etichetta">Giorni preferiti</span>
                <span className="pref-valore">{giorniOrdinati.map((g) => g.label).join(' · ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!risultatiQuery.isLoading && (risultatiQuery.data ?? []).length > 0 && (
        <div className="amico-dett-sotto">
          <span className="club-sez-titolo">Ultimi risultati</span>
          <CaroselloFrecce className="risultati-scroll">
            {(risultatiQuery.data ?? []).map((m) => (
              <div key={m.prenotazione_id} className={'match match-mini' + (m.risultato_dettaglio ? ' giocata' : '')}>
                <CardPartita
                  inizio={m.inizio}
                  fine={m.fine}
                  campoNome={m.campo_nome}
                  dettaglio={m.risultato_dettaglio}
                />
              </div>
            ))}
          </CaroselloFrecce>
        </div>
      )}
    </div>
  )
}

// `rec`/`onRimuovi` omessi: usato anche per un giocatore qualsiasi che non
// è un amico vero e proprio (vedi CardGiocatori in AreaClubSchede.tsx, per
// staff che "vede" tutti i soci senza una vera amicizia) — lì non c'è
// un'amicizia da rimuovere, quindi il bottone "Rimuovi" va nascosto.
export default function DettaglioAmicoModal({
  voce,
  amiciCount,
  onChat,
  onGestisci,
  nascondiPrenotaInsieme,
  onRimuovi,
  onChiudi,
}: {
  voce: Omit<VoceAmico, 'rec' | 'nPartite'>
  amiciCount: number
  onChat: () => void
  // Admin/collaboratore: apre la scheda di gestione (punti/crediti/ecc.),
  // vedi DettaglioGiocatore.tsx in segreteria.
  onGestisci?: () => void
  // L'admin non prenota per sé stesso: qui non ha senso invitare un altro
  // socio a giocare insieme (vedi GestioneGiocatori.tsx).
  nascondiPrenotaInsieme?: boolean
  onRimuovi?: () => void
  onChiudi: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onChiudi])

  const [sportAttivo, setSportAttivo] = useState<Sport>('padel')
  const partite = usePartiteConAmico(voce.id)
  const attivitaTotali = usePartiteTotaliSocio(voce.id)
  const partiteSport = (partite.data ?? []).filter((m) => m.sport === sportAttivo)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onChiudi}
    >
      <div className="amico-dett-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="amico-dett-chiudi" onClick={onChiudi} aria-label="Chiudi">
          ✕
        </button>

        <div className="amico-dett-hero">
          <Avatar foto={voce.foto_url} iniziali={inizialiDaEtichetta(voce.etichetta)} size={72} />
          <div className="amico-dett-nome">{voce.etichetta}</div>
        </div>

        <TabellaStatistiche attivita={attivitaTotali.data} amici={amiciCount} punti={voce.punti} />

        <div className="amico-dett-azioni">
          <button type="button" className="btn btn-secondario" onClick={onChat}>
            <IcoChat /> Chat
          </button>
          {onGestisci && (
            <button type="button" className="btn btn-secondario" onClick={onGestisci}>
              <IcoGestisci /> Gestisci
            </button>
          )}
          {!nascondiPrenotaInsieme && (
            <Link to="/prenota" state={{ amicoId: voce.id }} className="btn">
              <IcoCalendario /> Prenota insieme
            </Link>
          )}
          {onRimuovi && (
            <button type="button" className="btn btn-pericolo" onClick={onRimuovi}>
              <IcoBidone /> Rimuovi
            </button>
          )}
        </div>

        <div className="amico-dett-sez">
          <nav className="sport-selettore" aria-label="Scegli lo sport">
            {(['padel', 'calcio'] as Sport[]).map((s) => (
              <button
                key={s}
                type="button"
                className={'sport-rett' + (s === sportAttivo ? ' attivo' : '')}
                onClick={() => setSportAttivo(s)}
              >
                <SportIcona sport={s} size={18} />{ETICHETTE_SPORT[s]}
              </button>
            ))}
          </nav>
          <CardSport socioId={voce.id} sport={sportAttivo} />
        </div>

        <div className="amico-dett-sez">
          <h3 className="club-sez-titolo">Ultime partite giocate insieme</h3>
          {partite.isLoading ? (
            <p className="sub">Caricamento…</p>
          ) : partite.error ? (
            <p className="sub">
              {mancaRpc(partite.error)
                ? 'Esegui lo script tappa83-partite-con-amico.sql su Supabase per attivare questa sezione.'
                : 'Impossibile caricare: ' + messaggioErrore(partite.error)}
            </p>
          ) : partiteSport.length === 0 ? (
            <p className="sub">Non avete ancora giocato a {ETICHETTE_SPORT[sportAttivo].toLowerCase()} insieme.</p>
          ) : (
            <CaroselloFrecce className="risultati-scroll">
              {partiteSport.map((m) => (
                <div key={m.prenotazione_id} className={'match match-mini' + (m.risultato_dettaglio ? ' giocata' : '')}>
                  <CardPartita
                    inizio={m.inizio}
                    fine={m.fine}
                    campoNome={m.campo_nome}
                    dettaglio={m.risultato_dettaglio}
                  />
                </div>
              ))}
            </CaroselloFrecce>
          )}
        </div>
      </div>
    </div>
  )
}
