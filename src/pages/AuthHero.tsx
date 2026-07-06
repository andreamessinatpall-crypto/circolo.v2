import logoClub from '@/assets/logo-club.png'

// Intestazione condivisa di login e registrazione: stemma del club (badge
// circolare, generato a parte e ricolorato in giallo brillante), titolo
// "AREA CLUB" e claim.
export default function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="auth-crest">
        <img className="auth-crest-logo" src={logoClub} alt="Circolo Sportivo" />
      </div>
      <div className="auth-titolo">Area Club</div>
      <div className="auth-claim">Condividi la passione. Vivi il Club.</div>
    </div>
  )
}
