import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useNotifiche, type Notifica } from '@/features/notifiche/useNotifiche'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { tempoRelativo } from '@/lib/formato'

type Vista = 'menu' | 'notifiche'

function IcoNotifiche() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IcoDati() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
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

// Sostituisce le vecchie icone separate (profilo, campanella, esci) nell'header:
// un solo bottone "omino" apre una lista a discesa con Notifiche, I miei dati,
// Esci.
export default function MenuUtente() {
  const { profilo, esci } = useAuth()
  const navigate = useNavigate()
  const [aperto, setAperto] = useState(false)
  const [vista, setVista] = useState<Vista>('menu')
  const { notifiche, nonLette, errore, segnaLetta, segnaTutteLette, elimina } = useNotifiche(profilo?.id)

  if (!profilo) return null

  function chiudi() {
    setAperto(false)
    setVista('menu')
  }

  function apriNotifica(n: Notifica) {
    if (!n.letta) segnaLetta.mutate(n.id)
    chiudi()
    if (n.url) navigate(n.url)
  }

  return (
    <div className="menu-utente">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        title="Il mio account"
        className="relative flex items-center rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" />
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
        </svg>
        {nonLette > 0 && <span className="campanella-badge">{nonLette > 9 ? '9+' : nonLette}</span>}
      </button>

      {aperto && (
        <>
          <div className="campanella-overlay" onClick={chiudi} />
          <div className={'campanella-panel' + (vista === 'menu' ? ' campanella-panel-stretta' : '')}>
            {vista === 'menu' ? (
              <div className="menu-utente-lista">
                <button type="button" className="menu-utente-voce" onClick={() => setVista('notifiche')}>
                  <span className="menu-utente-voce-ico"><IcoNotifiche /></span>
                  <span className="menu-utente-voce-testo">Notifiche</span>
                  {nonLette > 0 && <span className="amici-n-badge">{nonLette}</span>}
                </button>
                <Link to="/profilo?sezione=dati" className="menu-utente-voce" onClick={chiudi}>
                  <span className="menu-utente-voce-ico"><IcoDati /></span>
                  <span className="menu-utente-voce-testo">I miei dati</span>
                </Link>
                <button
                  type="button"
                  className="menu-utente-voce pericolo"
                  onClick={() => {
                    chiudi()
                    esci()
                  }}
                >
                  <span className="menu-utente-voce-ico"><IcoEsci /></span>
                  <span className="menu-utente-voce-testo">Esci</span>
                </button>
              </div>
            ) : (
              <>
                <div className="campanella-head">
                  <button type="button" className="menu-utente-indietro" onClick={() => setVista('menu')}>
                    ‹ Notifiche
                  </button>
                  {nonLette > 0 && (
                    <button type="button" className="campanella-segna-tutte" onClick={() => segnaTutteLette.mutate()}>
                      Segna tutte lette
                    </button>
                  )}
                </div>

                {errore ? (
                  <p className="campanella-vuoto">
                    {mancaTabella(errore, 'notifiche')
                      ? 'Esegui lo script tappa44-notifiche.sql su Supabase.'
                      : messaggioErrore(errore)}
                  </p>
                ) : notifiche.length === 0 ? (
                  <p className="campanella-vuoto">Nessuna notifica.</p>
                ) : (
                  <ul className="campanella-lista">
                    {notifiche.map((n) => (
                      <li key={n.id} className={'campanella-item' + (n.letta ? '' : ' non-letta')}>
                        <button type="button" className="campanella-item-btn" onClick={() => apriNotifica(n)}>
                          <span className="campanella-item-titolo">{n.titolo}</span>
                          {n.corpo && <span className="campanella-item-corpo">{n.corpo}</span>}
                          <span className="campanella-item-tempo">{tempoRelativo(n.creato_il)}</span>
                        </button>
                        <button
                          type="button"
                          className="campanella-item-x"
                          onClick={() => elimina.mutate(n.id)}
                          aria-label="Elimina notifica"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
