export function toRomano(n: number): string {
  if (n <= 0) return '?'
  const vals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let result = ''
  let num = n
  for (const [val, sym] of vals) {
    while (num >= val) { result += sym; num -= val }
  }
  return result
}

function hexLighten(hex: string, t: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgb(${Math.round(r + (255 - r) * t)},${Math.round(g + (255 - g) * t)},${Math.round(b + (255 - b) * t)})`
}

function hexDarken(hex: string, t: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgb(${Math.round(r * (1 - t))},${Math.round(g * (1 - t))},${Math.round(b * (1 - t))})`
}

export function MedagliaLvDiretta({ lv, colore, size = 44 }: { lv: number; colore: string; size?: number }) {
  const hi  = hexLighten(colore, 0.36)
  const mid = hexLighten(colore, 0.08)
  const sh1 = hexDarken(colore, 0.20)
  const sh2 = hexDarken(colore, 0.42)
  const ring = hexDarken(colore, 0.10)
  const fontSize = size >= 38 ? '1rem' : size >= 26 ? '0.7rem' : '0.6rem'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(145deg, ${hi} 0%, ${mid} 44%, ${sh1} 56%, ${sh2} 100%)`,
      boxShadow: `0 0 0 1.5px ${ring}, inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 5px rgba(0,0,0,0.28)`,
    }}>
      <span style={{
        fontSize, fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.97)',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)', letterSpacing: '-0.02em', userSelect: 'none' as const,
      }}>
        {toRomano(lv)}
      </span>
    </div>
  )
}

