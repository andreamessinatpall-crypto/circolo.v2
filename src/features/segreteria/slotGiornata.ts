import type { MiaPrenotazione } from '@/features/prenotazioni/datiAmichevoli'
import type { Campo } from '@/features/prenotazioni/tipi'

// (Fase 8g · A) Durate degli slot, in minuti.
export const SLOT_DEF = 90 // default (1h 30min)
export const ALLEN_CORTO = 60 // allenamento "corto" (1h)

export interface SlotGiorno {
  inizio: Date
  fine: Date
  // Minuti liberi da questo slot fino al prossimo confine (prenotazione o
  // chiusura). Serve a sapere quali durate si possono creare. 0 per i prenotati.
  disponibileMin: number
  booking: MiaPrenotazione | null
}

function minOf(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
function minOfDate(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}
function dataMin(giorno: string, min: number): Date {
  const [y, m, g] = giorno.split('-').map(Number)
  return new Date(y, m - 1, g, Math.floor(min / 60), min % 60)
}

// Costruisce la sequenza di slot di un campo per un giorno: le prenotazioni ai
// loro orari reali, i tempi liberi riempiti con slot da 90 min (o più corti se
// lo spazio residuo verso la prossima prenotazione è minore). Così un
// allenamento da 1h "compatta" la giornata e non lascia buchi, ma ci si ferma
// sulle prenotazioni successive già fissate (lasciando eventualmente un vuoto).
export function costruisciSlots(
  campo: Campo,
  giorno: string,
  prenotazioni: MiaPrenotazione[],
): SlotGiorno[] {
  const ap = minOf(campo.apertura || '08:00')
  const ch = minOf(campo.chiusura || '22:00')

  const bks = prenotazioni
    .map((p) => ({ p, i: minOfDate(new Date(p.inizio)), f: minOfDate(new Date(p.fine)) }))
    .filter((b) => b.f > ap && b.i < ch)
    .sort((a, b) => a.i - b.i)

  const MIN_RESIDUO = 30 // sotto questa soglia il buco è troppo piccolo: niente slot

  const out: SlotGiorno[] = []
  let cursor = ap
  let bi = 0
  let guardia = 0
  while (cursor < ch && guardia++ < 300) {
    const next = bi < bks.length ? bks[bi] : null
    // Prenotazione raggiunta: la collochi al suo orario reale.
    if (next && next.i <= cursor) {
      out.push({
        inizio: dataMin(giorno, next.i),
        fine: dataMin(giorno, next.f),
        disponibileMin: 0,
        booking: next.p,
      })
      cursor = Math.max(cursor, next.f)
      bi++
      continue
    }
    // Tempo libero fino al prossimo confine.
    const boundary = next ? next.i : ch
    const gap = boundary - cursor
    if (gap <= 0) break
    if (gap >= SLOT_DEF) {
      // Slot pieno da 1h30.
      out.push({
        inizio: dataMin(giorno, cursor),
        fine: dataMin(giorno, cursor + SLOT_DEF),
        disponibileMin: gap,
        booking: null,
      })
      cursor += SLOT_DEF
    } else {
      // Spazio residuo < 1h30: lo mostro solo se è un buco FRA prenotazioni
      // (≥ 30 min). In coda alla giornata lo lascio cadere, così l'ultimo slot
      // resta sempre da 1h30.
      if (next && gap >= MIN_RESIDUO) {
        out.push({
          inizio: dataMin(giorno, cursor),
          fine: dataMin(giorno, boundary),
          disponibileMin: gap,
          booking: null,
        })
      }
      cursor = boundary
    }
  }
  return out
}
