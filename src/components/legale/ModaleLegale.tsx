import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  titolo: string
  onChiudi: () => void
  children: ReactNode
}

const FOCUSABILI = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function ModaleLegale({ titolo, onChiudi, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Focus trap + Esc
    const panel = panelRef.current
    if (!panel) return

    const focusabili = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABILI))
    focusabili[0]?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onChiudi(); return }
      if (e.key !== 'Tab') return
      if (focusabili.length === 0) { e.preventDefault(); return }
      const primo = focusabili[0]
      const ultimo = focusabili[focusabili.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === primo) { e.preventDefault(); ultimo.focus() }
      } else {
        if (document.activeElement === ultimo) { e.preventDefault(); primo.focus() }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onChiudi])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onChiudi}
      role="dialog"
      aria-modal="true"
      aria-label={titolo}
    >
      <div
        ref={panelRef}
        className="modale-legale-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modale-legale-header">
          <h2 className="modale-legale-titolo">{titolo}</h2>
          <button
            type="button"
            className="modale-legale-chiudi"
            onClick={onChiudi}
            aria-label="Chiudi"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Corpo scrollabile */}
        <div className="modale-legale-corpo">
          {children}
        </div>

        {/* Footer */}
        <div className="modale-legale-footer">
          <button type="button" className="btn btn-oro btn-riflesso" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
