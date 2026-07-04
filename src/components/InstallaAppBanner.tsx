import { useEffect, useState } from 'react'
import { getEventoInstallazione, sottoscriviInstallazione } from '@/lib/installPrompt'

const CHIAVE = 'circolo-installa-dismesso'

function eStandalone() {
  const standaloneIos = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia('(display-mode: standalone)').matches || standaloneIos === true
}

function eIosSafari() {
  const ua = window.navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua)
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua)
  return ios && safari
}

export default function InstallaAppBanner() {
  const [dismesso, setDismesso] = useState(() => localStorage.getItem(CHIAVE) === '1')
  const [pronto, setPronto] = useState(() => !!getEventoInstallazione())

  useEffect(() => sottoscriviInstallazione(() => setPronto(!!getEventoInstallazione())), [])

  if (dismesso || eStandalone()) return null
  if (!pronto && !eIosSafari()) return null

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
      ) : (
        <p className="installa-testo">
          Installa questa app: tocca <strong>Condividi</strong> e poi <strong>Aggiungi a Home</strong>.
        </p>
      )}
      <button type="button" className="installa-chiudi" onClick={chiudi} aria-label="Chiudi">
        ✕
      </button>
    </div>
  )
}
