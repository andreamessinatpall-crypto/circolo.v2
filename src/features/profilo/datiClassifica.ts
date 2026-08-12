import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCircolo } from '@/circolo/useCircolo'

// Interruttore "sistema punti/classifica interna" (Tappa 94), mirror di
// useModalitaPremi/salvaModalitaPremi in features/premi. A differenza di
// modalita_premi, il default (colonna e fallback) è ACCESO: la classifica
// c'è sempre stata, non si toglie a chi non ha mai scelto nulla — solo i
// nuovi circoli, tramite il questionario di primo accesso, possono
// disattivarla esplicitamente. Disattivarla nasconde solo l'interfaccia:
// i punti già accumulati NON vengono mai cancellati.
export function useModalitaClassifica() {
  const circolo = useCircolo()
  return useQuery({
    queryKey: ['modalita-classifica', circolo.id],
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from('impostazioni')
        .select('modalita_classifica')
        .eq('circolo_id', circolo.id)
        .maybeSingle()
      return (data as { modalita_classifica?: boolean } | null)?.modalita_classifica !== false
    },
  })
}

export async function salvaModalitaClassifica(attiva: boolean, circoloId: string): Promise<void> {
  const { error } = await supabase
    .from('impostazioni')
    .update({ modalita_classifica: attiva })
    .eq('circolo_id', circoloId)
  if (error) throw error
}
