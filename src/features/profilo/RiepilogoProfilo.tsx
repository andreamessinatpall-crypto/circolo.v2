import { useAuth } from '@/auth/useAuth'
import { dataEstesa } from '@/lib/formato'
import { oraLocale } from '@/features/prenotazioni/orari'
import { useRichiesteInviate } from '@/features/lezioni/useRichiesteLezione'

const ETICHETTE_SPORT_RICHIESTA: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

// Le richieste di lezione inviate a un istruttore (Fase 5): in attesa di
// risposta, o appena rifiutate. Una volta accettate diventano una vera
// prenotazione, già visibile in "Attività in programma". Usato in
// GestioneAttivitaPagina.tsx (scheda "Attività" di Area Club).
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
