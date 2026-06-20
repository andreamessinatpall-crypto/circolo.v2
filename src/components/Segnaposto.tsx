// Contenuto provvisorio di una sezione non ancora implementata.
// Lo useranno le pagine finché non costruiremo la funzionalità vera.
export default function Segnaposto({
  titolo,
  descrizione,
}: {
  titolo: string
  descrizione: string
}) {
  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-wide text-verde-800">
        {titolo}
      </h1>
      <p className="mt-2 max-w-prose text-ink-2">{descrizione}</p>
    </div>
  )
}
