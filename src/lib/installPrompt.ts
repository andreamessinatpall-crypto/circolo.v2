// Cattura l'evento "beforeinstallprompt" (Android/Chrome) appena il browser lo
// spara, così InstallaAppBanner può mostrare il bottone anche se monta dopo.
// Su iOS Safari questo evento non esiste: il banner mostra istruzioni manuali.

export interface EventoInstallazione extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Ascoltatore = () => void

let eventoCatturato: EventoInstallazione | null = null
const ascoltatori = new Set<Ascoltatore>()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  eventoCatturato = e as EventoInstallazione
  ascoltatori.forEach((f) => f())
})

window.addEventListener('appinstalled', () => {
  eventoCatturato = null
  ascoltatori.forEach((f) => f())
})

export function getEventoInstallazione() {
  return eventoCatturato
}

export function sottoscriviInstallazione(ascoltatore: Ascoltatore) {
  ascoltatori.add(ascoltatore)
  return () => {
    ascoltatori.delete(ascoltatore)
  }
}
