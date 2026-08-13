import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Vista CROSS-CIRCOLO per il pannello /admin (solo super-admin, garantito
// dalla RLS: puo_gestire_socio()/e_super_admin() bypassano il filtro "stesso
// circolo" che vale per un gestore/collaboratore normale — vedi
// puo_gestire_socio() in mt02-rls-multi-tenant.sql). A differenza di
// useSoci() in features/segreteria/datiSoci.ts (sempre filtrato sul
// circolo corrente), qui leggiamo `soci` senza alcun filtro circolo_id.
export interface MembroDiGiocatore {
  id: string // soci_circoli.id, serve a rimuoviMembro()
  ruolo: 'socio' | 'collaboratore' | 'gestore'
  circolo: { id: string; nome: string; slug: string }
}

export interface GiocatorePiattaforma {
  id: string
  nome: string
  cognome: string
  email: string | null
  attivo: boolean
  sospeso: boolean | null
  is_super_admin: boolean
  circoli: MembroDiGiocatore[]
}

export function useGiocatoriPiattaforma() {
  return useQuery({
    queryKey: ['giocatori-piattaforma'],
    queryFn: async (): Promise<GiocatorePiattaforma[]> => {
      const { data, error } = await supabase
        .from('soci')
        .select(
          'id, nome, cognome, email, attivo, sospeso, is_super_admin, soci_circoli(id, ruolo, circolo:circoli(id, nome, slug))',
        )
        .order('cognome')
        .order('nome')
      if (error) throw error
      type Riga = Omit<GiocatorePiattaforma, 'circoli'> & { soci_circoli: MembroDiGiocatore[] | null }
      return ((data ?? []) as unknown as Riga[]).map((r) => ({ ...r, circoli: r.soci_circoli ?? [] }))
    },
  })
}
