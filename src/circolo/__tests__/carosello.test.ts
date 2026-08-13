import { describe, expect, it } from 'vitest'
import { costruisciCarosello, ordinaCarosello, type CircoloCarosello } from '../carosello'
import type { Circolo } from '@/features/piattaforma/tipi'
import type { MioCircolo } from '../datiCircoloSocio'

function circolo(overrides: Partial<Circolo>): Circolo {
  return {
    id: overrides.id ?? 'id',
    slug: overrides.slug ?? 'slug',
    nome: overrides.nome ?? 'Circolo',
    logo_url: null,
    colore_primario: null,
    colore_secondario: null,
    apertura_default: '08:00',
    chiusura_default: '23:00',
    attivo: true,
    creato_il: '2026-01-01T00:00:00Z',
    indirizzo: null,
    latitudine: null,
    longitudine: null,
    ...overrides,
  }
}

// Patti (ME): riferimento come "posizione del socio" in tutti i test.
const POSIZIONE = { lat: 38.14736, lon: 14.96409 }
// Coordinate di Palermo (~140 km da Patti) e Messina (~50 km da Patti).
const PALERMO = { latitudine: 38.1157, longitudine: 13.3615 }
const MESSINA = { latitudine: 38.1938, longitudine: 15.5540 }

describe('costruisciCarosello', () => {
  it('marca i miei circoli come membro e quelli da scoprire come non membro', () => {
    const miei: MioCircolo[] = [
      { ruolo: 'socio', ultimo_accesso: null, circolo: circolo({ id: 'a' }) },
    ]
    const scoprire: Circolo[] = [circolo({ id: 'b' })]
    const items = costruisciCarosello(miei, scoprire, null)
    expect(items).toEqual([
      { circolo: miei[0].circolo, isMembro: true, ultimoAccesso: null, distanzaKm: null },
      { circolo: scoprire[0], isMembro: false, ultimoAccesso: null, distanzaKm: null },
    ])
  })

  it('calcola la distanza solo quando posizione e coordinate del circolo sono note', () => {
    const conCoordinate = circolo({ id: 'palermo', ...PALERMO })
    const senzaCoordinate = circolo({ id: 'sconosciuto' })
    const items = costruisciCarosello([], [conCoordinate, senzaCoordinate], POSIZIONE)
    expect(items[0].distanzaKm).not.toBeNull()
    expect(items[0].distanzaKm).toBeGreaterThan(135)
    expect(items[0].distanzaKm).toBeLessThan(145)
    expect(items[1].distanzaKm).toBeNull()
  })

  it('senza posizione del socio nessuna distanza viene calcolata', () => {
    const items = costruisciCarosello([], [circolo({ id: 'palermo', ...PALERMO })], null)
    expect(items[0].distanzaKm).toBeNull()
  })
})

describe('ordinaCarosello', () => {
  it('mette per primo il circolo con ultimo accesso più recente, a prescindere dalla distanza', () => {
    const lontanoMaVisitato: CircoloCarosello = {
      circolo: circolo({ id: 'palermo', nome: 'Palermo', ...PALERMO }),
      isMembro: true,
      ultimoAccesso: '2026-08-10T10:00:00Z',
      distanzaKm: 140,
    }
    const vicinoMaiVisitato: CircoloCarosello = {
      circolo: circolo({ id: 'messina', nome: 'Messina', ...MESSINA }),
      isMembro: false,
      ultimoAccesso: null,
      distanzaKm: 50,
    }
    const risultato = ordinaCarosello([vicinoMaiVisitato, lontanoMaVisitato])
    expect(risultato[0]).toBe(lontanoMaVisitato)
    expect(risultato[1]).toBe(vicinoMaiVisitato)
  })

  it('tra due circoli con ultimo accesso sceglie il più recente come primo', () => {
    const vecchio: CircoloCarosello = {
      circolo: circolo({ id: 'a', nome: 'A' }),
      isMembro: true,
      ultimoAccesso: '2026-01-01T00:00:00Z',
      distanzaKm: null,
    }
    const recente: CircoloCarosello = {
      circolo: circolo({ id: 'b', nome: 'B' }),
      isMembro: true,
      ultimoAccesso: '2026-08-12T00:00:00Z',
      distanzaKm: null,
    }
    expect(ordinaCarosello([vecchio, recente])[0]).toBe(recente)
  })

  it('senza nessun ultimo accesso ordina tutto per distanza crescente', () => {
    const items: CircoloCarosello[] = [
      { circolo: circolo({ id: 'lontano', nome: 'Lontano' }), isMembro: false, ultimoAccesso: null, distanzaKm: 140 },
      { circolo: circolo({ id: 'vicino', nome: 'Vicino' }), isMembro: false, ultimoAccesso: null, distanzaKm: 50 },
    ]
    const risultato = ordinaCarosello(items)
    expect(risultato.map((r) => r.circolo.id)).toEqual(['vicino', 'lontano'])
  })

  it('i circoli senza coordinate note vanno in fondo, ordinati per nome', () => {
    const items: CircoloCarosello[] = [
      { circolo: circolo({ id: 'z', nome: 'Zeta' }), isMembro: false, ultimoAccesso: null, distanzaKm: null },
      { circolo: circolo({ id: 'con-distanza', nome: 'Con distanza' }), isMembro: false, ultimoAccesso: null, distanzaKm: 10 },
      { circolo: circolo({ id: 'a', nome: 'Alfa' }), isMembro: false, ultimoAccesso: null, distanzaKm: null },
    ]
    const risultato = ordinaCarosello(items)
    expect(risultato.map((r) => r.circolo.id)).toEqual(['con-distanza', 'a', 'z'])
  })
})
