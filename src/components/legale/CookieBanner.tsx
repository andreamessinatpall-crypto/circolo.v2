import { useState } from 'react'
import ModaleLegale from './ModaleLegale'
import { CookieContent } from './DocumentiLegali'

const CHIAVE = 'circolo-cookie-ok'

export default function CookieBanner() {
  const [nascosto, setNascosto] = useState(() => localStorage.getItem(CHIAVE) === '1')
  const [mostraPolicy, setMostraPolicy] = useState(false)

  if (nascosto) return null

  function accetta() {
    localStorage.setItem(CHIAVE, '1')
    setNascosto(true)
  }

  return (
    <>
      <div className="cookie-banner" role="region" aria-label="Informativa cookie">
        <p className="cookie-testo">
          Usiamo cookie tecnici necessari al funzionamento della piattaforma.{' '}
          <button
            type="button"
            className="cookie-link"
            onClick={() => setMostraPolicy(true)}
          >
            Cookie Policy
          </button>
        </p>
        <button type="button" className="btn btn-oro btn-riflesso cookie-btn" onClick={accetta}>
          Accetto
        </button>
      </div>

      {mostraPolicy && (
        <ModaleLegale titolo="Cookie Policy" onChiudi={() => setMostraPolicy(false)}>
          <CookieContent />
        </ModaleLegale>
      )}
    </>
  )
}
