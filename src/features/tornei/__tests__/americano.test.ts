import { describe, expect, it } from 'vitest'
import { genereEffettivoComponente, generaRoundsAmericanoMisto, validaIscrizioneMista } from '../americano'

describe('generaRoundsAmericanoMisto', () => {
  it('ogni uomo fa coppia con ogni donna esattamente una volta in k round', () => {
    const uomini = ['u1', 'u2', 'u3', 'u4']
    const donne = ['d1', 'd2', 'd3', 'd4']
    const rounds = generaRoundsAmericanoMisto(uomini, donne)

    expect(rounds).toHaveLength(4) // k round

    const coppieViste = new Set<string>()
    for (const round of rounds) {
      for (const campo of round) {
        for (const [u, d] of [
          [campo.p1, campo.p2],
          [campo.p3, campo.p4],
        ] as [string, string][]) {
          const uomo = uomini.includes(u) ? u : d
          const donna = uomini.includes(u) ? d : u
          const chiave = `${uomo}-${donna}`
          expect(coppieViste.has(chiave)).toBe(false)
          coppieViste.add(chiave)
        }
      }
    }
    // 4 uomini x 4 donne = 16 coppie uniche totali.
    expect(coppieViste.size).toBe(16)
  })

  it('ogni round ha k/2 campi e nessun giocatore ripetuto nello stesso round', () => {
    const uomini = ['u1', 'u2', 'u3', 'u4']
    const donne = ['d1', 'd2', 'd3', 'd4']
    const rounds = generaRoundsAmericanoMisto(uomini, donne)

    for (const round of rounds) {
      expect(round).toHaveLength(2) // k=4 -> 2 campi
      const giocatori = round.flatMap((c) => [c.p1, c.p2, c.p3, c.p4])
      expect(new Set(giocatori).size).toBe(giocatori.length)
    }
  })

  it('con k dispari residuo esclude l’ultimo giocatore in eccesso (arrotonda a multiplo di 2)', () => {
    const uomini = ['u1', 'u2', 'u3']
    const donne = ['d1', 'd2', 'd3']
    const rounds = generaRoundsAmericanoMisto(uomini, donne)
    // k valido = floor(3/2)*2 = 2
    expect(rounds).toHaveLength(2)
    for (const round of rounds) expect(round).toHaveLength(1)
  })

  it('con meno di 2 coppie per lato restituisce nessun round', () => {
    expect(generaRoundsAmericanoMisto(['u1'], ['d1'])).toEqual([])
  })

  it('andata e ritorno raddoppia i round con lati invertiti', () => {
    const uomini = ['u1', 'u2']
    const donne = ['d1', 'd2']
    const rounds = generaRoundsAmericanoMisto(uomini, donne, true)
    expect(rounds).toHaveLength(4) // 2 andata + 2 ritorno

    const andata = rounds[0][0]
    const ritorno = rounds[2][0]
    expect(ritorno.p1).toBe(andata.p3)
    expect(ritorno.p2).toBe(andata.p4)
    expect(ritorno.p3).toBe(andata.p1)
    expect(ritorno.p4).toBe(andata.p2)
  })
})

describe('validaIscrizioneMista', () => {
  it('rifiuta numeri diversi di uomini e donne', () => {
    expect(validaIscrizioneMista(4, 3)).toMatch(/stesso numero/)
  })

  it('rifiuta numeri dispari anche se uguali', () => {
    expect(validaIscrizioneMista(3, 3)).toMatch(/pari/)
  })

  it('rifiuta zero giocatori', () => {
    expect(validaIscrizioneMista(0, 0)).toMatch(/pari/)
  })

  it('accetta numeri uguali e pari', () => {
    expect(validaIscrizioneMista(4, 4)).toBeNull()
  })
})

describe('genereEffettivoComponente', () => {
  const genereBySocio = new Map<string, string | null>([
    ['socio1', 'M'],
    ['socio2', 'F'],
    ['socio3', null],
  ])

  it('usa il genere del profilo quando il componente non ha un override', () => {
    expect(genereEffettivoComponente({ socio_id: 'socio1', genere: null }, genereBySocio)).toBe('M')
  })

  it('l’override sul componente ha priorità sul profilo', () => {
    expect(genereEffettivoComponente({ socio_id: 'socio1', genere: 'F' }, genereBySocio)).toBe('F')
  })

  it('un ospite (senza socio_id) usa solo l’override', () => {
    expect(genereEffettivoComponente({ socio_id: null, genere: 'M' }, genereBySocio)).toBe('M')
    expect(genereEffettivoComponente({ socio_id: null, genere: null }, genereBySocio)).toBeNull()
  })

  it('restituisce null se il componente non esiste o il socio non ha genere', () => {
    expect(genereEffettivoComponente(undefined, genereBySocio)).toBeNull()
    expect(genereEffettivoComponente({ socio_id: 'socio3', genere: null }, genereBySocio)).toBeNull()
  })
})
