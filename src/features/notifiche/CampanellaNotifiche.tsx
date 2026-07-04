import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { tempoRelativo } from '@/lib/formato'
import { useNotifiche, type Notifica } from './useNotifiche'

export default function CampanellaNotifiche() {
  const { profilo } = useAuth()
  const navigate = useNavigate()
  const [aperto, setAperto] = useState(false)
  const { notifiche, nonLette, errore, segnaLetta, segnaTutteLette, elimina } = useNotifiche(profilo?.id)

  if (!profilo) return null

  function apri(n: Notifica) {
    if (!n.letta) segnaLetta.mutate(n.id)
    setAperto(false)
    if (n.url) navigate(n.url)
  }

  return (
    <div className="campanella">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        title="Notifiche"
        className="relative flex items-center rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {nonLette > 0 && <span className="campanella-badge">{nonLette > 9 ? '9+' : nonLette}</span>}
      </button>

      {aperto && (
        <>
          <div className="campanella-overlay" onClick={() => setAperto(false)} />
          <div className="campanella-panel">
            <div className="campanella-head">
              <span>Notifiche</span>
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
                    <button type="button" className="campanella-item-btn" onClick={() => apri(n)}>
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
          </div>
        </>
      )}
    </div>
  )
}
