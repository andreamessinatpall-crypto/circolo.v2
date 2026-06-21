import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { dataDa } from './orari'
import type { Campo, Impostazioni, PrenotazioneGiorno } from './tipi'

// Regole di prenotazione (tollerante: se le colonne nuove mancano, usa i default).
export function useImpostazioni() {
  return useQuery({
    queryKey: ['impostazioni'],
    queryFn: async (): Promise<Impostazioni> => {
      let res = await supabase
        .from('impostazioni')
        .select('giorni_anticipo, max_pren_padel, max_pren_calcio')
        .eq('id', 1)
        .maybeSingle()
      if (res.error) {
        res = await supabase
          .from('impostazioni')
          .select('giorni_anticipo')
          .eq('id', 1)
          .maybeSingle()
      }
      const d = (res.data ?? {}) as Record<string, unknown>
      const ga = Number(d.giorni_anticipo)
      const mp = Number(d.max_pren_padel)
      const mc = Number(d.max_pren_calcio)
      return {
        giorniAnticipo: Number.isFinite(ga) ? ga : 6,
        maxPadel: Number.isFinite(mp) ? mp : 0,
        maxCalcio: Number.isFinite(mc) ? mc : 0,
      }
    },
  })
}

export function useCampi() {
  return useQuery({
    queryKey: ['campi'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campi').select('*').order('ordine')
      if (error) throw error
      return (data ?? []) as Campo[]
    },
  })
}

// Prenotazioni del giorno selezionato (tutti i campi); filtreremo per sport in pagina.
export function usePrenotazioniGiorno(giorno: string) {
  return useQuery({
    queryKey: ['prenotazioni', giorno],
    queryFn: async () => {
      const alba = dataDa(giorno, '00:00')
      const tramonto = new Date(alba.getTime() + 24 * 60 * 60 * 1000)
      const { data, error } = await supabase.rpc('prenotazioni_giorno', {
        alba: alba.toISOString(),
        tramonto: tramonto.toISOString(),
      })
      if (error) throw error
      return (data ?? []) as PrenotazioneGiorno[]
    },
  })
}
