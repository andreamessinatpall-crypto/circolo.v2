import { Link } from 'react-router-dom'

function IcoIndietro() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

// Intestazione con freccia indietro per le pagine raggiunte dalle schede di
// Area Club (Attività in programma/Amici/Premi/Cerco giocatori/Club): sono
// vere pagine (route), non tab o overlay, quindi serve un link esplicito per
// tornare alla griglia.
export default function TornaAreaClub({ titolo }: { titolo: string }) {
  return (
    <div className="pagina-club-head">
      <Link to="/profilo" className="pagina-club-indietro" aria-label="Torna ad Area Club">
        <IcoIndietro />
      </Link>
      <h1 className="pagina-club-titolo">{titolo}</h1>
    </div>
  )
}
