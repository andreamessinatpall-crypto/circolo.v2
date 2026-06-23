import { LIVELLI_PARTITE_DEFAULT, useLivelliPartite, type Sport } from './badgeDati'
import { svgEmblema } from './medaglieSvg'

// Emblema rotondo del livello (griglia traguardi e avatar nell'header). Se
// l'admin ha caricato un'immagine per quel livello/sport la mostra, altrimenti
// disegna l'emblema con il colore del livello.
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
  const { data } = useLivelliPartite()
  const livelli = data ?? LIVELLI_PARTITE_DEFAULT
  const l = livelli[liv - 1]
  const colore = l?.colore ?? '#9AA3A0'
  const img = l ? (sport === 'calcio' ? l.img_calcio : l.img_padel) : null

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
