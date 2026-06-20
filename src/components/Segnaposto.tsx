// Contenuto provvisorio di una sezione non ancora implementata.
export default function Segnaposto({
  titolo,
  descrizione,
}: {
  titolo: string
  descrizione: string
}) {
  return (
    <div>
      <h1 className="mb-1 text-3xl">{titolo}</h1>
      <div className="card mt-3">
        <p className="max-w-prose text-ink-2">{descrizione}</p>
      </div>
    </div>
  )
}
