import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dataEstesa, inizialiDaEtichetta } from '@/lib/formato'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import { oraLocale } from '@/features/prenotazioni/orari'
import Avatar from '@/components/Avatar'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti } from '@/features/profilo/livelliPunti'
import { RigaSquadre } from '@/features/profilo/AttivitaConcluse'
import { usePartiteConAmico } from './usePartiteConAmico'
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

export default function DettaglioAmicoModal({
  voce,
  onChat,
  onRimuovi,
  onChiudi,
}: {
  voce: VoceAmico
  onChat: () => void
  onRimuovi: () => void
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

  const partite = usePartiteConAmico(voce.id)
  const lv = livelloDaPunti(voce.punti, LIVELLI_PUNTI_DEFAULT)
  const lvNome = LIVELLI_PUNTI_DEFAULT[lv - 1]?.nome ?? ''

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
          <div className="amico-dett-sub">{lvNome} · {voce.punti} pt</div>
        </div>

        <div className="amico-dett-azioni">
          <button type="button" className="btn btn-secondario" onClick={onChat}>
            <IcoChat /> Chat
          </button>
          <Link to="/prenota" state={{ amicoId: voce.id }} className="btn">
            <IcoCalendario /> Prenota insieme
          </Link>
          <button type="button" className="btn btn-pericolo" onClick={onRimuovi}>
            <IcoBidone /> Rimuovi
          </button>
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
          ) : (partite.data ?? []).length === 0 ? (
            <p className="sub">Non avete ancora giocato partite insieme.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(partite.data ?? []).map((m) => (
                <div key={m.prenotazione_id} className={'match' + (m.risultato_dettaglio ? ' giocata' : '')}>
                  {m.risultato_dettaglio ? (
                    <RigaSquadre
                      nomiCasa={m.risultato_dettaglio.squadraCasa}
                      nomiOspite={m.risultato_dettaglio.squadraOspite}
                      risultato={{
                        punti: [m.risultato_dettaglio.puntiCasa, m.risultato_dettaglio.puntiOspite],
                        set: m.risultato_dettaglio.set ?? undefined,
                      }}
                    />
                  ) : (
                    <p className="sub text-center">Risultato non ancora inserito</p>
                  )}
                  <div className="match-meta">
                    <span className="chip-data">
                      {dataEstesa(m.inizio.slice(0, 10))}, {oraLocale(new Date(m.inizio))}–{oraLocale(new Date(m.fine))}, {m.campo_nome ?? 'Campo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
