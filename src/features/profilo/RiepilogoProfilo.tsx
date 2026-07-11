import { useAuth } from '@/auth/useAuth'
import { dataEstesa } from '@/lib/formato'
import AttivitaInProgramma from './AttivitaInProgramma'
import SezioneCompagni from '@/features/compagni/SezioneCompagni'
import { oraLocale } from '@/features/prenotazioni/orari'
import { useRichiesteInviate } from '@/features/lezioni/useRichiesteLezione'

const ETICHETTE_SPORT_RICHIESTA: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

function IcoCompagni() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="4" /><path d="M1 20c0-3.8 3.6-7 8-7s8 3.2 8 7" /><path d="M17 8a3 3 0 1 1 0 6" /><path d="M22 20c0-2.6-1.7-4.8-4-5.6" />
    </svg>
  )
}

// Le richieste di lezione inviate a un istruttore (Fase 5): in attesa di
// risposta, o appena rifiutate. Una volta accettate diventano una vera
// prenotazione, già visibile in "Attività in programma".
export function RichiesteLezioneInviate() {
  const { profilo } = useAuth()
  const { data: richieste = [] } = useRichiesteInviate(profilo?.id)
  const daMostrare = richieste.filter((r) => r.stato === 'in_attesa' || r.stato === 'rifiutata')

  if (daMostrare.length === 0) return null

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <p className="dati-check-titolo" style={{ marginBottom: '0.5rem' }}>Le tue richieste di lezione</p>
      <div className="flex flex-col gap-1.5">
        {daMostrare.map((r) => (
          <div key={r.id} className="disponibilita-riga">
            <span>
              {ETICHETTE_SPORT_RICHIESTA[r.sport]} · {dataEstesa(r.inizio.slice(0, 10))} ·{' '}
              {oraLocale(new Date(r.inizio))}–{oraLocale(new Date(r.fine))}
            </span>
            <span className={'pill' + (r.stato === 'in_attesa' ? ' off' : '')}>
              {r.stato === 'in_attesa' ? 'In attesa' : 'Rifiutata'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RiepilogoProfilo() {
  const { profilo } = useAuth()
  if (!profilo) return null

  return (
    <div>
      <RichiesteLezioneInviate />

      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <span className="club-sez-icona">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </span>
        <h2 className="club-sez-titolo">Attività in programma</h2>
      </div>
      <AttivitaInProgramma />

      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <span className="club-sez-icona"><IcoCompagni /></span>
        <h2 className="club-sez-titolo">Cerco giocatori</h2>
      </div>
      <SezioneCompagni />
    </div>
  )
}
