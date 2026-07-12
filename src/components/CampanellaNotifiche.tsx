import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import { useNotifiche, type Notifica } from '@/features/notifiche/useNotifiche'
import { useConversazioni } from '@/features/chat/useChat'
import ChatModal from '@/features/chat/ChatModal'
import type { SocioPubblico } from '@/features/profilo/amici/useAmici'
import AnnunciPagina from '@/features/profilo/pagine/AnnunciPagina'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { tempoRelativo, titleCase, inizialiDaEtichetta } from '@/lib/formato'

type Scheda = 'notifiche' | 'chat' | 'annunci'

function IcoChiudi() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Campanella notifiche: icona propria accanto all'omino nell'header (prima
// era una voce dentro il menu dell'omino — spostata fuori su richiesta,
// più immediata da raggiungere). Il click apre una vera scheda a schermo
// intero (come la scheda account di MenuUtente, non un pannello a
// comparsa) con tre tab: notifiche push, chat con amici/staff e annunci
// del club, così non servono tre punti diversi per vedere "cosa c'è di nuovo".
export default function CampanellaNotifiche() {
  const { profilo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [aperto, setAperto] = useState(false)
  const [scheda, setScheda] = useState<Scheda>('notifiche')
  const [chatCon, setChatCon] = useState<{ id: string; etichetta: string } | null>(null)

  // La minicard "Annunci" di Area Club non porta più a una pagina a sé,
  // ma apre direttamente questa scheda sulla tab Annunci (segnale passato
  // via location.state, stesso pattern di "apriNuovo" in SezioneCompagni).
  // Puliamo subito lo state dopo averlo consumato, altrimenti riaprirebbe
  // la scheda a ogni ri-render/back sulla stessa route.
  useEffect(() => {
    if ((location.state as { apriNotificheAnnunci?: boolean } | null)?.apriNotificheAnnunci) {
      setAperto(true)
      setScheda('annunci')
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  const { notifiche, nonLette, errore, segnaLetta, segnaTutteLette, elimina } = useNotifiche(profilo?.id)
  const { conversazioni, totaleNonLetti, errore: erroreChat } = useConversazioni(
    aperto ? profilo?.id : undefined,
  )
  // Stessa queryKey di useAmici (soci_pubblici): se l'utente ha già aperto
  // Amici/Contatti la cache è già calda, altrimenti si carica solo qui,
  // solo quando il pannello è aperto — non ad ogni pagina.
  const sociQuery = useQuery({
    queryKey: ['soci_pubblici'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('soci_pubblici')
      if (error) throw error
      return (data ?? []) as SocioPubblico[]
    },
    enabled: aperto,
  })

  if (!profilo) return null

  const sociById = new Map((sociQuery.data ?? []).map((s) => [s.id, s]))

  function chiudi() {
    setAperto(false)
  }

  function apriNotifica(n: Notifica) {
    if (!n.letta) segnaLetta.mutate(n.id)
    chiudi()
    if (n.url) navigate(n.url)
  }

  function apriChat(altroId: string) {
    const socio = sociById.get(altroId)
    setChatCon({ id: altroId, etichetta: socio ? titleCase(socio.etichetta) : 'Socio' })
    chiudi()
  }

  const titoloScheda = scheda === 'notifiche' ? 'Notifiche' : scheda === 'chat' ? 'Chat' : 'Annunci'

  return (
    <div className="menu-utente">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        title="Notifiche"
        className="relative flex items-center rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {nonLette > 0 && <span className="campanella-badge">{nonLette > 9 ? '9+' : nonLette}</span>}
      </button>

      {aperto && (
        <div className="account-schermo campanella-schermo">
          <button type="button" className="account-schermo-chiudi" onClick={chiudi} aria-label="Chiudi">
            <IcoChiudi />
          </button>

          <div className="account-schermo-corpo campanella-schermo-corpo">
            <div className="campanella-schermo-head">
              <span className="account-panel-titolo campanella-schermo-titolo">{titoloScheda}</span>
              {scheda === 'notifiche' && nonLette > 0 && (
                <button type="button" className="campanella-segna-tutte" onClick={() => segnaTutteLette.mutate()}>
                  Segna tutte lette
                </button>
              )}
            </div>

            <div className="campanella-tabs">
              <button
                type="button"
                className={'campanella-tab' + (scheda === 'notifiche' ? ' attiva' : '')}
                onClick={() => setScheda('notifiche')}
              >
                Notifiche
                {nonLette > 0 && <span className="campanella-tab-n">{nonLette > 9 ? '9+' : nonLette}</span>}
              </button>
              <button
                type="button"
                className={'campanella-tab' + (scheda === 'chat' ? ' attiva' : '')}
                onClick={() => setScheda('chat')}
              >
                Chat
                {totaleNonLetti > 0 && <span className="campanella-tab-n">{totaleNonLetti > 9 ? '9+' : totaleNonLetti}</span>}
              </button>
              <button
                type="button"
                className={'campanella-tab' + (scheda === 'annunci' ? ' attiva' : '')}
                onClick={() => setScheda('annunci')}
              >
                Annunci
              </button>
            </div>

            {scheda === 'notifiche' && (
              errore ? (
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
              )
            )}

            {scheda === 'chat' && (
              erroreChat ? (
                <p className="campanella-vuoto">
                  {mancaTabella(erroreChat, 'messaggi_chat')
                    ? 'Esegui lo script della chat su Supabase.'
                    : messaggioErrore(erroreChat)}
                </p>
              ) : conversazioni.length === 0 ? (
                <p className="campanella-vuoto">Nessuna conversazione. Scrivi a un amico dalla sua scheda.</p>
              ) : (
                <ul className="campanella-lista">
                  {conversazioni.map((c) => {
                    const socio = sociById.get(c.altroId)
                    const nome = socio ? titleCase(socio.etichetta) : 'Socio'
                    const mio = c.ultimo.mittente_id === profilo.id
                    return (
                      <li key={c.altroId} className={'campanella-item' + (c.nonLetti > 0 ? ' non-letta' : '')}>
                        <button
                          type="button"
                          className="campanella-item-btn campanella-chat-btn"
                          onClick={() => apriChat(c.altroId)}
                        >
                          <Avatar foto={socio?.foto_url} iniziali={inizialiDaEtichetta(nome)} size={40} />
                          <span className="campanella-chat-info">
                            <span className="campanella-item-titolo">{nome}</span>
                            <span className="campanella-item-corpo campanella-chat-anteprima">
                              {mio ? 'Tu: ' : ''}{c.ultimo.testo}
                            </span>
                          </span>
                          <span className="campanella-item-tempo campanella-chat-tempo">
                            {tempoRelativo(c.ultimo.creato_il)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
            )}

            {/* Non una lista ricostruita: la stessa scheda Annunci di Area
                Club, incorporata qui (vedi AnnunciPagina.tsx). */}
            {scheda === 'annunci' && <AnnunciPagina embedded />}
          </div>
        </div>
      )}

      {chatCon && (
        <ChatModal profiloId={profilo.id} amico={chatCon} onChiudi={() => setChatCon(null)} />
      )}
    </div>
  )
}
