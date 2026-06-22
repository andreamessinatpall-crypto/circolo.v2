import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mancaTabella } from '@/lib/errori'

// (Fase 7c) Storico movimenti del socio: i punti e crediti guadagnati e spesi.
// I movimenti vivono nella tabella `movimenti_punti` (script tappa4-punti.sql
// della v1), scritti dalla RPC `assegna_movimento`. Ogni socio vede solo i
// PROPRI movimenti grazie alla policy RLS aggiunta in tappa12-movimenti-rls.sql.
//
// Qui NON mostriamo l'elenco a video: serve solo a esportare un CSV con TUTTE
// le colonne che il database raccoglie per ogni evento, quindi teniamo le righe
// grezze così come arrivano (select *).

// Script SQL della v1 che crea la tabella movimenti_punti.
export const SCRIPT_STORICO = 'tappa4-punti.sql'

// Una riga grezza della tabella, con tutte le sue colonne.
export type MovimentoGrezzo = Record<string, unknown>

// Nomi possibili della colonna "data/ora di registrazione", per ordinare.
const COLONNE_DATA = ['creato_il', 'created_at', 'quando', 'data_evento']

function istante(r: MovimentoGrezzo): number {
  for (const c of COLONNE_DATA) {
    const v = r[c]
    if (typeof v === 'string' && v) {
      const t = new Date(v).getTime()
      if (!Number.isNaN(t)) return t
    }
  }
  return 0
}

// La tabella dei movimenti non è ancora stata creata su Supabase.
export function mancaStorico(error: unknown): boolean {
  return mancaTabella(error, 'movimenti_punti')
}

// Tutti i movimenti del socio, dal più recente al più vecchio, con ogni colonna.
export function useStoricoMovimenti(socioId: string | undefined) {
  return useQuery({
    queryKey: ['storico-movimenti', socioId],
    enabled: !!socioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimenti_punti')
        .select('*')
        .eq('socio_id', socioId!)
      if (error) throw error
      const righe = (data ?? []) as MovimentoGrezzo[]
      return righe.slice().sort((a, b) => istante(b) - istante(a))
    },
  })
}
