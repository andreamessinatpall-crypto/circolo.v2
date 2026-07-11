import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useAmici, type VoceStaff } from '../amici/useAmici'
import Avatar from '@/components/Avatar'
import { inizialiDaEtichetta } from '@/lib/formato'
import { SportIcona } from '@/components/IconeSport'
import DisponibilitaIstruttoreModal from '@/features/lezioni/DisponibilitaIstruttoreModal'
import { useConversazioni } from '@/features/chat/useChat'
import ChatModal from '@/features/chat/ChatModal'
import { useCampi } from '@/features/prenotazioni/datiPrenotazioni'
import TornaAreaClub from './TornaAreaClub'

// Recapiti e indirizzo del circolo: valori fissi (non ci sono ancora
// impostazioni editabili per queste info) — se in futuro servirà cambiarli
// da pannello admin, andranno spostati in una tabella "impostazioni".
const TELEFONO = '+39 333 1234567'
const TELEFONO_HREF = 'tel:+393331234567'
const WHATSAPP_HREF = 'https://wa.me/393331234567'
const INDIRIZZO = 'Via Cristoforo Colombo 111, 98066 Patti (ME)'

function IcoChat() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function IcoTelefono() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IcoWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.15-1.7-.85-2-.94-.27-.1-.46-.15-.66.15-.2.3-.75.94-.92 1.13-.17.2-.34.22-.63.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.73-1.63-2.03-.17-.3-.02-.46.13-.6.13-.13.3-.34.44-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.18-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.3-1.02 1-1.02 2.42s1.05 2.8 1.2 3c.15.2 2.06 3.15 5 4.4.7.3 1.24.48 1.67.62.7.22 1.34.19 1.84.12.56-.08 1.7-.7 1.95-1.37.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.57-.34z" />
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.05-1.33A10 10 0 1 0 12 2zm0 18.2a8.16 8.16 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31A8.2 8.2 0 1 1 12 20.2z" />
    </svg>
  )
}

function IcoOrologio() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

function IcoPin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// Chiama / WhatsApp in cima, poi orari (min/max di apertura/chiusura tra i
// campi in servizio — stessi ogni giorno, non c'è un orario per giorno
// della settimana) e infine indirizzo con mappa.
function ContattiClub() {
  const campiQuery = useCampi()
  // "HH:MM:SS" in tabella (vedi GestioneCampi.tsx): tronca ai minuti come lì.
  const attivi = (campiQuery.data ?? [])
    .filter((c) => c.in_servizio !== false)
    .map((c) => ({ apertura: c.apertura?.slice(0, 5) ?? null, chiusura: c.chiusura?.slice(0, 5) ?? null }))
  const apertura = attivi.reduce<string | null>(
    (min, c) => (c.apertura && (!min || c.apertura < min) ? c.apertura : min),
    null,
  )
  const chiusura = attivi.reduce<string | null>(
    (max, c) => (c.chiusura && (!max || c.chiusura > max) ? c.chiusura : max),
    null,
  )
  const mappaSrc = `https://www.google.com/maps?q=${encodeURIComponent(INDIRIZZO)}&output=embed`
  const mappaHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(INDIRIZZO)}`

  return (
    <div className="flex flex-col gap-3" style={{ marginBottom: '1.5rem' }}>
      <div className="grid grid-cols-2 gap-2">
        <a href={TELEFONO_HREF} className="btn flex items-center justify-center gap-2">
          <IcoTelefono /> Chiama
        </a>
        <a
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noreferrer"
          className="btn flex items-center justify-center gap-2"
          style={{ background: '#25D366', borderColor: '#25D366' }}
        >
          <IcoWhatsApp /> WhatsApp
        </a>
      </div>
      <p className="sub text-center" style={{ margin: 0 }}>{TELEFONO}</p>

      <div className="eyebrow" style={{ margin: '0.5rem 0 0' }}>Orari di apertura</div>
      <div className="card flex items-center gap-2.5" style={{ padding: '14px 16px' }}>
        <IcoOrologio />
        {apertura && chiusura ? (
          <span>Lunedì – Domenica, {apertura}–{chiusura}</span>
        ) : (
          <span className="sub">Orari non ancora disponibili.</span>
        )}
      </div>

      <div className="eyebrow" style={{ margin: '0.5rem 0 0' }}>Dove ci troviamo</div>
      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: '10px' }}>
          <IcoPin />
          <span>{INDIRIZZO}</span>
        </div>
        <iframe
          title="Mappa del circolo"
          src={mappaSrc}
          width="100%"
          height="200"
          style={{ border: 0, borderRadius: '12px' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <a
          href={mappaHref}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondario btn-mini"
          style={{ marginTop: '10px', display: 'inline-block' }}
        >
          Apri in Google Maps
        </a>
      </div>

      <div className="eyebrow" style={{ margin: '0.5rem 0 0' }}>Staff</div>
    </div>
  )
}

function CardStaff({
  voce,
  onClick,
  onChat,
  nonLetti,
}: {
  voce: VoceStaff
  onClick?: () => void
  onChat: () => void
  nonLetti: number
}) {
  const cliccabile = voce.ruolo === 'istruttore' && !!onClick
  return (
    <div
      className={'amici-card' + (cliccabile ? ' cursor-pointer' : '')}
      onClick={onClick}
      role={cliccabile ? 'button' : undefined}
      tabIndex={cliccabile ? 0 : undefined}
      onKeyDown={
        cliccabile
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick!()
              }
            }
          : undefined
      }
      title={cliccabile ? 'Vedi le sue disponibilità per lezioni' : undefined}
    >
      <Avatar foto={voce.foto_url} iniziali={inizialiDaEtichetta(voce.etichetta)} titolo={voce.etichetta} size={40} />
      <div className="amici-card-info">
        <div className="amici-card-nome">
          {voce.etichetta}
          {voce.sport && <span className="amici-sport-ico"><SportIcona sport={voce.sport} /></span>}
        </div>
        <div className="amici-card-sub capitalize">{voce.ruolo}</div>
      </div>
      <div className="amici-card-azioni">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChat() }}
          className="btn btn-secondario btn-mini relative flex items-center justify-center"
          title={`Chat con ${voce.etichetta}`}
        >
          <IcoChat />
          {nonLetti > 0 && <span className="chat-puntino" aria-label={`${nonLetti} messaggi non letti`} />}
        </button>
      </div>
    </div>
  )
}

export default function StaffClubPagina() {
  const [istruttoreAperto, setIstruttoreAperto] = useState<VoceStaff | null>(null)
  const [chatCon, setChatCon] = useState<VoceStaff | null>(null)
  const { profilo } = useAuth()
  const { staff } = useAmici(profilo?.id ?? '')
  const { conversazioni } = useConversazioni(profilo?.id)
  const nonLettiPerStaff = new Map(conversazioni.map((c) => [c.altroId, c.nonLetti]))

  return (
    <div>
      <TornaAreaClub titolo="Contatti" />

      <ContattiClub />

      {staff.length === 0 ? (
        <p className="sub">Nessun membro dello staff al momento.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {staff.map((s) => (
            <CardStaff
              key={s.id}
              voce={s}
              onClick={s.ruolo === 'istruttore' ? () => setIstruttoreAperto(s) : undefined}
              onChat={() => setChatCon(s)}
              nonLetti={nonLettiPerStaff.get(s.id) ?? 0}
            />
          ))}
        </div>
      )}

      {istruttoreAperto && (
        <DisponibilitaIstruttoreModal
          istruttoreId={istruttoreAperto.id}
          nome={istruttoreAperto.etichetta}
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
