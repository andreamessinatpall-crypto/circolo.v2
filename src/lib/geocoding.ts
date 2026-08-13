// Converte un indirizzo in coordinate (Nominatim/OpenStreetMap, API gratuita
// senza chiave, stesso approccio "no-key" di useMeteo.ts per Open-Meteo).
// Va chiamata solo saltuariamente (il gestore la usa quando salva l'indirizzo
// del circolo in Impostazioni), non in un loop: Nominatim chiede max 1
// richiesta al secondo e un header identificativo.
export interface Coordinate {
  lat: number
  lon: number
}

export async function geocodificaIndirizzo(indirizzo: string): Promise<Coordinate | null> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
    encodeURIComponent(indirizzo)
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Ricerca indirizzo non riuscita.')
  const risultati = (await res.json()) as Array<{ lat: string; lon: string }>
  const primo = risultati[0]
  if (!primo) return null
  return { lat: Number(primo.lat), lon: Number(primo.lon) }
}
