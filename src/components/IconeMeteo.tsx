// Icone meteo SVG minimali, stesso stile a linee di IconeSport.tsx.
// Un componente per famiglia di codici WMO (weathercode di Open-Meteo) +
// un dispatcher IconaMeteo che sceglie quello giusto.

function Sole({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="#f5b942" stroke="#c8860a" strokeWidth="1.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r1 = 8.5, r2 = 11
        const rad = (a * Math.PI) / 180
        const x1 = 12 + r1 * Math.cos(rad), y1 = 12 + r1 * Math.sin(rad)
        const x2 = 12 + r2 * Math.cos(rad), y2 = 12 + r2 * Math.sin(rad)
        return (
          <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f5b942" strokeWidth="1.6" strokeLinecap="round" />
        )
      })}
    </svg>
  )
}

function Nuvola({ chiara = false }: { chiara?: boolean }) {
  return (
    <path
      d="M7.5,17 a3.5,3.5 0 0 1 0,-7 a4.5,4.5 0 0 1 8.6,-1.2 a3.6,3.6 0 0 1 -0.6,8.2 z"
      fill={chiara ? '#e7ecf3' : '#c3cbd8'}
      stroke="#8f99ab"
      strokeWidth="1.1"
    />
  )
}

function PocoNuvoloso({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="9" r="4.2" fill="#f5b942" stroke="#c8860a" strokeWidth="1.1" />
      <g transform="translate(3,4)">
        <Nuvola chiara />
      </g>
    </svg>
  )
}

function Nuvoloso({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <Nuvola />
    </svg>
  )
}

function Nebbia({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="translate(0,-2)">
        <Nuvola chiara />
      </g>
      {[6, 10, 14].map((y) => (
        <line key={y} x1="3.5" y1={y + 4} x2="20.5" y2={y + 4} stroke="#9aa5b5" strokeWidth="1.4" strokeLinecap="round" />
      ))}
    </svg>
  )
}

function Pioggia({ size = 16, intensa = false }: { size?: number; intensa?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="translate(0,-3)">
        <Nuvola />
      </g>
      {(intensa ? [6, 11, 16] : [8, 14]).map((x) => (
        <line key={x} x1={x} y1="16.5" x2={x - 1.5} y2="21" stroke="#4a90c4" strokeWidth="1.6" strokeLinecap="round" />
      ))}
    </svg>
  )
}

function Neve({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="translate(0,-3)">
        <Nuvola chiara />
      </g>
      {[8, 13, 18].map((x) => (
        <g key={x} transform={`translate(${x},19)`} stroke="#7fb0d6" strokeWidth="1.3" strokeLinecap="round">
          <line x1="-2" y1="0" x2="2" y2="0" />
          <line x1="-1.4" y1="-1.4" x2="1.4" y2="1.4" />
          <line x1="-1.4" y1="1.4" x2="1.4" y2="-1.4" />
        </g>
      ))}
    </svg>
  )
}

function Temporale({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="translate(0,-3)">
        <Nuvola />
      </g>
      <polygon points="13,15 9,20.5 12,20.5 10.5,25" fill="#e8b93a" stroke="#c8860a" strokeWidth="0.6" />
    </svg>
  )
}

// Codici WMO (weathercode) di Open-Meteo -> componente icona.
export function IconaMeteo({ codice, size = 16 }: { codice: number; size?: number }) {
  if (codice === 0) return <Sole size={size} />
  if (codice <= 3) return <PocoNuvoloso size={size} />
  if (codice === 45 || codice === 48) return <Nebbia size={size} />
  if (codice >= 51 && codice <= 65) return <Pioggia size={size} intensa={codice >= 63} />
  if (codice >= 66 && codice <= 67) return <Pioggia size={size} intensa />
  if (codice >= 71 && codice <= 77) return <Neve size={size} />
  if (codice >= 80 && codice <= 82) return <Pioggia size={size} intensa={codice >= 81} />
  if (codice >= 85 && codice <= 86) return <Neve size={size} />
  if (codice >= 95) return <Temporale size={size} />
  return <Nuvoloso size={size} />
}

// Icone del pill "Scoperto/Coperto" in Segreteria → Campi e orari.
export function IconaScoperto({ size = 16 }: { size?: number }) {
  return <Sole size={size} />
}

export function IconaCoperto({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4,12 L12,5 L20,12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M6,10.5 V19 H18 V10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
