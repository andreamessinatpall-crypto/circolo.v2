// Medaglie SVG riprese 1:1 dalla v1 (decorative, inline).
// Due forme: l'emblema rotondo con la pallina (griglia badge / avatar)
// e la medaglia a nastro con numero romano (hero del Riepilogo).
import { numeroRomano, type Sport } from './badgeDati'

function puntiPentagono(cx: number, cy: number, r: number, rot = -90): string {
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = ((rot + i * 72) * Math.PI) / 180
    pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1))
  }
  return pts.join(' ')
}

function ballPadel(cx: number, cy: number, r: number): string {
  return (
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#D7DF23" stroke="#A9B015" stroke-width="2"/>' +
    '<path d="M ' + (cx - r * 0.82) + ' ' + (cy - r * 0.3) + ' Q ' + cx + ' ' + (cy + r * 0.22) + ' ' + (cx + r * 0.82) + ' ' + (cy - r * 0.3) + '" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M ' + (cx - r * 0.82) + ' ' + (cy + r * 0.42) + ' Q ' + cx + ' ' + (cy - r * 0.12) + ' ' + (cx + r * 0.82) + ' ' + (cy + r * 0.42) + '" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>'
  )
}

function ballCalcio(cx: number, cy: number, r: number): string {
  let seams = ''
  const rot = -90
  for (let i = 0; i < 5; i++) {
    const a = ((rot + i * 72) * Math.PI) / 180
    const x1 = cx + r * 0.34 * Math.cos(a)
    const y1 = cy + r * 0.34 * Math.sin(a)
    const x2 = cx + r * Math.cos(a)
    const y2 = cy + r * Math.sin(a)
    seams +=
      '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#1B221C" stroke-width="1.8"/>'
  }
  return (
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="#333" stroke-width="2"/>' +
    seams +
    '<polygon points="' + puntiPentagono(cx, cy, r * 0.34, -90) + '" fill="#1B221C"/>'
  )
}

// Emblema rotondo (disco colorato del livello + pallina dello sport).
export function svgEmblema(sport: Sport, colore: string): string {
  const ball = sport === 'calcio' ? ballCalcio(50, 50, 20) : ballPadel(50, 50, 20)
  return (
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="50" cy="50" r="49" fill="' + colore + '"/>' +
    '<circle cx="50" cy="50" r="40" fill="#0D3B1E" opacity=".18"/>' +
    '<circle cx="50" cy="50" r="30" fill="#fff" opacity=".12"/>' +
    ball +
    '</svg>'
  )
}

// Medaglia a nastro con il numero romano del livello (hero Riepilogo).
export function svgMedagliaColore(liv: number, colore: string): string {
  const col = /^#[0-9a-fA-F]{6}$/.test(colore) ? colore : '#9AA3A0'
  const rn = numeroRomano(liv)
  return (
    '<svg viewBox="0 0 100 104" xmlns="http://www.w3.org/2000/svg">' +
    '<polygon points="34,6 50,42 30,52" fill="#14532A"/>' +
    '<polygon points="66,6 50,42 70,52" fill="#0D3B1E"/>' +
    '<circle cx="50" cy="64" r="33" fill="' + col + '" stroke="#fff" stroke-width="2.5"/>' +
    '<circle cx="50" cy="64" r="27" fill="#0D3B1E" opacity=".16"/>' +
    '<text x="50" y="72" text-anchor="middle" font-size="22" font-weight="700" fill="#fff" font-family="Saira Condensed, sans-serif">' +
    rn +
    '</text>' +
    '</svg>'
  )
}
