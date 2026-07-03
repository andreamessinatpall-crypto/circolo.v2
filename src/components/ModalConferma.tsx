import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  titolo: string
  messaggio?: ReactNode
  labelConferma?: string
  pericolo?: boolean
  onConferma: () => void
  onAnnulla: () => void
}

export default function ModalConferma({
  titolo,
  messaggio,
  labelConferma = 'Conferma',
  pericolo = false,
  onConferma,
  onAnnulla,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onAnnulla() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onAnnulla])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onAnnulla}
    >
      <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg">{titolo}</h2>
        {messaggio && <p className="sub mt-2 mb-4 text-sm">{messaggio}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn${pericolo ? ' btn-pericolo' : ''} flex-1`}
            onClick={onConferma}
          >
            {labelConferma}
          </button>
          <button
            type="button"
            className="btn btn-secondario flex-1"
            onClick={onAnnulla}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
