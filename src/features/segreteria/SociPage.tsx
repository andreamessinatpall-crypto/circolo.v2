import GestioneGiocatori from './GestioneGiocatori'

// Tab "Soci" dell'admin: il pulsante "+ Nuovo giocatore" vive ora dentro
// GestioneGiocatori (riga con pulsante prima della ricerca), non più come
// tab separata qui.
export default function SociPage() {
  return <GestioneGiocatori />
}
