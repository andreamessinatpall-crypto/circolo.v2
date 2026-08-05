import logoClub from '@/assets/logo-club.png'

// Intestazione condivisa di login e registrazione: logo del club e claim
// scritto come a mano (font corsivo "Caveat"), con un filo e punto
// centrale sopra, invece che come un titolo da pagina.
export default function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="auth-crest">
        <img className="auth-crest-logo" src={logoClub} alt="Circolo Sportivo" />
      </div>
      <div className="auth-rule" aria-hidden="true" />
      <p className="auth-claim">Condividi la passione. Vivi lo sport.</p>
    </div>
  )
}
