import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DettaglioRisultato } from '@/features/profilo/datiRisultato'
import type { Preferenze, Sport } from '@/features/profilo/preferenze/domande'

// Attività totali (non solo quelle giocate insieme a chi guarda) di un socio
// qualsiasi: RPC security definer, protetta lato server da sono_amici()
// (tappa84-scheda-giocatore.sql) — vedi partite_totali_socio.
export function usePartiteTotaliSocio(socioId: string | undefined) {
  return useQuery({
    queryKey: ['partite-totali-socio', socioId],
    enabled: !!socioId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('partite_totali_socio', { p_socio: socioId })
      if (error) throw error
      return Number(data ?? 0)
    },
  })
}

// Preferenze di un socio qualsiasi per entrambi gli sport (padel/calcio),
// via preferenze_amico — la query diretta su preferenze_giocatore.ts resta
// limitata dalla RLS alla riga propria.
export function usePreferenzeAmico(socioId: string | undefined) {
  return useQuery({
    queryKey: ['preferenze-amico', socioId],
    enabled: !!socioId,
    queryFn: async (): Promise<Record<Sport, Preferenze | null>> => {
      const { data, error } = await supabase.rpc('preferenze_amico', { p_socio: socioId })
      if (error) throw error
      const righe = (data ?? []) as (Preferenze & { sport: Sport })[]
      const risultato: Record<Sport, Preferenze | null> = { padel: null, calcio: null }
      for (const r of righe) {
        risultato[r.sport] = {
          mano_piede_preferito: r.mano_piede_preferito,
          posizione: r.posizione,
          orario_preferito: r.orario_preferito,
          giorni_preferiti: r.giorni_preferiti,
        }
      }
      return risultato
    },
  })
}

export interface RisultatoSocio {
  prenotazione_id: string
  inizio: string
  fine: string
  campo_nome: string | null
  risultato_dettaglio: DettaglioRisultato | null
}

// Ultimi 5 risultati di un socio qualsiasi in uno sport, indipendentemente
// da chi altro ha giocato con lui — via ultimi_risultati_socio.
export function useUltimiRisultatiSocio(socioId: string | undefined, sport: Sport) {
  return useQuery({
    queryKey: ['ultimi-risultati-socio', socioId, sport],
    enabled: !!socioId,
    queryFn: async (): Promise<RisultatoSocio[]> => {
      const { data, error } = await supabase.rpc('ultimi_risultati_socio', {
        p_socio: socioId,
        p_sport: sport,
        p_limite: 5,
      })
      if (error) throw error
      return (data ?? []) as RisultatoSocio[]
    },
  })
}
