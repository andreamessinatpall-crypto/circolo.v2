import GrigliaPrenotazioni from './GrigliaPrenotazioni'
import type { Sport } from './tipi'

const ICO_CAMPO = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

// Vista staff (admin/collaboratore/istruttore): griglia per-campo. "Le mie
// prenotazioni" è stata spostata in Area Club (MiePrenotazioniPagina.tsx).
export default function SportPage({ sport }: { sport: Sport }) {
  const label = sport === 'padel' ? 'Padel' : 'Calcio'

  return (
    <div>
      <div className="club-sez-header">
        <span className="club-sez-icona">{ICO_CAMPO}</span>
        <h2 className="club-sez-titolo">{label} · Prenota un campo</h2>
      </div>
      <GrigliaPrenotazioni sport={sport} />
    </div>
  )
}
