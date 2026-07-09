import { supabase } from '@/lib/supabase'

// (Fase 8c) Salvataggi lato segreteria per campi e regole di prenotazione.
// Le LETTURE riusano useCampi()/useImpostazioni() di features/prenotazioni.
// Qui ci sono solo le scritture (l'admin le esegue grazie alle policy RLS).

// Esito comune: ok, oppure errore con eventuale indicazione dello script SQL
// mancante (pattern difensivo della v1 contro un DB non ancora migrato).
export type EsitoSalvataggio =
  | { ok: true }
  | { ok: false; mancaScript?: boolean; mancaPermesso?: boolean; messaggio?: string }

// La RLS ha rifiutato la scrittura: manca la policy admin (script tappa13-campi-rls.sql).
function mancaPermesso(error: { code?: string }): boolean {
  return error.code === '42501'
}

// Una colonna nuova non esiste ancora nel database (manca la migrazione).
// PostgREST risponde PGRST204 ("column not found in the schema cache"),
// oppure il messaggio cita la colonna.
function mancaColonna(error: { code?: string; message?: string }, ...colonne: string[]): boolean {
  if (error.code === 'PGRST204') return true
  const m = (error.message ?? '').toLowerCase()
  return colonne.some((c) => m.includes(c.toLowerCase()))
}

// Dati modificabili di un campo dalla segreteria.
export interface PatchCampo {
  nome: string
  apertura: string
  chiusura: string
  in_servizio: boolean
  nota_servizio: string | null
  outdoor: boolean
}

export async function salvaCampo(
  campoId: number | string,
  patch: PatchCampo,
): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('campi').update(patch).eq('id', campoId)
  if (error) {
    return {
      ok: false,
      mancaPermesso: mancaPermesso(error),
      mancaScript: mancaColonna(error, 'apertura', 'chiusura', 'in_servizio', 'nota_servizio', 'outdoor'),
      messaggio: error.message,
    }
  }
  return { ok: true }
}

// Crea un nuovo campo. apertura/chiusura partono da una fascia tipica;
// l'admin la regola subito dopo. `ordine` lo decide il chiamante (max + 1).
export async function aggiungiCampo(
  sport: 'padel' | 'calcio',
  nome: string,
  ordine: number,
): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('campi').insert({
    sport,
    nome,
    ordine,
    apertura: '08:00',
    chiusura: '22:00',
    in_servizio: true,
    nota_servizio: null,
    outdoor: false,
  })
  if (error) {
    return {
      ok: false,
      mancaPermesso: mancaPermesso(error),
      mancaScript: mancaColonna(error, 'apertura', 'chiusura', 'in_servizio', 'nota_servizio', 'outdoor'),
      messaggio: error.message,
    }
  }
  return { ok: true }
}

export async function eliminaCampo(campoId: number | string): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('campi').delete().eq('id', campoId)
  if (error) {
    // 23503 = ci sono prenotazioni che puntano a questo campo (vincolo esterno).
    const conPrenotazioni = error.code === '23503'
    return {
      ok: false,
      mancaPermesso: mancaPermesso(error),
      messaggio: conPrenotazioni
        ? 'Questo campo ha delle prenotazioni collegate: mettilo fuori servizio invece di eliminarlo.'
        : error.message,
    }
  }
  return { ok: true }
}

export async function salvaRegole(
  giorniAnticipo: number,
  maxPadel: number,
  maxCalcio: number,
): Promise<EsitoSalvataggio> {
  const { error } = await supabase
    .from('impostazioni')
    .update({
      giorni_anticipo: giorniAnticipo,
      max_pren_padel: maxPadel,
      max_pren_calcio: maxCalcio,
    })
    .eq('id', 1)
  if (error) {
    const tabellaMancante =
      error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204'
    return {
      ok: false,
      mancaScript: tabellaMancante || mancaColonna(error, 'impostazioni', 'max_pren'),
      messaggio: error.message,
    }
  }
  return { ok: true }
}
