import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { geocodificaIndirizzo } from '@/lib/geocoding'
import type { Circolo, MembroCircolo, RuoloCircolo, SocioTrovato } from './tipi'

// Salvataggi lato pannello piattaforma (solo super-admin, vedi RLS
// mt02-rls-multi-tenant.sql). Stesso pattern difensivo di features/segreteria:
// EsitoSalvataggio distingue "permesso negato" da altri errori.

export type EsitoSalvataggio =
  | { ok: true }
  | { ok: false; mancaPermesso?: boolean; messaggio?: string }

function mancaPermesso(error: { code?: string }): boolean {
  return error.code === '42501'
}

export function useCircoli() {
  return useQuery({
    queryKey: ['circoli'],
    queryFn: async (): Promise<Circolo[]> => {
      const { data, error } = await supabase.from('circoli').select('*').order('creato_il')
      if (error) throw error
      return (data ?? []) as Circolo[]
    },
  })
}

// Slug leggibile a partire dal nome: minuscolo, senza accenti, spazi -> trattini.
export function generaSlug(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Nasce non attivo: diventa attivo solo quando il gestore completa il
// questionario di primo accesso (OnboardingGestore) — vedi CircoloProvider.tsx.
export async function creaCircolo(nome: string, slug: string): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('circoli').insert({ nome, slug, attivo: false })
  if (error) {
    const duplicato = error.code === '23505'
    return {
      ok: false,
      mancaPermesso: mancaPermesso(error),
      messaggio: duplicato ? 'Esiste già un circolo con questo slug.' : error.message,
    }
  }
  return { ok: true }
}

export async function attivaDisattivaCircolo(id: string, attivo: boolean): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('circoli').update({ attivo }).eq('id', id)
  if (error) return { ok: false, mancaPermesso: mancaPermesso(error), messaggio: error.message }
  return { ok: true }
}

export async function salvaOrariDefault(
  id: string,
  apertura: string,
  chiusura: string,
): Promise<EsitoSalvataggio> {
  const { error } = await supabase
    .from('circoli')
    .update({ apertura_default: apertura, chiusura_default: chiusura })
    .eq('id', id)
  if (error) return { ok: false, mancaPermesso: mancaPermesso(error), messaggio: error.message }
  return { ok: true }
}

// Geocodifica l'indirizzo (Nominatim) e salva testo + coordinate: servono al
// carosello di scelta circolo per ordinare per vicinanza (vedi
// circolo/datiCircoloSocio.ts). Se la geocodifica non trova nulla, salva
// comunque il testo dell'indirizzo ma azzera le coordinate.
export async function salvaIndirizzoCircolo(id: string, indirizzo: string): Promise<EsitoSalvataggio> {
  const pulito = indirizzo.trim()
  let coordinate: { lat: number; lon: number } | null = null
  if (pulito) {
    try {
      coordinate = await geocodificaIndirizzo(pulito)
    } catch (e) {
      return { ok: false, messaggio: e instanceof Error ? e.message : 'Ricerca indirizzo non riuscita.' }
    }
    if (!coordinate) {
      return { ok: false, messaggio: 'Indirizzo non trovato: prova a essere più preciso (via, città).' }
    }
  }
  const { error } = await supabase
    .from('circoli')
    .update({
      indirizzo: pulito || null,
      latitudine: coordinate?.lat ?? null,
      longitudine: coordinate?.lon ?? null,
    })
    .eq('id', id)
  if (error) return { ok: false, mancaPermesso: mancaPermesso(error), messaggio: error.message }
  return { ok: true }
}

// Aggiorna solo il logo (a differenza di aggiornaBranding, che richiede
// anche nome e colore insieme): usata dal gestore in Impostazioni, dove non
// ha senso fargli toccare nome/colore solo per cambiare il logo.
export async function salvaLogoCircolo(id: string, logoUrl: string | null): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('circoli').update({ logo_url: logoUrl }).eq('id', id)
  if (error) return { ok: false, mancaPermesso: mancaPermesso(error), messaggio: error.message }
  return { ok: true }
}

// Aggiorna solo il colore (a differenza di aggiornaBranding, che richiede
// anche nome e logo insieme). null = torna al colore predefinito uguale per
// tutti i circoli (vedi applicaTemaCircolo, che senza colore_primario non
// sovrascrive nulla e lascia la palette di base dell'app).
export async function salvaColoreCircolo(id: string, colorePrimario: string | null): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('circoli').update({ colore_primario: colorePrimario }).eq('id', id)
  if (error) return { ok: false, mancaPermesso: mancaPermesso(error), messaggio: error.message }
  return { ok: true }
}

export interface PatchBranding {
  nome: string
  logo_url: string | null
  colore_primario: string | null
}

export async function aggiornaBranding(id: string, patch: PatchBranding): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('circoli').update(patch).eq('id', id)
  if (error) return { ok: false, mancaPermesso: mancaPermesso(error), messaggio: error.message }
  return { ok: true }
}

export function useMembriCircolo(circoloId: string | null) {
  return useQuery({
    queryKey: ['soci_circoli', circoloId],
    enabled: !!circoloId,
    queryFn: async (): Promise<MembroCircolo[]> => {
      const { data, error } = await supabase
        .from('soci_circoli')
        .select('*, socio:soci(nome, cognome, email)')
        .eq('circolo_id', circoloId as string)
        .order('creato_il')
      if (error) throw error
      return (data ?? []) as unknown as MembroCircolo[]
    },
  })
}

export async function aggiornaRuoloMembro(
  id: string,
  patch: { ruolo: RuoloCircolo; puo_dare_lezioni: boolean },
): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('soci_circoli').update(patch).eq('id', id)
  if (error) return { ok: false, mancaPermesso: mancaPermesso(error), messaggio: error.message }
  return { ok: true }
}

export async function rimuoviMembro(id: string): Promise<EsitoSalvataggio> {
  const { error } = await supabase.from('soci_circoli').delete().eq('id', id)
  if (error) return { ok: false, mancaPermesso: mancaPermesso(error), messaggio: error.message }
  return { ok: true }
}

// Ricerca soci esistenti per email, da aggiungere a un circolo. Nota: come
// da RLS (puo_gestire_socio), funziona solo se chi cerca è super-admin
// oppure condivide già un circolo con il socio cercato — un gestore non
// super-admin non trova un socio "nuovo" senza nessun circolo in comune
// (limite noto, da risolvere con un vero flusso di invito nella Fase 6).
export async function cercaSocioPerEmail(termine: string): Promise<SocioTrovato[]> {
  const t = termine.trim()
  if (t.length < 3) return []
  const { data, error } = await supabase
    .from('soci')
    .select('id, nome, cognome, email')
    .ilike('email', `%${t}%`)
    .limit(8)
  if (error) throw error
  return (data ?? []) as SocioTrovato[]
}

export async function aggiungiMembro(
  circoloId: string,
  socioId: string,
  ruolo: RuoloCircolo,
): Promise<EsitoSalvataggio> {
  const { error } = await supabase
    .from('soci_circoli')
    .insert({ circolo_id: circoloId, socio_id: socioId, ruolo })
  if (error) {
    const duplicato = error.code === '23505'
    return {
      ok: false,
      mancaPermesso: mancaPermesso(error),
      messaggio: duplicato ? 'Questo socio è già membro del circolo.' : error.message,
    }
  }
  return { ok: true }
}
