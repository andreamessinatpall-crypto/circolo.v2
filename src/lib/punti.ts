// (Fase 7b) Movimenti di PUNTI e CREDITI sul saldo dei soci.
//
// Tutto passa dalla RPC `assegna_movimento` (script tappa4-punti.sql della v1):
// registra una variazione legata a una "chiave" che identifica l'evento. La
// chiave rende le assegnazioni idempotenti: prima di riassegnare si chiama
// `azzera_chiave` per cancellare i movimenti vecchi di quello stesso evento,
// così rieseguire non raddoppia i punti.
//
// NB: in v2 i CREDITI restano a 0. Il loro accumulo dipende dalla "modalità
// premi" e dagli intervalli di date, che fanno parte della segreteria (Fase 8).
// Qui muoviamo solo i PUNTI (dei tornei).

import { supabase } from '@/lib/supabase'
import { mancaRpc } from '@/lib/errori'

export const SCRIPT_PUNTI =
  'Sistema punti non ancora attivo: esegui lo script tappa4-punti.sql su Supabase.'

export interface EsitoPunti {
  ok: boolean
  mancaScript?: boolean
}

export interface Movimento {
  socioId: string
  punti: number
  crediti?: number
  motivo: string
  chiave: string
  dataEvento?: string | null
  sport?: string | null
  tipo?: string | null
}

// Registra un singolo movimento. Non lancia: in caso di errore logga e
// segnala se manca lo script SQL (così il chiamante può avvisare l'utente).
export async function assegnaMovimento(m: Movimento): Promise<EsitoPunti> {
  const { error } = await supabase.rpc('assegna_movimento', {
    p_socio: m.socioId,
    p_punti: m.punti,
    p_crediti: m.crediti ?? 0,
    p_motivo: m.motivo,
    p_chiave: m.chiave,
    p_data_evento: m.dataEvento ?? null,
    p_sport: m.sport ?? null,
    p_tipo: m.tipo ?? null,
  })
  if (error) {
    console.warn('punti:', error.message)
    return { ok: false, mancaScript: mancaRpc(error) }
  }
  return { ok: true }
}

// Cancella tutti i movimenti legati a una chiave (un evento).
export async function azzeraChiave(chiave: string): Promise<void> {
  const { error } = await supabase.rpc('azzera_chiave', { p_chiave: chiave })
  if (error) console.warn('azzera_chiave:', error.message)
}
