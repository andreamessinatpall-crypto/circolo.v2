// Genera l'intera scala di blu (--color-verde-900..50, vedi src/index.css)
// a partire dal colore primario del circolo, mantenendo saturazione e
// luminosità della palette di default (calcolate dai valori originali) e
// cambiando solo la tonalità (hue). Così ogni circolo ha la propria tinta
// ma con lo stesso "peso" visivo (contrasti, leggibilità) della palette
// disegnata a mano — e siccome le classi Tailwind (bg-verde-800 ecc.)
// compilano a `var(--color-verde-800)`, sovrascrivere queste custom
// property ritinge tutta l'app senza toccare un solo componente.
const RICETTA_SCALA: Record<string, { s: number; l: number }> = {
  '900': { s: 77, l: 8 },
  '800': { s: 77, l: 17 },
  '700': { s: 79, l: 26 },
  '600': { s: 78, l: 34 },
  '500': { s: 76, l: 42 },
  '100': { s: 46, l: 91 },
  '50': { s: 48, l: 95 },
}

function hexToHue(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return Math.round(h * 60)
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Applica (o rimuove, se colorePrimario è vuoto) la scala colori del
// circolo corrente sovrascrivendo le CSS custom property globali.
export function applicaTemaCircolo(colorePrimario: string | null | undefined) {
  const root = document.documentElement
  if (!colorePrimario) {
    Object.keys(RICETTA_SCALA).forEach((shade) => root.style.removeProperty(`--color-verde-${shade}`))
    return
  }
  const hue = hexToHue(colorePrimario)
  if (hue === null) return
  for (const [shade, { s, l }] of Object.entries(RICETTA_SCALA)) {
    root.style.setProperty(`--color-verde-${shade}`, hslToHex(hue, s, l))
  }
}
