import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import ModaleLegale from './legale/ModaleLegale'
import { PrivacyContent, TerminiContent } from './legale/DocumentiLegali'
import DatiProfilo from '@/features/profilo/DatiProfilo'
import AttivitaPage from '@/features/profilo/AttivitaPage'
import ImpostazioniAccountPage from '@/features/profilo/ImpostazioniAccountPage'
import BenvenutoHero from '@/features/profilo/BenvenutoHero'
import GestioneCampi from '@/features/segreteria/GestioneCampi'
import ValoriPunti from '@/features/segreteria/ValoriPunti'
import GestioneLivelli from '@/features/segreteria/GestioneLivelli'
import RigeneraPunti from '@/features/segreteria/RigeneraPunti'
import IntervalliCrediti from '@/features/segreteria/IntervalliCrediti'
import GestionePremi from '@/features/segreteria/GestionePremi'
import GestioneAnnunci from '@/features/segreteria/GestioneAnnunci'
import StoricoPrenotazioni from '@/features/segreteria/StoricoPrenotazioni'
import GestioneGiocatori from '@/features/segreteria/GestioneGiocatori'
import StaffClubPagina from '@/features/profilo/pagine/StaffClubPagina'

function IcoAvatar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IcoModifica() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

function IcoAttivita() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IcoImpostazioni() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IcoDocumento() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function IcoScudo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  )
}

function IcoCampo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <path d="M3 12h4M17 12h4" />
    </svg>
  )
}

function IcoPunti() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 15.5 12 8l2.5 7.5M10.2 13h3.6" />
    </svg>
  )
}

function IcoRegalo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="9" width="18" height="4" rx="1" />
      <rect x="4.5" y="13" width="15" height="8" rx="1" />
      <line x1="12" y1="9" x2="12" y2="21" />
      <path d="M12 9c-1.2-3-4-4.5-5.5-3S6 9 8 9z" />
      <path d="M12 9c1.2-3 4-4.5 5.5-3S18 9 16 9z" />
    </svg>
  )
}

function IcoMegafonoClub() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M19 8h1a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2" />
      <line x1="7" y1="8" x2="13" y2="8" />
      <line x1="7" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function IcoStoricoPren() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 2h6" />
    </svg>
  )
}

function IcoContatti() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="12" cy="10" r="2.2" /><path d="M8 16.5a4 4 0 0 1 8 0" />
    </svg>
  )
}

function IcoGiocatoriClub() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IcoEsci() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IcoChiudi() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IcoIndietro() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IcoFreccia() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="account-menu-voce-freccia">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

type Vista =
  | 'menu' | 'dati' | 'attivita' | 'impostazioni' | 'supporto-contatti'
  | 'club-campi' | 'club-punti' | 'club-premi' | 'club-annunci'
  | 'club-storico-prenotazioni' | 'club-giocatori'
type Legale = 'privacy' | 'termini' | null

const TITOLI_VISTA: Record<Exclude<Vista, 'menu'>, string> = {
  dati: 'Modifica profilo',
  attivita: 'Storico attività',
  impostazioni: 'Impostazioni',
  'supporto-contatti': 'Contatti',
  'club-campi': 'Campi e regole',
  'club-punti': 'Punti e crediti',
  'club-premi': 'Premi',
  'club-annunci': 'Annunci',
  'club-storico-prenotazioni': 'Storico prenotazioni',
  'club-giocatori': 'Giocatori del club',
}

