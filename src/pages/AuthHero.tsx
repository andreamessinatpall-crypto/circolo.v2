// Intestazione condivisa di login e registrazione (come nella v1):
// stemma con racchetta da padel, titolo "AREA CLUB" e claim.
export default function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="auth-crest">
        <svg
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: 56, height: 56 }}
        >
          <ellipse cx="36" cy="30" rx="16" ry="18" fill="none" stroke="#D4A52C" strokeWidth="2.2" />
          <line x1="36" y1="12" x2="36" y2="48" stroke="#D4A52C" strokeWidth="1" opacity=".55" />
          <line x1="22" y1="24" x2="50" y2="24" stroke="#D4A52C" strokeWidth="1" opacity=".55" />
          <line x1="20" y1="30" x2="52" y2="30" stroke="#D4A52C" strokeWidth="1" opacity=".55" />
          <line x1="22" y1="36" x2="50" y2="36" stroke="#D4A52C" strokeWidth="1" opacity=".55" />
          <rect x="33" y="47" width="6" height="13" rx="3" fill="#D4A52C" />
          <circle cx="55" cy="18" r="5" fill="none" stroke="#D4A52C" strokeWidth="1.8" />
          <path d="M50.5 15.5 Q55 18 59.5 15.5" stroke="#D4A52C" strokeWidth="1" fill="none" />
          <path d="M50.5 20.5 Q55 18 59.5 20.5" stroke="#D4A52C" strokeWidth="1" fill="none" />
        </svg>
      </div>
      <div className="auth-titolo">Area Club</div>
      <div className="auth-claim">Condividi la passione. Vivi il Club.</div>
    </div>
  )
}
