import { useState } from 'react'
import ModaleLegale from './ModaleLegale'
import { PrivacyContent, CookieContent, TerminiContent } from './DocumentiLegali'

type Documento = 'privacy' | 'cookie' | 'termini' | null

export default function FooterLegale() {
  const [aperto, setAperto] = useState<Documento>(null)

  return (
    <>
      <footer className="footer-legale">
        <span className="footer-legale-copyright">
          © {new Date().getFullYear()} [Nome Circolo] — Tutti i diritti riservati
        </span>
        <span className="footer-legale-sep" aria-hidden="true">·</span>
        <button type="button" className="footer-legale-link" onClick={() => setAperto('privacy')}>
          Informativa Privacy
        </button>
        <span className="footer-legale-sep" aria-hidden="true">·</span>
        <button type="button" className="footer-legale-link" onClick={() => setAperto('cookie')}>
          Cookie Policy
        </button>
        <span className="footer-legale-sep" aria-hidden="true">·</span>
        <button type="button" className="footer-legale-link" onClick={() => setAperto('termini')}>
          Termini d'uso
        </button>
      </footer>

      {aperto === 'privacy' && (
        <ModaleLegale titolo="Informativa Privacy" onChiudi={() => setAperto(null)}>
          <PrivacyContent />
        </ModaleLegale>
      )}
      {aperto === 'cookie' && (
        <ModaleLegale titolo="Cookie Policy" onChiudi={() => setAperto(null)}>
          <CookieContent />
        </ModaleLegale>
      )}
      {aperto === 'termini' && (
        <ModaleLegale titolo="Termini d'uso" onChiudi={() => setAperto(null)}>
          <TerminiContent />
        </ModaleLegale>
      )}
    </>
  )
}
