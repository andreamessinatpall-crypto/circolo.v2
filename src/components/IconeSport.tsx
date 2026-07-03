export function IconaPadel({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#d4ed40" stroke="#8ea81c" strokeWidth="1.5" />
      {/* cuciture: due C speculari che si affacciano al centro */}
      <path d="M5,5 C10,5 10,19 5,19"   fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19,5 C14,5 14,19 19,19" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconaCalcio({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#f0f0f0" stroke="#1a1a1a" strokeWidth="1.5" />
      {/* pentagono regolare r=4.5, vertice in cima */}
      <polygon points="12,7.5 16.3,10.6 14.6,15.6 9.4,15.6 7.7,10.6" fill="#1a1a1a" />
      <line x1="12"   y1="7.5"  x2="12"   y2="2"    stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="16.3" y1="10.6" x2="21.5"  y2="8.9"  stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="14.6" y1="15.6" x2="17.9"  y2="20.1" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="9.4"  y1="15.6" x2="6.1"   y2="20.1" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="7.7"  y1="10.6" x2="2.5"   y2="8.9"  stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function SportIcona({ sport, size = 16 }: { sport: string | null; size?: number }) {
  if (!sport) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {(sport === 'padel' || sport === 'entrambi') && <IconaPadel size={size} />}
      {(sport === 'calcio' || sport === 'entrambi') && <IconaCalcio size={size} />}
    </span>
  )
}
