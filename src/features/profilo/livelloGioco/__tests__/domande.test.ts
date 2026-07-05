import { describe, expect, it } from 'vitest'
import { DOMANDE_PADEL, calcolaMedia, livelloDaMedia } from '../domande'

describe('DOMANDE_PADEL', () => {
  it('copre le 4 macro-aree richieste, una domanda ciascuna', () => {
    const aree = DOMANDE_PADEL.map((d) => d.area)
    expect(new Set(aree)).toEqual(new Set(['tecnica', 'tattica', 'atletica', 'mentale']))
    expect(aree.length).toBe(4)
  })

  it('ogni domanda ha 5 opzioni con punteggio Likert 1-5', () => {
    for (const d of DOMANDE_PADEL) {
      expect(d.opzioni.map((o) => o.punti)).toEqual([1, 2, 3, 4, 5])
    }
  })
})

describe('calcolaMedia', () => {
  it('tutte risposte minime (indice 0, punti 1) dà media 1', () => {
    expect(calcolaMedia(new Array(DOMANDE_PADEL.length).fill(0))).toBe(1)
  })

  it('tutte risposte massime (indice 4, punti 5) dà media 5', () => {
    expect(calcolaMedia(new Array(DOMANDE_PADEL.length).fill(4))).toBe(5)
  })

  it('risposte miste fa la media aritmetica dei punti scelti', () => {
    // punti 1,2,3,4 -> media 2.5 (assumendo 4 domande)
    const media = calcolaMedia([0, 1, 2, 3])
    expect(media).toBe(2.5)
  })

  it('risposte mancanti contano zero, non esplodono', () => {
    expect(calcolaMedia([])).toBe(0)
  })
})

describe('livelloDaMedia', () => {
  it('media 1 è principiante', () => {
    expect(livelloDaMedia(1)).toBe('principiante')
  })

  it('media appena sotto 2.5 è ancora principiante', () => {
    expect(livelloDaMedia(2.49)).toBe('principiante')
  })

  it('media 2.5 è intermedio (soglia inclusiva)', () => {
    expect(livelloDaMedia(2.5)).toBe('intermedio')
  })

  it('media 3.5 resta intermedio', () => {
    expect(livelloDaMedia(3.5)).toBe('intermedio')
  })

  it('media 4 è avanzato (soglia inclusiva)', () => {
    expect(livelloDaMedia(4)).toBe('avanzato')
  })

  it('media 5 è avanzato', () => {
    expect(livelloDaMedia(5)).toBe('avanzato')
  })

  it('è monotona crescente su tutto l\'intervallo 1-5', () => {
    const ordine = ['principiante', 'intermedio', 'avanzato']
    let ultimoIndice = 0
    for (let m = 1; m <= 5; m += 0.1) {
      const indice = ordine.indexOf(livelloDaMedia(m))
      expect(indice).toBeGreaterThanOrEqual(ultimoIndice)
      ultimoIndice = indice
    }
  })
})
