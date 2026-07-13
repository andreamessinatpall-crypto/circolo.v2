import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

interface Box { x: number; y: number; width: number }
type Trascinamento = { tipo: 'sposta' | 'ridimensiona'; startX: number; startY: number; box: Box }

// Editor di ritaglio: riquadro trascinabile/ridimensionabile (rapporto
// d'aspetto fisso) sopra l'immagine originale, per scegliere quale parte
// mantenere invece di un ritaglio centrato automatico. Il risultato è
// disegnato su un <canvas> e restituito come data URL (stesso pattern
// "niente Storage" di src/lib/immagini.ts).
export default function RitaglioImmagine({
  src,
  aspetto,
  maxLato = 900,
  onConferma,
  onAnnulla,
}: {
  src: string
  aspetto: number
  maxLato?: number
  onConferma: (dataUrl: string) => void
  onAnnulla: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Trascinamento | null>(null)
  const [pronto, setPronto] = useState(false)
  const [altezzaResa, setAltezzaResa] = useState(0)
  const [box, setBox] = useState<Box>({ x: 0, y: 0, width: 0 })

  function inizializza() {
    const img = imgRef.current
    const cont = containerRef.current
    if (!img || !cont) return
    const larghezza = cont.clientWidth
    const altezza = larghezza * (img.naturalHeight / img.naturalWidth)
    setAltezzaResa(altezza)
    const larghezzaBox = Math.min(larghezza, altezza * aspetto)
    const altezzaBox = larghezzaBox / aspetto
    setBox({ x: (larghezza - larghezzaBox) / 2, y: (altezza - altezzaBox) / 2, width: larghezzaBox })
    setPronto(true)
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current
      const cont = containerRef.current
      if (!d || !cont) return
      const larghezza = cont.clientWidth
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (d.tipo === 'sposta') {
        const x = Math.min(Math.max(0, d.box.x + dx), Math.max(0, larghezza - d.box.width))
        const y = Math.min(Math.max(0, d.box.y + dy), Math.max(0, altezzaResa - d.box.width / aspetto))
        setBox((b) => ({ ...b, x, y }))
      } else {
        const maxLarghezza = Math.min(larghezza - d.box.x, (altezzaResa - d.box.y) * aspetto)
        const width = Math.min(maxLarghezza, Math.max(60, d.box.width + dx))
        setBox((b) => ({ ...b, width }))
      }
    }
    function onUp() {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [altezzaResa, aspetto])

  function iniziaSposta(e: ReactPointerEvent) {
    e.preventDefault()
    dragRef.current = { tipo: 'sposta', startX: e.clientX, startY: e.clientY, box }
  }
  function iniziaRidimensiona(e: ReactPointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { tipo: 'ridimensiona', startX: e.clientX, startY: e.clientY, box }
  }

  function confermaRitaglio() {
    const img = imgRef.current
    const cont = containerRef.current
    if (!img || !cont) return
    const scale = img.naturalWidth / cont.clientWidth
    const sx = box.x * scale
    const sy = box.y * scale
    const sw = box.width * scale
    const sh = (box.width / aspetto) * scale
    const outW = Math.round(Math.min(maxLato, sw))
    const outH = Math.round(outW / aspetto)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)
    onConferma(canvas.toDataURL('image/png'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onAnnulla}>
      <div className="card modale-leggibile w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg">Ritaglia immagine</h2>
        <p className="sub mb-3 text-sm">
          Trascina il riquadro per spostarlo, usa il pallino nell'angolo per ridimensionarlo.
        </p>
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg select-none"
          style={{ height: altezzaResa || undefined }}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            className="block w-full"
            style={{ visibility: pronto ? 'visible' : 'hidden' }}
            onLoad={inizializza}
            draggable={false}
          />
          {pronto && (
            <div
              onPointerDown={iniziaSposta}
              className="absolute cursor-move touch-none border-2 border-white"
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.width / aspetto,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }}
            >
              <div
                onPointerDown={iniziaRidimensiona}
                title="Ridimensiona"
                className="absolute -bottom-2 -right-2 h-5 w-5 touch-none cursor-nwse-resize rounded-full border-2 border-white"
                style={{ background: 'var(--v700)' }}
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn flex-1 !mt-0" onClick={confermaRitaglio}>
            Conferma ritaglio
          </button>
          <button type="button" className="btn btn-secondario flex-1 !mt-0" onClick={onAnnulla}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
