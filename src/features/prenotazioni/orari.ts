// Durata di uno slot di prenotazione (come nella v1).
export const SLOT_MINUTI = 90

// "2024-09-01" da una data locale.
export function ymd(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export function oraLocale(d: Date): string {
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// Costruisce una data locale da "2024-09-01" + "08:30".
export function dataDa(ymdStr: string, ora: string): Date {
  const [y, m, g] = ymdStr.split('-').map(Number)
  const [h, min] = ora.split(':').map(Number)
  return new Date(y, m - 1, g, h, min)
}

// Orari di inizio degli slot in base ad apertura/chiusura del campo.
// durataMn sovrascrive SLOT_MINUTI (usato per i tornei con durata personalizzata).
export function orariCampo(
  campo: { apertura: string | null; chiusura: string | null },
  durataMn: number = SLOT_MINUTI,
): string[] {
  const ap = (campo.apertura || '08:30').slice(0, 5)
  const ch = (campo.chiusura || '22:00').slice(0, 5)
  const [ha, ma] = ap.split(':').map(Number)
  const [hc, mc] = ch.split(':').map(Number)
  let t = ha * 60 + ma
  const fine = hc * 60 + mc
  const out: string[] = []
  while (t + durataMn <= fine) {
    out.push(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'))
    t += durataMn
  }
  return out
}
