import type { CSSProperties } from 'react'
import logoPallone from '@/assets/logo-pallone.png'

// Intestazione condivisa di login e registrazione: stemma a pallone diviso
// a metà (calcio + padel, gli sport del circolo), titolo "AREA CLUB" e claim.
//
// Il logo non è un <img> a colore fisso: è mascherato (CSS mask-image) con
// un gradiente oro per l'effetto metallico, così il colore lo decide il CSS
// (vedi .auth-crest-logo in index.css) invece che il PNG stesso.
const logoMaskStyle = { '--logo-mask': `url(${logoPallone})` } as CSSProperties

export default function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="auth-crest">
        <div className="auth-crest-logo" style={logoMaskStyle} role="img" aria-label="Circolo Sportivo" />
      </div>
      <div className="auth-titolo">Area Club</div>
      <div className="auth-claim">Condividi la passione. Vivi il Club.</div>
    </div>
  )
}
