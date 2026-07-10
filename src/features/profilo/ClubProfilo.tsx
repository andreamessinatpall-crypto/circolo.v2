import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/useAuth'
import ClassificaClub from './ClassificaClub'
import { TorneiInCorso, TorneiInProgramma } from './TorneiClub'
import { useAmici, type VoceStaff } from './amici/useAmici'
import Avatar from '@/components/Avatar'
import { inizialiDaEtichetta } from '@/lib/formato'
import { SportIcona } from '@/components/IconeSport'
import DisponibilitaIstruttoreModal from '@/features/lezioni/DisponibilitaIstruttoreModal'
import { useConversazioni } from '@/features/chat/useChat'
import ChatModal from '@/features/chat/ChatModal'

function Ico({ d, children }: { d?: string; children?: ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d ? <path d={d} /> : children}
    </svg>
  )
}

const IcoTrofeo = <Ico d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" />
const IcoZap = <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Ico>
const IcoCal = <Ico><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Ico>
const IcoScudo = <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
const IcoChat = <Ico><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Ico>

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
          {IcoChat}
          {nonLetti > 0 && <span className="chat-puntino" aria-label={`${nonLetti} messaggi non letti`} />}
        </button>
      </div>
    </div>
  )
}


function SezClub({
  icona,
  titolo,
  badge,
  children,
}: {
  icona?: ReactNode
  titolo: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <div className="club-sez-header">
        {icona && <span className="club-sez-icona">{icona}</span>}
        <h2 className="club-sez-titolo">{titolo}</h2>
        {badge}
      </div>
      {children}
    </section>
  )
}

// Tab "Club" per collaboratore/istruttore (le loro tab esistenti, non
// toccate dalla riforma di Area Club per il giocatore — vedi
// src/features/profilo/pagine/, dove Classifica/Tornei/Staff sono schede
// separate che riusano ClassificaClub/TorneiClub allo stesso modo).
export default function ClubProfilo() {
  const [istruttoreAperto, setIstruttoreAperto] = useState<VoceStaff | null>(null)
  const [chatCon, setChatCon] = useState<VoceStaff | null>(null)
  const { profilo } = useAuth()
  const istruttore = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin
  const { staff } = useAmici(profilo?.id ?? '')
  const { conversazioni } = useConversazioni(profilo?.id)
  const nonLettiPerStaff = new Map(conversazioni.map((c) => [c.altroId, c.nonLetti]))

  return (
    <div className="club-page">

      <SezClub icona={IcoTrofeo} titolo="Classifica del club">
        <ClassificaClub nascondiHero={istruttore} />
      </SezClub>

      {/* ── Tornei in corso ──────────────────────────────────── */}
      <SezClub icona={IcoZap} titolo="Tornei in corso">
        <div className="card">
          <TorneiInCorso />
        </div>
      </SezClub>

      {/* ── Tornei in programma ──────────────────────────────── */}
      <SezClub icona={IcoCal} titolo="Tornei in programma">
        <div className="card">
          <TorneiInProgramma />
        </div>
      </SezClub>

      {/* ── Staff del club ──────────────────────────────────── */}
      {staff.length > 0 && (
        <SezClub icona={IcoScudo} titolo="Staff del club">
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
        </SezClub>
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
