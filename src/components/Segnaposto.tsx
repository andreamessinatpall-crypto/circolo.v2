// Contenuto provvisorio di una sezione non ancora implementata.
// La tab in alto indica già la sezione, quindi qui non ripetiamo il titolo.
export default function Segnaposto({ descrizione }: { descrizione: string }) {
  return (
    <div className="card">
      <p className="max-w-prose text-ink-2">{descrizione}</p>
    </div>
  )
}
