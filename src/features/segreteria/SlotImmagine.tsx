import type { ChangeEvent } from 'react'

const ICONA_CARICA = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M5 20h14" />
  </svg>
)
const ICONA_X = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

// Cella "immagine": l'anteprima (immagine caricata o cerchio col colore) e, di
// fianco, due pulsantini a icona — carica/cambia e rimuovi.
export default function SlotImmagine({
  etichetta,
  img,
  colore,
  onCarica,
  onRimuovi,
}: {
  etichetta: string
  img: string | null
  colore: string
  onCarica: (e: ChangeEvent<HTMLInputElement>) => void
  onRimuovi: () => void
}) {
  return (
    <div>
      <span className="etichetta !mb-1 block whitespace-nowrap">{etichetta}</span>
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-black/10"
          style={img ? undefined : { background: colore }}
        >
          {img && <img src={img} alt="" className="h-full w-full object-cover" />}
        </span>
        <div className="flex flex-col gap-1">
          <label
            title={img ? 'Cambia immagine' : 'Carica immagine'}
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-verde-100 bg-verde-50 text-verde-800"
          >
            {ICONA_CARICA}
            <input type="file" accept="image/*" className="hidden" onChange={onCarica} />
          </label>
          {img && (
            <button
              type="button"
              onClick={onRimuovi}
              title="Rimuovi immagine"
              aria-label={`Rimuovi immagine ${etichetta}`}
              className="flex h-5 w-5 items-center justify-center rounded border border-black/10"
              style={{ color: 'var(--errore)' }}
            >
              {ICONA_X}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
