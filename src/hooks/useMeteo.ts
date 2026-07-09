import { useQuery } from '@tanstack/react-query'

// (Fase 11) Coordinate del circolo — Via Playa 3, 98066 Patti (ME) — usate
// per interrogare Open-Meteo (API gratuita, nessuna chiave richiesta).
const LAT = 38.14736
const LON = 14.96409

const URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&daily=weathercode,temperature_2m_max&timezone=Europe%2FRome&forecast_days=16`

export interface PrevisioneGiorno {
  weathercode: number
  tempMax: number
}

// Mappa giorno (YYYY-MM-DD) -> previsione. Open-Meteo copre solo i prossimi
// 16 giorni: per date oltre non c'è voce nella mappa, niente badge (va bene,
// il prompt chiede "nessun avviso invasivo").
export function useMeteo() {
  return useQuery({
    queryKey: ['meteo'],
    queryFn: async () => {
      const res = await fetch(URL)
      if (!res.ok) throw new Error('Previsioni meteo non disponibili.')
      const json = await res.json()
      const giorni: string[] = json?.daily?.time ?? []
      const codici: number[] = json?.daily?.weathercode ?? []
      const max: number[] = json?.daily?.temperature_2m_max ?? []
      const mappa = new Map<string, PrevisioneGiorno>()
      giorni.forEach((g, i) => mappa.set(g, { weathercode: codici[i], tempMax: max[i] }))
      return mappa
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })
}
