import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useAmici, type VoceStaff } from '../amici/useAmici'
import { useConversazioni } from '@/features/chat/useChat'
import ChatModal from '@/features/chat/ChatModal'
import DisponibilitaIstruttoreModal from '@/features/lezioni/DisponibilitaIstruttoreModal'
import { inizialiDaEtichetta, etichettaSport } from '@/lib/formato'
import { SportIcona } from '@/components/IconeSport'
import TornaAreaClub from './TornaAreaClub'

function IcoChat() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}
const RUOLO_NOME: Record<string, string> = { istruttore: 'Istruttore', collaboratore: 'Collaboratore', admin: 'Admin' }

// Minicard "stile passaporto": foto quadrata incorniciata (non il solito
// avatar tondo), nome e pochi campi in stile documento (Ruolo/Sport),
// separati da una riga come in un vero libretto — più formale/
// professionale della semplice riga con avatar usata in Contatti. La chat
// resta un'icona separata in un angolo (la card non è un vero <button>
// per poterne annidare una senza violare l'HTML).
export function CardIstruttorePassaporto({
  voce,
  onClick,
  onChat,
  nonLetti,
}: {
  voce: VoceStaff
  onClick: () => void
  onChat: () => void
  nonLetti: number
}) {
  return (
    <div
      className="istruttore-passaporto"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      title="Vedi scheda e disponibilità"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onChat() }}
        className="istruttore-passaporto-chat"
        title={`Chat con ${voce.etichetta}`}
      >
        <IcoChat />
        {nonLetti > 0 && <span className="chat-puntino" aria-label={`${nonLetti} messaggi non letti`} />}
      </button>

      <div className="istruttore-passaporto-foto-cornice">
        {voce.foto_url ? (
          <img src={voce.foto_url} alt="" className="istruttore-passaporto-foto" />
        ) : (
          <span className="istruttore-passaporto-foto istruttore-passaporto-foto-vuota">
            {inizialiDaEtichetta(voce.etichetta)}
          </span>
        )}
      </div>

      <div className="istruttore-passaporto-corpo">
        <div className="istruttore-passaporto-nome">{voce.etichetta}</div>
        <div className="istruttore-passaporto-ruolo">{RUOLO_NOME[voce.ruolo] ?? voce.ruolo}</div>

        {voce.sport && (
          <div className="istruttore-passaporto-righe">
            <div className="istruttore-passaporto-riga">
              <span className="istruttore-passaporto-label">Sport</span>
              <span className="istruttore-passaporto-valore">
                <SportIcona sport={voce.sport} size={11} /> {etichettaSport(voce.sport)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Elenco degli istruttori del circolo, raggiunto dalla scorciatoia
// "Lezioni" in Area Club: apre la scheda di un istruttore per vederne gli
// orari disponibili (DisponibilitaIstruttoreModal, già usato in Contatti) —
// qui filtrato ai soli istruttori invece di tutto lo staff. `embedded` nasconde
// l'intestazione con freccia indietro, stesso pattern di StaffClubPagina.tsx.
export default function IstruttoriPagina({ embedded = false }: { embedded?: boolean }) {
  const [istruttoreAperto, setIstruttoreAperto] = useState<VoceStaff | null>(null)
  const [chatCon, setChatCon] = useState<VoceStaff | null>(null)
  const { profilo } = useAuth()
  const { staff, caricamento } = useAmici(profilo?.id ?? '')
  const istruttori = staff.filter((s) => s.ruolo === 'istruttore')
  const { conversazioni } = useConversazioni(profilo?.id)
  const nonLettiPerStaff = new Map(conversazioni.map((c) => [c.altroId, c.nonLetti]))

  return (
    <div>
      {!embedded && <TornaAreaClub titolo="Lezioni" />}

      <p className="sub mb-3">
        Apri la scheda di un istruttore per vedere i suoi orari disponibili e richiedere una lezione privata.
      </p>

      {caricamento ? (
        <p className="sub">Caricamento…</p>
      ) : istruttori.length === 0 ? (
        <p className="sub">Nessun istruttore al momento.</p>
      ) : (
        <div className="istruttore-passaporto-griglia">
          {istruttori.map((s) => (
            <CardIstruttorePassaporto
              key={s.id}
              voce={s}
              onClick={() => setIstruttoreAperto(s)}
              onChat={() => setChatCon(s)}
              nonLetti={nonLettiPerStaff.get(s.id) ?? 0}
            />
          ))}
        </div>
      )}

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
