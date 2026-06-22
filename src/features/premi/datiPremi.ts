import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mancaRpc } from '@/lib/errori'

// Tipi del sistema premi (le tabelle vivono già su Supabase dalla v1).
export interface Premio {
  id: string
  nome: string
  descrizione: string | null
  costo: number | null
  stock: number | null
  nascosto: boolean
  ordine: number | null
}

export interface Richiesta {
  id: string
  socio_id: string
  nome_premio: string
  costo_pagato: number | null
  stato: 'in_attesa' | 'approvato' | 'consegnato' | string
  creato_il: string
}

// Script SQL della v1 che crea premi/richieste_premio + le RPC di riscatto.
export const SCRIPT_PREMI = 'tappa5-badge-premi.sql'

// Riconosce gli errori "sistema premi non ancora attivo sul database".
export function mancaPremi(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  if (e.code === 'PGRST202' || e.code === '42P01' || e.code === 'PGRST205' || e.code === '42883')
    return true
  const m = (e.message ?? '').toLowerCase()
  return ['premi', 'richieste_premio', 'riscatta_premio'].some((s) => m.includes(s))
}

// Interruttore "modalità premi" della segreteria (v1: modalitaPremi).
// Tollerante: se la colonna non c'è, resta spento.
export function useModalitaPremi() {
  return useQuery({
    queryKey: ['modalita-premi'],
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from('impostazioni')
        .select('modalita_premi')
        .eq('id', 1)
        .maybeSingle()
      return !!(data && (data as { modalita_premi?: boolean }).modalita_premi === true)
    },
  })
}

// Catalogo visibile ai soci (esclude i premi nascosti dall'admin).
export function usePremiCatalogo() {
  return useQuery({
    queryKey: ['premi-catalogo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premi')
        .select('*')
        .eq('nascosto', false)
        .order('ordine')
        .order('costo')
      if (error) throw error
      return (data ?? []) as Premio[]
    },
  })
}

// Saldo crediti del socio corrente.
export function useSaldoCrediti(socioId: string | undefined) {
  return useQuery({
    queryKey: ['saldo-crediti', socioId],
    enabled: !!socioId,
    queryFn: async () => {
      const { data } = await supabase
        .from('soci')
        .select('crediti')
        .eq('id', socioId!)
        .maybeSingle()
      return Number((data as { crediti?: number } | null)?.crediti) || 0
    },
  })
}

// Quante richieste ha ricevuto ogni premio (per il badge "Popolare"). Il socio
// non può leggere le richieste altrui (RLS), quindi il conteggio arriva da una
// RPC SECURITY DEFINER. Tollerante: se la RPC non c'è, nessun conteggio.
export const SCRIPT_POPOLARITA = 'tappa16-premi-popolarita.sql'

export function usePopolaritaPremi() {
  return useQuery({
    queryKey: ['premi-popolarita'],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase.rpc('premi_popolarita')
      if (error) {
        if (mancaRpc(error) || mancaPremi(error)) return new Map()
        throw error
      }
      const m = new Map<string, number>()
      for (const r of (data ?? []) as { nome_premio: string; n: number }[])
        m.set((r.nome_premio ?? '').toLowerCase(), Number(r.n) || 0)
      return m
    },
  })
}

// Le richieste di premio fatte dal socio corrente.
export function useMieRichieste(socioId: string | undefined) {
  return useQuery({
    queryKey: ['mie-richieste', socioId],
    enabled: !!socioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('richieste_premio')
        .select('*')
        .eq('socio_id', socioId!)
        .order('creato_il', { ascending: false })
      if (error) throw error
      return (data ?? []) as Richiesta[]
    },
  })
}
