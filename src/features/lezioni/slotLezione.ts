// Logica pura (Fase 5): genera gli slot da 1h prenotabili per una richiesta
// di lezione, a partire dalle fasce di disponibilità dell'istruttore
// (ricorrenti per giorno della settimana, o su data specifica), ed esclude
// quelli già occupati da un'altra prenotazione/richiesta.

export interface FasciaSemplice {
  giorno_settimana: number | null
  data: string | null
  ora_inizio: string
  ora_fine: string
}

export interface SlotProposto {
  data: string // YYYY-MM-DD
  oraInizio: string // HH:MM
  oraFine: string // HH:MM
}

export interface Intervallo {
  inizio: string // ISO
  fine: string // ISO
}

function ymd(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

function minuti(ora: string): number {
  const [h, m] = ora.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function orarioDaMinuti(min: number): string {
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0')
}

// Slot di 1h nei prossimi `giorni` giorni (oggi incluso, saltando gli orari
// già passati di oggi) in base alle fasce fornite.
export function generaSlotProposti(
  fasce: FasciaSemplice[],
  adesso: Date = new Date(),
  giorni = 14,
): SlotProposto[] {
  const risultati: SlotProposto[] = []
  const minutiAdesso = adesso.getHours() * 60 + adesso.getMinutes()

  for (let i = 0; i < giorni; i++) {
    const d = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() + i)
    const dataStr = ymd(d)
    const giornoSettimana = d.getDay()

    for (const f of fasce) {
      const combacia = f.giorno_settimana === giornoSettimana || f.data === dataStr
      if (!combacia) continue

      let t = minuti(f.ora_inizio)
      const fine = minuti(f.ora_fine)
      while (t + 60 <= fine) {
        if (i > 0 || t >= minutiAdesso) {
          risultati.push({ data: dataStr, oraInizio: orarioDaMinuti(t), oraFine: orarioDaMinuti(t + 60) })
        }
        t += 60
      }
    }
  }

  return risultati
}

// Esclude gli slot che si sovrappongono a un intervallo già occupato
// (prenotazioni esistenti dell'istruttore o richieste già in attesa/accettate).
export function escludiSlotOccupati(slot: SlotProposto[], occupati: Intervallo[]): SlotProposto[] {
  return slot.filter((s) => {
    const inizio = new Date(`${s.data}T${s.oraInizio}:00`).getTime()
    const fine = new Date(`${s.data}T${s.oraFine}:00`).getTime()
    return !occupati.some((o) => {
      const oInizio = new Date(o.inizio).getTime()
      const oFine = new Date(o.fine).getTime()
      return inizio < oFine && fine > oInizio
    })
  })
}
