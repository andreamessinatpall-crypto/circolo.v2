import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Componente, Incontro, Squadra, Torneo } from './tipi'

export interface DatiTornei {
  tornei: Torneo[]
  perTorneoSquadre: Record<string, Squadra[]>
  perSquadraComp: Record<string, Componente[]>
  perTorneoIncontri: Record<string, Incontro[]>
  assegnati: Record<string, Set<string>>
  // (Fase 6e) incontro_id -> data/ora ISO della prenotazione collegata.
  // Serve per mostrare "In programma/Disputata" e nascondere il bottone "Sfida".
  prenByIncontro: Record<string, string>
}

// Carica tornei + squadre + componenti e li raggruppa (come datiTornei della v1).
// Le tabelle squadre/componenti possono non esistere ancora: in tal caso le
// trattiamo come vuote (l'errore vero è solo sulla tabella tornei).
export function useTornei() {
  return useQuery({
    queryKey: ['tornei'],
    queryFn: async (): Promise<DatiTornei> => {
      const { data: tornei, error } = await supabase
        .from('tornei')
        .select('*')
        .order('creato_il', { ascending: false })
      if (error) throw error

      const lista = (tornei ?? []) as Torneo[]
      const ids = lista.map((t) => t.id)

      let squadre: Squadra[] = []
      let comp: Componente[] = []
      let incontri: Incontro[] = []
      if (ids.length) {
        // La tabella incontri può non esistere ancora (tappa3b2-girone.sql):
        // se la query fallisce la trattiamo come vuota.
        const [r1, r2, r3] = await Promise.all([
          supabase.from('squadre').select('*').in('torneo_id', ids),
          supabase.from('squadra_componenti').select('*').in('torneo_id', ids),
          supabase.from('incontri').select('*').in('torneo_id', ids),
        ])
        squadre = (r1.data ?? []) as Squadra[]
        comp = (r2.data ?? []) as Componente[]
        incontri = (r3.data ?? []) as Incontro[]
      }

      // (Fase 6e) Quali incontri hanno già una prenotazione (campo+orario fissati).
      // Usiamo la RPC incontri_prenotati così la vedono anche i soci (la tabella
      // prenotazioni è protetta da RLS). Se la RPC non c'è ancora, mappa vuota.
      const prenByIncontro: Record<string, string> = {}
      if (incontri.length) {
        const { data: pi } = await supabase.rpc('incontri_prenotati', {
          p_incontri: incontri.map((m) => m.id),
        })
        for (const r of (pi ?? []) as { incontro_id: number | string; inizio: string }[]) {
          prenByIncontro[String(r.incontro_id)] = r.inizio
        }
      }

      const perTorneoSquadre: Record<string, Squadra[]> = {}
      const perSquadraComp: Record<string, Componente[]> = {}
      const perTorneoIncontri: Record<string, Incontro[]> = {}
      const assegnati: Record<string, Set<string>> = {}
      for (const s of squadre) {
        const k = String(s.torneo_id)
        ;(perTorneoSquadre[k] ??= []).push(s)
      }
      for (const c of comp) {
        ;(perSquadraComp[String(c.squadra_id)] ??= []).push(c)
        // I componenti manuali (senza socio_id) non occupano un posto fra i soci.
        if (c.socio_id) (assegnati[String(c.torneo_id)] ??= new Set()).add(c.socio_id)
      }
      for (const m of incontri) {
        ;(perTorneoIncontri[String(m.torneo_id)] ??= []).push(m)
      }

      return {
        tornei: lista,
        perTorneoSquadre,
        perSquadraComp,
        perTorneoIncontri,
        assegnati,
        prenByIncontro,
      }
    },
  })
}
