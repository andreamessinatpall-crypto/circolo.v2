// Avatar circolare condiviso: foto profilo, o iniziali nome+cognome come sfondo di default.
// Sempre racchiuso in un anello dorato-verde, ovunque compaia una foto profilo.
export default function Avatar({
  foto,
  iniziali,
  size = 44,
  titolo,
}: {
  foto?: string | null
  iniziali: string
  size?: number
  titolo?: string
}) {
  const fontSize = size >= 38 ? '1rem' : size >= 26 ? '0.7rem' : '0.6rem'
  return (
    <span className="avatar-anello">
      {foto ? (
        <img
          src={foto}
          alt=""
          title={titolo}
          className="avatar-cerchio"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          title={titolo}
          className="avatar-cerchio avatar-cerchio-vuota"
          style={{ width: size, height: size, fontSize }}
        >
          {iniziali}
        </span>
      )}
    </span>
  )
}
