import { COLORE_SPORT, TRAGUARDI_DEFAULT, useTraguardi, type Sport, type VariabileTraguardo } from './badgeDati'
import { svgEmblema } from './medaglieSvg'

// Emblema rotondo del traguardo (griglia badge e avatar nell'header).
// Se l'admin ha caricato un'immagine per quel traguardo la mostra,
// altrimenti disegna l'emblema SVG col colore dello sport.
export default function Medaglia({
  variabile = 'partite',
  sport,
  soglia,
  size = 66,
  bloccato = false,
}: {
  variabile?: VariabileTraguardo
  sport: Sport
  soglia: number
  size?: number
  bloccato?: boolean
}) {
  const { data } = useTraguardi()
  const traguardi = data ?? TRAGUARDI_DEFAULT
  const t = traguardi.find(
    x => x.variabile === variabile && x.sport === sport && x.soglia === soglia,
  )
  const img = t?.img ?? null
  const colore = COLORE_SPORT[sport]

  const stile = {
    width: size,
    height: size,
    filter: bloccato ? 'grayscale(1)' : undefined,
    opacity: bloccato ? 0.35 : 1,
  }

  if (img) {
    return (
      <span className="emblema" style={stile}>
        <img src={img} alt="" />
      </span>
    )
  }
  return (
    <span
      className="emblema"
      style={stile}
      dangerouslySetInnerHTML={{ __html: svgEmblema(sport, colore) }}
    />
  )
}
