import { useState, type ReactNode } from 'react'

// (Fase 7c) Sezione con "interlinea" (eyebrow) comprimibile: si clicca il
// titolo per mostrare/nascondere il contenuto. Parte aperta di default.
export default function Sezione({
  titolo,
  apertaIniziale = true,
  variante,
  children,
}: {
  titolo: ReactNode
  apertaIniziale?: boolean
  // "chiaro": barra bianca con contorno e testo verde scuro, al posto del
  // pieno verde scuro di default (usata per distinguere i tornei conclusi).
  variante?: 'chiaro'
  children: ReactNode
}) {
  const [aperta, setAperta] = useState(apertaIniziale)
  return (
    <div>
      <button
        type="button"
        className={'eyebrow eyebrow-toggle' + (variante === 'chiaro' ? ' eyebrow-chiaro' : '')}
        aria-expanded={aperta}
        onClick={() => setAperta((a) => !a)}
      >
        <span className="eyebrow-chevron" aria-hidden>
          {aperta ? '▾' : '▸'}
        </span>
        {titolo}
      </button>
      {aperta && <div>{children}</div>}
    </div>
  )
}
