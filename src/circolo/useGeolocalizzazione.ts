import { useEffect, useState } from 'react'

export type StatoGeolocalizzazione = 'in-corso' | 'concessa' | 'negata' | 'non-disponibile'

export interface Geolocalizzazione {
  stato: StatoGeolocalizzazione
  posizione: { lat: number; lon: number } | null
}

// Richiede la posizione del browser una sola volta al montaggio (mostra il
// prompt nativo di permesso): usata dal carosello di scelta circolo per
// ordinare per vicinanza. Se il socio nega o il dispositivo non supporta la
// geolocalizzazione, il carosello ricade su un altro ordinamento (nessun
// errore bloccante).
export function useGeolocalizzazione(): Geolocalizzazione {
  const [stato, setStato] = useState<StatoGeolocalizzazione>('in-corso')
  const [posizione, setPosizione] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStato('non-disponibile')
      return
    }
    let annullato = false
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (annullato) return
        setPosizione({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setStato('concessa')
      },
      () => {
        if (annullato) return
        setStato('negata')
      },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    )
    return () => {
      annullato = true
    }
  }, [])

  return { stato, posizione }
}
