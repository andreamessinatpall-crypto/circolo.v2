import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Premio, Richiesta } from '@/features/premi/datiPremi'

// (Fase 8f) Letture/scritture admin del sistema premi. Le tabelle premi /
// richieste_premio e le RPC esistono già su Supabase dalla v1 (tappa5-badge-premi).

// Tutti i premi, anche quelli nascosti (il catalogo socio esclude i nascosti).
export function useTuttiPremi() {
  return useQuery({
    queryKey: ['premi-admin'],
    queryFn: async (): Promise<Premio[]> => {
      const { data, error } = await supabase
        .from('premi')
        .select('*')
        .order('ordine')
        .order('creato_il')
      if (error) throw error
      return (data ?? []) as Premio[]
    },
  })
}

export interface RichiestaConNome extends Richiesta {
  chi: string
}

// Tutte le richieste di premio con il nome del socio richiedente.
export function useTutteRichieste() {
  return useQuery({
    queryKey: ['richieste-admin'],
    queryFn: async (): Promise<RichiestaConNome[]> => {
      const { data, error } = await supabase
        .from('richieste_premio')
        .select('*')
        .order('creato_il', { ascending: false })
      if (error) throw error
      const righe = (data ?? []) as Richiesta[]
      const ids = [...new Set(righe.map((r) => r.socio_id))]
      const nomi = new Map<string, string>()
      if (ids.length) {
        const { data: soci } = await supabase.from('soci').select('id, nome, cognome').in('id', ids)
        for (const s of (soci ?? []) as { id: string; nome: string; cognome: string }[])
          nomi.set(s.id, `${s.nome} ${s.cognome}`.trim())
      }
      return righe.map((r) => ({ ...r, chi: nomi.get(r.socio_id) ?? '—' }))
    },
  })
}

export async function salvaModalitaPremi(attiva: boolean): Promise<void> {
  const { error } = await supabase.from('impostazioni').update({ modalita_premi: attiva }).eq('id', 1)
  if (error) throw error
}

export async function creaPremio(p: {
  nome: string
  descrizione: string | null
  costo: number
  stock: number | null
  immagine?: string | null
}): Promise<void> {
  const { error } = await supabase.from('premi').insert(p)
  if (error) throw error
}

export async function salvaPremio(
  id: string,
  patch: { nome: string; descrizione: string | null; costo: number; stock: number | null; immagine: string | null },
): Promise<void> {
  const { error } = await supabase.from('premi').update(patch).eq('id', id)
  if (error) throw error
}

export async function impostaNascosto(id: string, nascosto: boolean): Promise<void> {
  const { error } = await supabase.from('premi').update({ nascosto }).eq('id', id)
  if (error) throw error
}

export async function eliminaPremio(id: string): Promise<void> {
  const { error } = await supabase.from('premi').delete().eq('id', id)
  if (error) throw error
}

// Le RPC ritornano { ok, errore } come la v1.
export async function cambiaStatoRichiesta(
  id: string,
  stato: 'approvato' | 'consegnato',
): Promise<void> {
  const { data, error } = await supabase.rpc('aggiorna_stato_richiesta', {
    p_richiesta: id,
    p_stato: stato,
  })
  if (error) throw error
  const d = data as { ok?: boolean; errore?: string } | null
  if (d && d.ok === false) throw new Error(d.errore || 'Operazione non riuscita.')
}

export async function annullaRichiesta(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('annulla_richiesta_premio', { p_richiesta: id })
  if (error) throw error
  const d = data as { ok?: boolean; errore?: string } | null
  if (d && d.ok === false) throw new Error(d.errore || 'Operazione non riuscita.')
}