// Un bottone "omino" (solo icona/foto profilo, niente nome — richiesto
// esplicitamente) apre a schermo intero (non un pannello a comparsa) la
// scheda account: Il tuo account (Modifica profilo/Storico attività/
// Impostazioni), Il tuo club (solo admin: gestione campi/punti/premi/
// annunci/prenotazioni/giocatori, tutta in un unico posto invece che sparsa
// tra header e pagina Prenotazioni), Informazioni legali, Esci. La
// campanella notifiche è un'icona a parte (vedi CampanellaNotifiche.tsx).
export default function MenuUtente() {
  const { esci, profilo } = useAuth()
  const navigate = useNavigate()
  const [aperto, setAperto] = useState(false)
  const [vista, setVista] = useState<Vista>('menu')
  const [legale, setLegale] = useState<Legale>(null)

  function chiudi() {
    setAperto(false)
    setVista('menu')
  }

  // Chiude lo schermo account (a tutto schermo, resterebbe sopra la
  // pagina di destinazione) e porta alla gestione delle richieste di
  // lezione — link diretto dal pallino rosso su "Richieste" in BenvenutoHero.
  function vaiARichiesteLezione() {
    chiudi()
    navigate('/profilo/gestione-lezioni')
  }

  return (
    <div className="menu-utente">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        title="Il mio account"
        className="flex items-center rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <span className="menu-utente-avatar">
          {profilo?.foto_url ? (
            <img src={profilo.foto_url} alt="" className="menu-utente-foto" />
          ) : (
            <IcoAvatar />
          )}
        </span>
      </button>

      {aperto && (
        <div className="account-schermo">
          {vista === 'menu' ? (
            <>
              <button type="button" className="account-schermo-chiudi" onClick={chiudi} aria-label="Chiudi">
                <IcoChiudi />
              </button>

              <div className="account-schermo-corpo">
                <BenvenutoHero onRichiesteClick={vaiARichiesteLezione} />

                <div className="account-panel-sezione">
                  <div className="account-panel-titolo">Il tuo account</div>
                  <button type="button" className="account-menu-voce" onClick={() => setVista('dati')}>
                    <span className="account-menu-voce-ico"><IcoModifica /></span>
                    <span className="account-menu-voce-testo">Modifica profilo</span>
                    <IcoFreccia />
                  </button>
                  <button type="button" className="account-menu-voce" onClick={() => setVista('attivita')}>
                    <span className="account-menu-voce-ico"><IcoAttivita /></span>
                    <span className="account-menu-voce-testo">Storico attività</span>
                    <IcoFreccia />
                  </button>
                  <button type="button" className="account-menu-voce" onClick={() => setVista('impostazioni')}>
                    <span className="account-menu-voce-ico"><IcoImpostazioni /></span>
                    <span className="account-menu-voce-testo">Impostazioni</span>
                    <IcoFreccia />
                  </button>
                </div>

                <div className="account-panel-sezione">
                  <div className="account-panel-titolo">Supporto</div>
                  <button type="button" className="account-menu-voce" onClick={() => setVista('supporto-contatti')}>
                    <span className="account-menu-voce-ico"><IcoContatti /></span>
                    <span className="account-menu-voce-testo">Contatti</span>
                    <IcoFreccia />
                  </button>
                </div>

                {profilo?.is_admin && (
                  <div className="account-panel-sezione">
                    <div className="account-panel-titolo">Il tuo club</div>
                    <button type="button" className="account-menu-voce" onClick={() => setVista('club-campi')}>
                      <span className="account-menu-voce-ico"><IcoCampo /></span>
                      <span className="account-menu-voce-testo">Campi e regole</span>
                      <IcoFreccia />
                    </button>
                    <button type="button" className="account-menu-voce" onClick={() => setVista('club-punti')}>
                      <span className="account-menu-voce-ico"><IcoPunti /></span>
                      <span className="account-menu-voce-testo">Punti e crediti</span>
                      <IcoFreccia />
                    </button>
                    <button type="button" className="account-menu-voce" onClick={() => setVista('club-premi')}>
                      <span className="account-menu-voce-ico"><IcoRegalo /></span>
                      <span className="account-menu-voce-testo">Premi</span>
                      <IcoFreccia />
                    </button>
                    <button type="button" className="account-menu-voce" onClick={() => setVista('club-annunci')}>
                      <span className="account-menu-voce-ico"><IcoMegafonoClub /></span>
                      <span className="account-menu-voce-testo">Annunci</span>
                      <IcoFreccia />
                    </button>
                    <button type="button" className="account-menu-voce" onClick={() => setVista('club-storico-prenotazioni')}>
                      <span className="account-menu-voce-ico"><IcoStoricoPren /></span>
                      <span className="account-menu-voce-testo">Storico prenotazioni</span>
                      <IcoFreccia />
                    </button>
                    <button type="button" className="account-menu-voce" onClick={() => setVista('club-giocatori')}>
                      <span className="account-menu-voce-ico"><IcoGiocatoriClub /></span>
                      <span className="account-menu-voce-testo">Giocatori del club</span>
                      <IcoFreccia />
                    </button>
                  </div>
                )}

                <div className="account-panel-sezione">
                  <div className="account-panel-titolo">Informazioni legali</div>
                  <button type="button" className="account-menu-voce" onClick={() => setLegale('termini')}>
                    <span className="account-menu-voce-ico"><IcoDocumento /></span>
                    <span className="account-menu-voce-testo">Condizioni d'uso</span>
                    <IcoFreccia />
                  </button>
                  <button type="button" className="account-menu-voce" onClick={() => setLegale('privacy')}>
                    <span className="account-menu-voce-ico"><IcoScudo /></span>
                    <span className="account-menu-voce-testo">Informativa Privacy</span>
                    <IcoFreccia />
                  </button>
                </div>

                <div className="account-panel-sezione">
                  <button
                    type="button"
                    className="account-menu-voce pericolo"
                    onClick={() => {
                      chiudi()
                      esci()
                    }}
                  >
                    <span className="account-menu-voce-ico"><IcoEsci /></span>
                    <span className="account-menu-voce-testo">Esci</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="account-schermo-vista">
              <div className="account-schermo-vista-head">
                <button type="button" className="account-schermo-indietro" onClick={() => setVista('menu')} aria-label="Torna al menu">
                  <IcoIndietro />
                </button>
                <h2>{TITOLI_VISTA[vista]}</h2>
                <button type="button" className="account-schermo-vista-chiudi" onClick={chiudi} aria-label="Chiudi">
                  <IcoChiudi />
                </button>
              </div>
              <div className="account-schermo-vista-corpo">
                {vista === 'dati' && <DatiProfilo />}
                {vista === 'attivita' && <AttivitaPage />}
                {vista === 'impostazioni' && <ImpostazioniAccountPage />}
                {vista === 'supporto-contatti' && <StaffClubPagina embedded />}
                {vista === 'club-campi' && <GestioneCampi />}
                {vista === 'club-punti' && (
                  <>
                    <ValoriPunti />
                    <GestioneLivelli />
                    <RigeneraPunti />
                    <IntervalliCrediti />
                  </>
                )}
                {vista === 'club-premi' && <GestionePremi />}
                {vista === 'club-annunci' && <GestioneAnnunci />}
                {vista === 'club-storico-prenotazioni' && <StoricoPrenotazioni />}
                {vista === 'club-giocatori' && <GestioneGiocatori embedded />}
              </div>
            </div>
          )}
        </div>
      )}

      {legale === 'termini' && (
        <ModaleLegale titolo="Condizioni d'uso" onChiudi={() => setLegale(null)}>
          <TerminiContent />
        </ModaleLegale>
      )}
      {legale === 'privacy' && (
        <ModaleLegale titolo="Informativa Privacy" onChiudi={() => setLegale(null)}>
          <PrivacyContent />
        </ModaleLegale>
      )}
    </div>
  )
}
