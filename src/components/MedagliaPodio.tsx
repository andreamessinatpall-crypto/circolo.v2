const COLORI = {
  1: { hi: '#FFE566', mid: '#F5C518', lo: '#C49A08' },
  2: { hi: '#F4F4F4', mid: '#C8C8C8', lo: '#989898' },
  3: { hi: '#ECA96E', mid: '#CD7F32', lo: '#9B5E1E' },
} as const

// Icona medaglia (nastro + medaglione con stella) per il podio 1º/2º/3º,
// al posto del vecchio cerchio sfumato con solo il numero dentro. Usata in
// tutte le classifiche del club e dei tornei.
export function MedagliaPodio({ pos, size = 24 }: { pos: 1 | 2 | 3; size?: number }) {
  const c = COLORI[pos]
  const id = `mp-grad-${pos}`
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 26 30" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="55%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.lo} />
        </linearGradient>
      </defs>
      <path d="M8 9 8 22 13 18.5 18 22 18 9Z" fill={c.lo} opacity="0.8" />
      <circle cx="13" cy="11" r="9" fill={`url(#${id})`} stroke={c.lo} strokeWidth="1" />
      <circle cx="13" cy="11" r="6.2" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" />
      <path
        d="M13 6.6l1.15 2.33 2.57.37-1.86 1.82.44 2.56L13 12.44l-2.3 1.24.44-2.56-1.86-1.82 2.57-.37Z"
        fill="#fff"
        fillOpacity="0.9"
      />
    </svg>
  )
}
