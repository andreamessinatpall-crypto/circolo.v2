import { useEffect, useState } from 'react'
import { getEventoInstallazione, sottoscriviInstallazione } from '@/lib/installPrompt'

const CHIAVE = 'circolo-installa-dismesso'

function eStandalone() {
  const standaloneIos = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia('(display-mode: standalone)').matches || standaloneIos === true
}

function eIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// Su iOS solo Safari crea una vera PWA standalone da "Aggiungi a Home": gli
// altri browser (Chrome/Firefox/Edge iOS) sono wrapper di Safari e il loro
// "aggiungi a home" produce solo un segnalibro, non un'app installata.
function eSafari() {
  const ua = window.navigator.userAgent
  return /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua)
}

export default function InstallaAppBanner() {
  const [dismesso, setDismesso] = useState(() => localStorage.getItem(CHIAVE) === '1')
  const [pronto, setPronto] = useState(() => !!getEventoInstallazione())

  useEffect(() => sottoscriviInstallazione(() => setPronto(!!getEventoInstallazione())), [])

  const ios = eIos()
  const iosNonSafari = ios && !eSafari()

  if (dismesso || eStandalone()) return null
  if (!pronto && !ios) return null

  function chiudi() {
    localStorage.setItem(CHIAVE, '1')
    setDismesso(true)
  }

  async function installa() {
    const evento = getEventoInstallazione()
    if (!evento) return
    await evento.prompt()
    await evento.userChoice
    chiudi()
  }

  return (
    <div className="installa-banner" role="region" aria-label="Installa l'app">
      {pronto ? (
        <>
          <p className="installa-testo">
            Installa <strong>Circolo Sportivo</strong> sulla schermata home per un accesso più rapido.
          </p>
          <button type="button" className="btn btn-oro btn-sm" onClick={installa}>
            Installa
          </button>
        </>
      ) : iosNonSafari ? (
        <p className="installa-testo">
          Per installare l'app apri questo indirizzo in <strong>Safari</strong>, poi tocca{' '}
          <strong>Condividi</strong> e infine <strong>Aggiungi alla schermata Home</strong>.
        </p>
      ) : (
        <p className="installa-testo">
          Installa questa app: tocca <strong>Condividi</strong> e poi{' '}
          <strong>Aggiungi alla schermata Home</strong>.
        </p>
      )}
      <button type="button" className="installa-chiudi" onClick={chiudi} aria-label="Chiudi">
        ✕
      </button>
    </div>
  )
}
