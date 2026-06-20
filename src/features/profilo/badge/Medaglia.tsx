import {
  EMOJI_SPORT,
  LIVELLI_PARTITE,
  numeroRomano,
  type Sport,
} from './badgeDati'

// Medaglia stilizzata: cerchio colorato del livello, con l'emoji dell'animale,
// un piccolo indicatore dello sport e il livello in numero romano.
export default function Medaglia({
  sport,
  liv,
  size = 64,
  bloccato = false,
}: {
  sport: Sport
  liv: number
  size?: number
  bloccato?: boolean
}) {
  const l = LIVELLI_PARTITE[liv - 1]
  if (!l) return null

  return (
    <div
      className="relative flex items-center justify-center rounded-full shadow-inner"
      style={{
        width: size,
        height: size,
        background: bloccato ? '#D9DEDA' : l.colore,
        opacity: bloccato ? 0.6 : 1,
      }}
      title={`${l.nome} · livello ${numeroRomano(liv)}`}
    >
      <span style={{ fontSize: size * 0.42, filter: bloccato ? 'grayscale(1)' : 'none' }}>
        {l.emoji}
      </span>
      <span
        className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-white shadow"
        style={{ width: size * 0.36, height: size * 0.36, fontSize: size * 0.2 }}
      >
        {EMOJI_SPORT[sport]}
      </span>
    </div>
  )
}
