import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useAmici, type VoceStaff } from '../amici/useAmici'
import Avatar from '@/components/Avatar'
import { inizialiDaEtichetta } from '@/lib/formato'
import { SportIcona } from '@/components/IconeSport'
import DisponibilitaIstruttoreModal from '@/features/lezioni/DisponibilitaIstruttoreModal'
import { useConversazioni } from '@/features/chat/useChat'
import ChatModal from '@/features/chat/ChatModal'
import TornaAreaClub from './TornaAreaClub'

function IcoChat() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
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
