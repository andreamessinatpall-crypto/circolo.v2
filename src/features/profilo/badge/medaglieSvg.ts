// Medaglia a nastro con numero romano del livello (hero Riepilogo).

function numeroRomano(n: number): string {
  const tabella: Array<[number, string]> = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  let resto = n
  for (const [valore, simbolo] of tabella) {
    while (resto >= valore) { out += simbolo; resto -= valore }
  }
  return out
}

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
