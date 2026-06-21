import { useState, type ReactNode } from 'react'

// (Fase 7c) Sezione con "interlinea" (eyebrow) comprimibile: si clicca il
// titolo per mostrare/nascondere il contenuto. Parte aperta di default.
export default function Sezione({
  titolo,
  apertaIniziale = true,
  children,
}: {
  titolo: ReactNode
  apertaIniziale?: boolean
  children: ReactNode
}) {
  const [aperta, setAperta] = useState(apertaIniziale)
  return (
    <div>
      <button
        type="button"
        className="eyebrow eyebrow-toggle"
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
