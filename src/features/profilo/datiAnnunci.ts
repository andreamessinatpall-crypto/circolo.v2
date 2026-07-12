import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fase 10 — Bacheca annunci del circolo. Tabella `annunci` (tappa72):
// lettura per tutti i soci, scrittura riservata all'admin/segreteria (RLS).

export interface Annuncio {
  id: string
  titolo: string
  testo: string
  autore_id: string
  creato_il: string
}

export function useAnnunci(enabled = true) {
  return useQuery({
    queryKey: ['annunci'],
    queryFn: async (): Promise<Annuncio[]> => {
      const { data, error } = await supabase
        .from('annunci')
        .select('*')
        .order('creato_il', { ascending: false })
      if (error) throw error
      return (data ?? []) as Annuncio[]
    },
    enabled,
  })
}

// Ogni socio è indipendente dall'altro (chiamate separate a invia-push),
// quindi processarne 10 alla volta in parallelo è sicuro e molto più veloce
// che farli uno alla volta su un circolo con tanti iscritti (stesso pattern
// di src/features/segreteria/rigenera.ts).
const DIMENSIONE_BLOCCO = 10

async function eseguiABlocchi<T>(elementi: T[], azione: (el: T) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < elementi.length; i += DIMENSIONE_BLOCCO) {
    const blocco = elementi.slice(i, i + DIMENSIONE_BLOCCO)
    await Promise.all(blocco.map(azione))
  }
}

export async function creaAnnuncio(p: { titolo: string; testo: string; autore_id: string }): Promise<void> {
  const { error } = await supabase.from('annunci').insert(p)
  if (error) throw error

  // Notifica tutti i soci (in-app + push): soci_pubblici() esclude già gli
  // admin, quindi chi pubblica l'annuncio non notifica se stesso. Un errore
  // qui non deve far fallire la creazione dell'annuncio, che è già salvato.
  try {
    const { data: soci } = await supabase.rpc('soci_pubblici')
    const destinatari = ((soci ?? []) as { id: string }[]).map((s) => s.id)
    await eseguiABlocchi(destinatari, (socioId) =>
      supabase.functions.invoke('invia-push', {
        body: {
          socio_id: socioId,
          titolo: p.titolo,
          corpo: p.testo.length > 120 ? p.testo.slice(0, 117) + '…' : p.testo,
          url: '/profilo',
        },
      }).catch(() => {}),
    )
  } catch {
    // best-effort: l'annuncio resta comunque pubblicato
  }
}

export async function salvaAnnuncio(id: string, patch: { titolo: string; testo: string }): Promise<void> {
  const { error } = await supabase.from('annunci').update(patch).eq('id', id)
  if (error) throw error
}

export async function eliminaAnnuncio(id: string): Promise<void> {
  const { error } = await supabase.from('annunci').delete().eq('id', id)
  if (error) throw error
}
