import { describe, expect, it } from 'vitest'
import { generaSlotProposti, escludiSlotOccupati, type FasciaSemplice } from '../slotLezione'

// Martedì 10 marzo 2026 (verificato: getDay() === 2).
const MARTEDI = new Date(2026, 2, 10, 8, 0)

describe('generaSlotProposti', () => {
  it('genera slot di 1h dentro una fascia ricorrente', () => {
    const fasce: FasciaSemplice[] = [
      { giorno_settimana: 2, data: null, ora_inizio: '09:00', ora_fine: '12:00' },
    ]
    const slot = generaSlotProposti(fasce, MARTEDI, 1)
    expect(slot).toEqual([
      { data: '2026-03-10', oraInizio: '09:00', oraFine: '10:00' },
      { data: '2026-03-10', oraInizio: '10:00', oraFine: '11:00' },
      { data: '2026-03-10', oraInizio: '11:00', oraFine: '12:00' },
    ])
  })

  it('una fascia con meno di 1h libera non produce slot', () => {
    const fasce: FasciaSemplice[] = [
      { giorno_settimana: 2, data: null, ora_inizio: '09:00', ora_fine: '09:30' },
    ]
    expect(generaSlotProposti(fasce, MARTEDI, 1)).toEqual([])
  })

  it('rispetta una fascia su data specifica', () => {
    const fasce: FasciaSemplice[] = [
      { giorno_settimana: null, data: '2026-03-12', ora_inizio: '15:00', ora_fine: '17:00' },
    ]
    const slot = generaSlotProposti(fasce, MARTEDI, 5)
    expect(slot.every((s) => s.data === '2026-03-12')).toBe(true)
    expect(slot).toHaveLength(2)
  })

  it('salta gli orari già passati di oggi ma non dei giorni successivi', () => {
    const fasce: FasciaSemplice[] = [
      { giorno_settimana: 2, data: null, ora_inizio: '07:00', ora_fine: '09:00' },
    ]
    // MARTEDI è alle 8:00: lo slot 7:00-8:00 di oggi è già passato (escluso),
    // quello 8:00-9:00 è ancora valido; martedì prossimo (7 giorni dopo) li ha entrambi.
    const slot = generaSlotProposti(fasce, MARTEDI, 8)
    const oggi = slot.filter((s) => s.data === '2026-03-10')
    const prossimo = slot.filter((s) => s.data === '2026-03-17')
    expect(oggi).toEqual([{ data: '2026-03-10', oraInizio: '08:00', oraFine: '09:00' }])
    expect(prossimo).toHaveLength(2)
  })
})

describe('escludiSlotOccupati', () => {
  it('toglie uno slot che si sovrappone a un intervallo occupato', () => {
    const slot = [
      { data: '2026-03-10', oraInizio: '09:00', oraFine: '10:00' },
      { data: '2026-03-10', oraInizio: '10:00', oraFine: '11:00' },
    ]
    const occupati = [{ inizio: '2026-03-10T09:30:00', fine: '2026-03-10T10:00:00' }]
    expect(escludiSlotOccupati(slot, occupati)).toEqual([
      { data: '2026-03-10', oraInizio: '10:00', oraFine: '11:00' },
    ])
  })

  it('non tocca slot adiacenti ma non sovrapposti', () => {
    const slot = [{ data: '2026-03-10', oraInizio: '09:00', oraFine: '10:00' }]
    const occupati = [{ inizio: '2026-03-10T10:00:00', fine: '2026-03-10T11:00:00' }]
    expect(escludiSlotOccupati(slot, occupati)).toEqual(slot)
  })
})
