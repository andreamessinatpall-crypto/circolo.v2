import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Circolo, RuoloCircolo } from '@/features/piattaforma/tipi'

export interface MioCircolo {
  ruolo: RuoloCircolo
  circolo: Circolo
}

// I circoli a cui il socio appartiene (la RLS di soci_circoli permetterebbe
// a un gestore/collaboratore di vedere anche le righe altrui del proprio
// circolo: filtriamo esplicitamente per socio_id per avere solo "i miei").
export function useMieCircoli(socioId: string | undefined) {
  return useQuery({
    queryKey: ['miei-circoli', socioId],
    enabled: !!socioId,
    queryFn: async (): Promise<MioCircolo[]> => {
      const { data, error } = await supabase
        .from('soci_circoli')
        .select('ruolo, circolo:circoli(*)')
        .eq('socio_id', socioId as string)
        .order('creato_il')
      if (error) throw error
      return (data ?? []) as unknown as MioCircolo[]
    },
  })
}

// Circoli attivi a cui il socio NON è ancora iscritto, da proporre nella
// schermata di scelta (auto-iscrizione consentita dalla RLS di soci_circoli:
// insert con ruolo='socio' e socio_id = auth.uid()).
export function useCircoliDaScoprire(circoliGiaMembro: string[]) {
  return useQuery({
    queryKey: ['circoli-da-scoprire', [...circoliGiaMembro].sort().join(',')],
    queryFn: async (): Promise<Circolo[]> => {
      const { data, error } = await supabase
        .from('circoli')
        .select('*')
        .eq('attivo', true)
        .order('nome')
      if (error) throw error
      return ((data ?? []) as Circolo[]).filter((c) => !circoliGiaMembro.includes(c.id))
    },
  })
}

export type EsitoIscrizione = { ok: true } | { ok: false; messaggio: string }

export async function iscrivitiCircolo(circoloId: string, socioId: string): Promise<EsitoIscrizione> {
  const { error } = await supabase
    .from('soci_circoli')
    .insert({ circolo_id: circoloId, socio_id: socioId, ruolo: 'socio' })
  if (error) return { ok: false, messaggio: error.message }
  return { ok: true }
}
