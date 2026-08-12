import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useCircolo } from '@/circolo/useCircolo'
import { useMieCircoli } from '@/circolo/datiCircoloSocio'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import { useModalitaClassifica } from './datiClassifica'
import AreaClubSchede from './pagine/AreaClubSchede'

function IcoFreccia({ aperto }: { aperto: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className="transition-transform" style={{ transform: aperto ? 'rotate(180deg)' : undefined }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// Selettore circolo: cambiare qui il circolo attivo cambia lo slug
// nell'URL, quindi tutto il contesto dell'app (Prenotazioni/Tornei/Area
// Club) — stesso comportamento di "Cambia circolo" nel menu account
// (MenuUtente.tsx), ma raggiungibile direttamente da Area Club invece che
// sepolto dietro l'omino in alto. "Scopri altri circoli" riusa la pagina
// esistente /scegli-circolo (iscrizione a nuovi circoli), non duplicata.
function SelettoreCircolo() {
  const { profilo } = useAuth()
  const circolo = useCircolo()
  const navigate = useNavigate()
  const { data: mieiCircoli } = useMieCircoli(profilo?.id)
  const [aperto, setAperto] = useState(false)
  const altri = (mieiCircoli ?? []).filter((m) => m.circolo.id !== circolo.id)

  return (
    <div className="card relative mb-4">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setAperto((v) => !v)}
      >
        <span className="text-xs uppercase tracking-wide text-ink-2">Circolo</span>
        <span className="flex-1 truncate font-bold">{circolo.nome}</span>
        <IcoFreccia aperto={aperto} />
      </button>

      {aperto && (
        <div className="mt-3 flex flex-col gap-1 border-t border-[var(--border)] pt-3">
          {altri.map((m) => (
            <button
              key={m.circolo.id}
              type="button"
              className="rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--v050)]"
              onClick={() => {
                setAperto(false)
                navigate(`/c/${m.circolo.slug}/profilo`)
              }}
            >
              {m.circolo.nome}
            </button>
          ))}
          <Link
            to="/scegli-circolo"
            className="rounded-lg px-2 py-2 text-left text-sm font-semibold text-[var(--v700)] hover:bg-[var(--v050)]"
          >
            Scopri altri circoli
          </Link>
        </div>
      )}
    </div>
  )
}

// Area Club è la stessa griglia di schede per tutti i ruoli (socio,
// istruttore, collaboratore, admin) — le prime schede cambiano in base al
// ruolo, vedi la composizione in AreaClubSchede.tsx.
export default function ProfiloPage() {
  const { data: modalitaPremi } = useModalitaPremi()
  const { data: modalitaClassifica } = useModalitaClassifica()
  return (
    <div>
      <SelettoreCircolo />
      <AreaClubSchede modalitaPremi={!!modalitaPremi} modalitaClassifica={modalitaClassifica !== false} />
    </div>
  )
}
