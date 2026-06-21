import { LIVELLI_PARTITE, type Sport } from './badgeDati'
import { svgEmblema } from './medaglieSvg'

// Emblema rotondo del livello (griglia traguardi e avatar nell'header).
export default function Medaglia({
  sport,
  liv,
  size = 66,
  bloccato = false,
}: {
  sport: Sport
  liv: number
  size?: number
  bloccato?: boolean
}) {
  const colore = LIVELLI_PARTITE[liv - 1]?.colore ?? '#9AA3A0'
  return (
    <span
      className="emblema"
      style={{
        width: size,
        height: size,
        filter: bloccato ? 'grayscale(1)' : undefined,
        opacity: bloccato ? 0.35 : 1,
      }}
      dangerouslySetInnerHTML={{ __html: svgEmblema(sport, colore) }}
    />
  )
}
