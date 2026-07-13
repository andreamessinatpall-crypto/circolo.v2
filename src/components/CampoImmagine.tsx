import { useRef, useState, type ChangeEvent } from 'react'
import { logoDaFile } from '@/lib/immagini'

// Slot immagine rettangolare (banner/copertina), a differenza di SlotImmagine
// che è pensato per avatar circolari. Ridimensiona lato client e salva come
// data URL (stesso pattern di logoDaFile, niente Storage). Usato per annunci
// e premi.
export default function CampoImmagine({
  img,
  onCambia,
  aspetto = '16/7',
  maxLato = 900,
  etichetta = 'Immagine (facoltativa)',
  compatta = false,
}: {
  img: string | null
  onCambia: (dataUrl: string | null) => void
  aspetto?: string
  maxLato?: number
  // Passa '' per non mostrare nessuna etichetta sopra il campo.
  etichetta?: string
  // Riquadro piccolo (es. thumbnail 1:1 in una lista): pulsanti overlay a
  // icona invece del pulsante testuale "Cambia", altrimenti non ci stanno.
  compatta?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function carica(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErrore(null)
    try {
      onCambia(await logoDaFile(file, maxLato, 4096))
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Immagine non valida.')
    }
  }

  return (
    <div>
      {etichetta && <span className="etichetta !mb-1 block">{etichetta}</span>}
      {img ? (
        <div
          className="relative overflow-hidden rounded-lg border border-[var(--border2)]"
          style={{ aspectRatio: aspetto }}
        >
          <img src={img} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onCambia(null)}
            title="Rimuovi immagine"
            aria-label="Rimuovi immagine"
            className={
              'absolute right-1 top-1 flex items-center justify-center rounded-full bg-black/55 text-white' +
              (compatta ? ' h-4 w-4 text-[10px]' : ' h-6 w-6')
            }
          >
            ✕
          </button>
          {compatta ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Cambia immagine"
              aria-label="Cambia immagine"
              className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/55 text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1.5 right-1.5 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white"
            >
              Cambia
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border2)] text-sm text-ink-2 hover:bg-black/5"
          style={{ aspectRatio: aspetto }}
        >
          ＋ Carica immagine
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={carica} />
      {errore && (
        <p className="mt-1 text-xs" style={{ color: 'var(--errore)' }}>
          {errore}
        </p>
      )}
    </div>
  )
}
