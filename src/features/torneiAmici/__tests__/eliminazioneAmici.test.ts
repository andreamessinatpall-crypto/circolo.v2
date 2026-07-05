import { describe, expect, it } from 'vitest'
import { prossimeRigheEliminazioneAmici } from '../eliminazioneAmici'
import type { Incontro } from '@/features/tornei/tipi'

// Seed manuale (non mescolato) per avere accoppiamenti prevedibili nei test:
// slot 1 = s1 vs s2, slot 2 = s3 vs s4.
const SEED4 = ['s1', 's2', 's3', 's4']

function m(partial: Partial<Incontro> & Pick<Incontro, 'round' | 'girone' | 'casa_id' | 'ospite_id'>): Incontro {
  return {
    id: `${partial.round}-${partial.girone}`,
    torneo_id: 't1',
    punti_casa: null,
    punti_ospite: null,
    ...partial,
  }
}

describe('prossimeRigheEliminazioneAmici — senza andata/ritorno', () => {
  it('genera la finale con i vincitori dopo che entrambe le semifinali sono complete', () => {
    const incontri = [
      m({ round: 1, girone: 1, casa_id: 's1', ospite_id: 's2', punti_casa: 2, punti_ospite: 1 }),
      m({ round: 1, girone: 2, casa_id: 's3', ospite_id: 's4', punti_casa: 0, punti_ospite: 2 }),
    ]
    const righe = prossimeRigheEliminazioneAmici(SEED4, incontri, incontri[1], {
      andataRitorno: false,
      finaleSecca: false,
      terzoPosto: false,
    })
    expect(righe).toEqual([{ round: 2, girone: 1, casa_id: 's1', ospite_id: 's4' }])
  })

  it('non genera nulla finché manca un risultato del turno', () => {
    const incontri = [
      m({ round: 1, girone: 1, casa_id: 's1', ospite_id: 's2', punti_casa: 2, punti_ospite: 1 }),
      m({ round: 1, girone: 2, casa_id: 's3', ospite_id: 's4' }), // non ancora giocata
    ]
    const righe = prossimeRigheEliminazioneAmici(SEED4, incontri, incontri[0], {
      andataRitorno: false,
      finaleSecca: false,
      terzoPosto: false,
    })
    expect(righe).toEqual([])
  })

  it('con 3° posto attivo, genera anche la finalina con i due perdenti delle semifinali', () => {
    const incontri = [
      m({ round: 1, girone: 1, casa_id: 's1', ospite_id: 's2', punti_casa: 2, punti_ospite: 1 }),
      m({ round: 1, girone: 2, casa_id: 's3', ospite_id: 's4', punti_casa: 0, punti_ospite: 2 }),
    ]
    const righe = prossimeRigheEliminazioneAmici(SEED4, incontri, incontri[1], {
      andataRitorno: false,
      finaleSecca: false,
      terzoPosto: true,
    })
    expect(righe).toContainEqual({ round: 2, girone: 1, casa_id: 's1', ospite_id: 's4' })
    expect(righe).toContainEqual({ round: 3, girone: 0, casa_id: 's2', ospite_id: 's3' })
  })
})

describe('prossimeRigheEliminazioneAmici — andata e ritorno', () => {
  it('dopo l\'andata genera subito il ritorno con casa/ospite invertiti', () => {
    const andata = m({ round: 1, girone: 1, casa_id: 's1', ospite_id: 's2', punti_casa: 2, punti_ospite: 1 })
    const righe = prossimeRigheEliminazioneAmici(SEED4, [andata], andata, {
      andataRitorno: true,
      finaleSecca: false,
      terzoPosto: false,
    })
    expect(righe).toEqual([{ round: 2, girone: 1, casa_id: 's2', ospite_id: 's1' }])
  })

  it('genera il turno successivo solo quando entrambe le gambe di tutti gli slot sono complete', () => {
    const incontri = [
      m({ round: 1, girone: 1, casa_id: 's1', ospite_id: 's2', punti_casa: 2, punti_ospite: 1 }),
      m({ round: 2, girone: 1, casa_id: 's2', ospite_id: 's1', punti_casa: 0, punti_ospite: 1 }), // s1 vince aggregato 3-1
      m({ round: 1, girone: 2, casa_id: 's3', ospite_id: 's4', punti_casa: 1, punti_ospite: 1 }),
      // manca il ritorno dello slot 2
    ]
    const righe = prossimeRigheEliminazioneAmici(SEED4, incontri, incontri[1], {
      andataRitorno: true,
      finaleSecca: false,
      terzoPosto: false,
    })
    expect(righe).toEqual([])
  })

  it('a turno completo genera la finale (andata) con il vincitore aggregato di ogni slot', () => {
    const incontri = [
      m({ round: 1, girone: 1, casa_id: 's1', ospite_id: 's2', punti_casa: 2, punti_ospite: 1 }),
      m({ round: 2, girone: 1, casa_id: 's2', ospite_id: 's1', punti_casa: 0, punti_ospite: 1 }), // s1 aggregato: 3-1
      m({ round: 1, girone: 2, casa_id: 's3', ospite_id: 's4', punti_casa: 1, punti_ospite: 1 }),
      m({ round: 2, girone: 2, casa_id: 's4', ospite_id: 's3', punti_casa: 0, punti_ospite: 2 }), // s3 aggregato: 3-1
    ]
    const righe = prossimeRigheEliminazioneAmici(SEED4, incontri, incontri[3], {
      andataRitorno: true,
      finaleSecca: false,
      terzoPosto: false,
    })
    expect(righe).toEqual([{ round: 3, girone: 1, casa_id: 's1', ospite_id: 's3' }])
  })

  it('finale secca: non genera il ritorno della finale anche in modalità andata/ritorno', () => {
    // Turno finale (br=2, dbRoundAndata(2)=3): con finale secca è un'unica gara.
    const finale = m({ round: 3, girone: 1, casa_id: 's1', ospite_id: 's4', punti_casa: 2, punti_ospite: 0 })
    const righe = prossimeRigheEliminazioneAmici(SEED4, [finale], finale, {
      andataRitorno: true,
      finaleSecca: true,
      terzoPosto: false,
    })
    expect(righe).toEqual([])
  })
})
