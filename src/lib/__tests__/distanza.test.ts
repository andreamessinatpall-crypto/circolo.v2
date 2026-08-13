import { describe, expect, it } from 'vitest'
import { distanzaKm, formattaDistanza } from '../distanza'

describe('distanzaKm', () => {
  it('è 0 tra un punto e se stesso', () => {
    expect(distanzaKm({ lat: 38.147, lon: 14.964 }, { lat: 38.147, lon: 14.964 })).toBe(0)
  })

  it('calcola circa 140 km tra Patti (ME) e Palermo', () => {
    const patti = { lat: 38.14736, lon: 14.96409 }
    const palermo = { lat: 38.1157, lon: 13.3615 }
    const km = distanzaKm(patti, palermo)
    expect(km).toBeGreaterThan(135)
    expect(km).toBeLessThan(145)
  })

  it('è simmetrica', () => {
    const a = { lat: 45.4642, lon: 9.19 }
    const b = { lat: 41.9028, lon: 12.4964 }
    expect(distanzaKm(a, b)).toBeCloseTo(distanzaKm(b, a), 6)
  })
})

describe('formattaDistanza', () => {
  it('mostra i metri sotto 1 km', () => {
    expect(formattaDistanza(0.85)).toBe('850 m')
  })

  it('mostra un decimale tra 1 e 10 km', () => {
    expect(formattaDistanza(3.456)).toBe('3.5 km')
  })

  it('arrotonda all\'intero sopra 10 km', () => {
    expect(formattaDistanza(142.3)).toBe('142 km')
  })
})
