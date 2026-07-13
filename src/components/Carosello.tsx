import { useEffect, useRef, useState, type ReactNode, type WheelEvent } from 'react'

function IcoFrecciaCarosello({ sinistra }: { sinistra?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={sinistra ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}

// Carosello orizzontale con frecce prev/next a metà altezza invece della
// scrollbar da trascinare col mouse (richiesto esplicitamente per il
// browser: la scrollbar era scomoda da usare). Le frecce si nascondono da
// sole ai due estremi e restano visibili solo su dispositivi con mouse
// (vedi media query hover:hover in index.css) — su touch lo scroll
// orizzontale funziona già col dito. `className` seleziona il contenitore
// scorrevole vero e proprio (di default il carosello di Area Club,
// .club-tile-carosello; la scheda giocatore passa .risultati-scroll).
export function CaroselloFrecce({
  children,
  className = 'club-tile-carosello',
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [puoSx, setPuoSx] = useState(false)
  const [puoDx, setPuoDx] = useState(false)

  function aggiornaFrecce() {
    const el = ref.current
    if (!el) return
    setPuoSx(el.scrollLeft > 4)
    setPuoDx(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  // Al primo render il carosello potrebbe non avere ancora tutte le
  // minischede (i dati arrivano async): ricontrolliamo quando cambiano i
  // children e al resize, non solo sullo scroll manuale.
  useEffect(() => {
    aggiornaFrecce()
    window.addEventListener('resize', aggiornaFrecce)
    return () => window.removeEventListener('resize', aggiornaFrecce)
  }, [children])

  function scorri(verso: 1 | -1) {
    ref.current?.scrollBy({ left: verso * 280, behavior: 'smooth' })
  }

  // Rotellina del mouse (verticale) tradotta in scroll orizzontale: senza
  // questo, sul browser passare il mouse sul carosello e scorrere la
  // rotellina non muoveva nulla (il div non ha overflow verticale da
  // scrollare). Se non c'è più margine in quella direzione lasciamo che
  // l'evento risalga normalmente, così la pagina scorre come al solito.
  function onWheel(e: WheelEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || e.deltaY === 0) return
    const puoScorrere = e.deltaY > 0
      ? el.scrollLeft < el.scrollWidth - el.clientWidth - 1
      : el.scrollLeft > 1
    if (!puoScorrere) return
    e.preventDefault()
    el.scrollLeft += e.deltaY
  }

  return (
    <div className="carosello-frecce">
      <div className={className} ref={ref} onScroll={aggiornaFrecce} onWheel={onWheel}>
        {children}
      </div>
      <button
        type="button"
        className="carosello-freccia carosello-freccia-sx"
        onClick={() => scorri(-1)}
        disabled={!puoSx}
        aria-label="Scorri a sinistra"
      >
        <IcoFrecciaCarosello sinistra />
      </button>
      <button
        type="button"
        className="carosello-freccia carosello-freccia-dx"
        onClick={() => scorri(1)}
        disabled={!puoDx}
        aria-label="Scorri a destra"
      >
        <IcoFrecciaCarosello />
      </button>
    </div>
  )
}
