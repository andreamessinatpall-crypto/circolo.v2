import { describe, expect, it } from 'vitest'
import { generaCalendarioIniziale } from '../generaIncontri'

describe('generaCalendarioIniziale — girone', () => {
  it('genera un girone all-play-all: ogni coppia di squadre si incontra esattamente una volta', () => {
    const squadre = ['s1', 's2', 's3', 's4']
    const { incontri, bracketSeed } = generaCalendarioIniziale('girone', squadre, false)

    expect(bracketSeed).toBeNull()
    // 4 squadre → 3 turni, 2 partite a turno, 6 partite totali
    expect(incontri).toHaveLength(6)
    expect(new Set(incontri.map((m) => m.round))).toEqual(new Set([1, 2, 3]))

    const coppie = incontri.map((m) => [m.casa_id, m.ospite_id].sort().join('-'))
    expect(new Set(coppie).size).toBe(6) // nessuna coppia ripetuta

    // Ogni squadra gioca esattamente 3 partite (una per turno).
    for (const s of squadre) {
      const nPartite = incontri.filter((m) => m.casa_id === s || m.ospite_id === s).length
      expect(nPartite).toBe(3)
    }
  })

  it('con un numero dispari di squadre una riposa a turno (bye)', () => {
    const squadre = ['s1', 's2', 's3']
    const { incontri } = generaCalendarioIniziale('girone', squadre, false)
    // 3 squadre → 3 turni ma solo 1 partita a turno (una squadra riposa)
    expect(incontri).toHaveLength(3)
  })

  it('andata e ritorno: raddoppia le partite, con casa/ospite invertiti nel ritorno', () => {
    const squadre = ['s1', 's2', 's3', 's4']
    const { incontri } = generaCalendarioIniziale('girone', squadre, true)

    // 6 partite di andata + 6 di ritorno
    expect(incontri).toHaveLength(12)
    expect(new Set(incontri.map((m) => m.round))).toEqual(new Set([1, 2, 3, 4, 5, 6]))

    const andata = incontri.filter((m) => m.round <= 3)
    const ritorno = incontri.filter((m) => m.round > 3)
    expect(andata).toHaveLength(6)
    expect(ritorno).toHaveLength(6)

    // Ogni partita di andata ha il suo ritorno con casa/ospite invertiti.
    for (const a of andata) {
      const r = ritorno.find((m) => m.casa_id === a.ospite_id && m.ospite_id === a.casa_id)
      expect(r).toBeDefined()
      expect(r!.round).toBe(a.round + 3)
    }
  })
})

describe('generaCalendarioIniziale — eliminazione', () => {
  it('con 4 squadre genera 2 partite di primo turno, nessun bye', () => {
    const squadre = ['s1', 's2', 's3', 's4']
    const { incontri, bracketSeed } = generaCalendarioIniziale('eliminazione', squadre, false)

    expect(bracketSeed).toHaveLength(4)
    expect(incontri).toHaveLength(2)
    expect(incontri.every((m) => m.round === 1)).toBe(true)
    // Gli slot dei 2 incontri sono distinti
    expect(new Set(incontri.map((m) => m.girone)).size).toBe(2)
  })

  it('con 3 squadre una passa il turno con un bye (1 solo incontro di primo turno)', () => {
    const squadre = ['s1', 's2', 's3']
    const { incontri, bracketSeed } = generaCalendarioIniziale('eliminazione', squadre, false)

    expect(bracketSeed).toHaveLength(4) // prossima potenza di 2
    expect(incontri).toHaveLength(1) // una squadra ottiene il bye, non genera incontro
  })

  it('il primo turno resta round=1 anche in modalità andata/ritorno (il ritorno si genera dopo)', () => {
    const squadre = ['s1', 's2', 's3', 's4']
    const { incontri } = generaCalendarioIniziale('eliminazione', squadre, true)
    expect(incontri.every((m) => m.round === 1)).toBe(true)
  })
})
