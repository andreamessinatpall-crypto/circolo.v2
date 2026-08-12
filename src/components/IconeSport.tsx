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

export function IconaTennis({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#d6f04c" stroke="#8ea81c" strokeWidth="1.5" />
      {/* cucitura a S, unica curva (diversa dalle due C speculari del padel) */}
      <path
        d="M4,7 C10,7 8,17 4,17 M20,7 C14,7 16,17 20,17"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconaPickleball({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#f4d13a" stroke="#a4820f" strokeWidth="1.5" />
      {/* fori della pallina wiffle */}
      <circle cx="9" cy="9" r="1.3" fill="#a4820f" />
      <circle cx="15" cy="9" r="1.3" fill="#a4820f" />
      <circle cx="12" cy="12.5" r="1.3" fill="#a4820f" />
      <circle cx="9" cy="16" r="1.3" fill="#a4820f" />
      <circle cx="15" cy="16" r="1.3" fill="#a4820f" />
    </svg>
  )
}

export function IconaBeachVolley({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#f0f0f0" stroke="#1a6fb0" strokeWidth="1.5" />
      <path d="M2 12h20 M12 2c3.5 3 3.5 17 0 20 M12 2c-3.5 3-3.5 17 0 20" stroke="#1a6fb0" strokeWidth="1.3" fill="none" />
    </svg>
  )
}

export function IconaBasket({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#e07b30" stroke="#8a4a16" strokeWidth="1.5" />
      <path
        d="M2 12h20 M12 2v20 M4.5 5.5c3.5 3.2 3.5 10.8 0 13 M19.5 5.5c-3.5 3.2-3.5 10.8 0 13"
        stroke="#8a4a16"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  )
}

const ICONE_SPORT: Record<string, (props: { size?: number }) => ReturnType<typeof IconaPadel>> = {
  padel: IconaPadel,
  calcio: IconaCalcio,
  tennis: IconaTennis,
  pickleball: IconaPickleball,
  beachvolley: IconaBeachVolley,
  basket: IconaBasket,
}

export function SportIcona({ sport, size = 16 }: { sport: string | null; size?: number }) {
  if (!sport) return null
  // "entrambi" (preferenza socio "tutti gli sport"): nessuna icona specifica
  // sensata con 6 sport in elenco, si mostra semplicemente nulla.
  const Icona = ICONE_SPORT[sport]
  if (!Icona) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <Icona size={size} />
    </span>
  )
}
