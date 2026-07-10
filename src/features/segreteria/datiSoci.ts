import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mancaRpc } from '@/lib/errori'

// (Fase 8b) Gestione giocatori lato segreteria.
// La scheda socio include anche i saldi (punti/crediti), che la tabella
// `soci` mantiene aggiornati.
export interface SocioAdmin {
  id: string
  nome: string
  cognome: string
  email: string | null
  telefono: string | null
  data_nascita: string | null
  genere: string | null
  sport_preferito: string
  attivo: boolean
  sospeso: boolean | null
  is_admin: boolean
  is_allenatore: boolean | null
  e_allenatore: boolean | null
  punti: number | null
  crediti: number | null
  punti_bloccati: boolean | null
  crediti_bloccati: boolean | null
  richiesta_cancellazione: string | null
  foto_url: string | null
}

// Tutti i soci (l'admin li legge grazie alle policy RLS).
export function useSoci() {
  return useQuery({
    queryKey: ['soci'],
    queryFn: async (): Promise<SocioAdmin[]> => {
      const { data, error } = await supabase.from('soci').select('*')
      if (error) throw error
      return (data ?? []) as SocioAdmin[]
    },
  })
}

// Aggiustamento manuale dei saldi. Come la v1: chiave nulla = il movimento
// si accumula (non è idempotente). I crediti si toccano solo a modalità
// premi accesa.
export async function aggiustaSaldo(
  socioId: string,
  dPunti: number,
  dCrediti: number,
  modalitaPremi: boolean,
): Promise<{ ok: boolean; mancaScript?: boolean; messaggio?: string }> {
  const { error } = await supabase.rpc('assegna_movimento', {
    p_socio: socioId,
    p_punti: dPunti,
    p_crediti: modalitaPremi ? dCrediti : 0,
    p_motivo: 'Aggiustamento manuale',
    p_chiave: null,
    p_data_evento: null,
    p_sport: null,
    p_tipo: 'aggiustamento',
  })
  if (error) return { ok: false, mancaScript: mancaRpc(error), messaggio: error.message }
  return { ok: true }
}

export async function impostaSospensione(
  socioId: string,
  valore: boolean,
): Promise<{ ok: boolean; messaggio?: string }> {
  const { error } = await supabase.from('soci').update({ sospeso: valore }).eq('id', socioId)
  if (error) return { ok: false, messaggio: error.message }
  return { ok: true }
}

export async function impostaBlocco(
  socioId: string,
  campo: 'punti_bloccati' | 'crediti_bloccati',
  valore: boolean,
): Promise<{ ok: boolean; messaggio?: string }> {
  const { error } = await supabase.from('soci').update({ [campo]: valore }).eq('id', socioId)
  if (error) return { ok: false, messaggio: error.message }
  return { ok: true }
}

// Storico movimenti di un socio per l'export CSV admin. L'admin non può leggere
// direttamente la tabella `movimenti_punti` di un altro socio (RLS), quindi si
// passa dalla RPC `storico_movimenti` (SECURITY DEFINER, già presente dalla v1).
export type EsitoStorico =
  | { ok: true; righe: Record<string, unknown>[] }
  | { ok: false; mancaScript?: boolean; messaggio?: string }

export async function fetchStoricoSocio(socioId: string): Promise<EsitoStorico> {
  const { data, error } = await supabase.rpc('storico_movimenti', {
    p_socio: socioId,
    p_da: null,
    p_a: null,
  })
  if (error) return { ok: false, mancaScript: mancaRpc(error), messaggio: error.message }
  return { ok: true, righe: (data ?? []) as Record<string, unknown>[] }
}

export interface AttivitaSocio {
  ultima: string | null
  prossima: string | null
}

export function useAttivitaSoci() {
  return useQuery({
    queryKey: ['attivita_soci'],
    queryFn: async (): Promise<Map<string, AttivitaSocio>> => {
      const ora = new Date()
      const unAnnoFa = new Date(ora)
      unAnnoFa.setFullYear(unAnnoFa.getFullYear() - 1)
      const treSettimane = new Date(ora)
      treSettimane.setDate(treSettimane.getDate() + 21)

      const { data, error } = await supabase
        .from('prenotazioni')
        .select('socio_id, inizio, fine')
        .gte('inizio', unAnnoFa.toISOString())
        .lte('inizio', treSettimane.toISOString())
        .not('socio_id', 'is', null)
      if (error) throw error

      const oraStr = ora.toISOString()
      const map = new Map<string, AttivitaSocio>()
      for (const p of (data ?? []) as { socio_id: string; inizio: string; fine: string }[]) {
        if (!p.socio_id) continue
        const e = map.get(p.socio_id) ?? { ultima: null, prossima: null }
        if (p.fine < oraStr) {
          if (!e.ultima || p.fine > e.ultima) e.ultima = p.fine
        } else if (p.inizio > oraStr) {
          if (!e.prossima || p.inizio < e.prossima) e.prossima = p.inizio
        }
        map.set(p.socio_id, e)
      }
      return map
    },
  })
}

export async function riattivaSocio(
  socioId: string,
): Promise<{ ok: boolean; messaggio?: string }> {
  const { error } = await supabase
    .from('soci')
    .update({ richiesta_cancellazione: null, mostra_in_classifica: true })
    .eq('id', socioId)
  if (error) return { ok: false, messaggio: error.message }
  return { ok: true }
}

// Anonimizza i dati personali di un socio che ha richiesto la cancellazione
// (GDPR Art. 17) e cancella le sue prenotazioni future. Nome e cognome
// restano quelli originali apposta: le prenotazioni passate (storico) devono
// restare leggibili con il vero nome del giocatore, non un placeholder.
// Dopo questa operazione l'admin deve eliminare l'utente da Supabase
// Dashboard → Authentication → Users.
export async function completaCancellazione(
  socioId: string,
): Promise<{ ok: boolean; messaggio?: string }> {
  const { error } = await supabase
    .from('soci')
    .update({
      email: `cancellato-${socioId}@cancellato.invalid`,
      telefono: null,
      data_nascita: null,
      genere: null,
      attivo: false,
      mostra_in_classifica: false,
      richiesta_cancellazione: null,
    })
    .eq('id', socioId)
  if (error) return { ok: false, messaggio: error.message }

  const { error: errorePrenotazioni } = await supabase.rpc('cancella_prenotazioni_future', {
    p_socio_id: socioId,
  })
  if (errorePrenotazioni) {
    return {
      ok: false,
      messaggio:
        'Account anonimizzato, ma la cancellazione delle prenotazioni future non è riuscita: ' +
        errorePrenotazioni.message,
    }
  }

  return { ok: true }
}
