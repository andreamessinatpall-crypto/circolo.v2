import BenvenutoHero from './BenvenutoHero'
import DatiProfilo from './DatiProfilo'

// Scheda "Home": cartellino del giocatore (nome/livello/punti/posizione)
// più i suoi dati anagrafici — stessi componenti già usati nel menu account
// (MenuUtente.tsx, viste "menu"/"dati"), qui promossi a scheda di primo
// livello per il socio al posto di "Prenota" (spostata dentro Area Club).
export default function HomePage() {
  return (
    <div>
      <BenvenutoHero />
      <DatiProfilo />
    </div>
  )
}
