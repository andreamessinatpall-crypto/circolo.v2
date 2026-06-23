import type { ChangeEvent } from 'react'

// Cella "immagine": l'anteprima (immagine caricata o cerchio col colore) e, di
// fianco, i pulsanti piccoli Carica/Cambia e ✕ (rimuovi), allineati.
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
      <span className="etichetta !mb-1 block">{etichetta}</span>
      <div className="flex items-center gap-2">
        <span
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-black/10"
          style={img ? undefined : { background: colore }}
        >
          {img && <img src={img} alt="" className="h-full w-full object-cover" />}
        </span>
        <div className="flex flex-col gap-1">
          <label className="cursor-pointer rounded-md border border-verde-100 bg-verde-50 px-2 py-0.5 text-center text-[0.7rem] font-semibold text-verde-800">
            {img ? 'Cambia' : 'Carica'}
            <input type="file" accept="image/*" className="hidden" onChange={onCarica} />
          </label>
          {img && (
            <button
              type="button"
              onClick={onRimuovi}
              aria-label={`Rimuovi immagine ${etichetta}`}
              className="rounded-md border border-black/10 px-2 py-0.5 text-center text-[0.7rem] font-semibold"
              style={{ color: 'var(--errore)' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
