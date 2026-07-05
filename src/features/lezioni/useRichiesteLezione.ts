import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Campo, Sport } from '@/features/prenotazioni/tipi'
import type { Intervallo } from './slotLezione'

export type StatoRichiesta = 'in_attesa' | 'accettata' | 'rifiutata'

export interface RichiestaLezione {
  id: number
  socio_id: string
  istruttore_id: string
  sport: Sport
  inizio: string
  fine: string
  stato: StatoRichiesta
  prenotazione_id: string | null
  creato_il: string
}

// Impegni già esistenti di un istruttore (prenotazioni assegnate + richieste
// in attesa/accettate): usati per non proporre allo studente slot già occupati.
export function useImpegniIstruttore(istruttoreId: string | undefined) {
  return useQuery({
    queryKey: ['impegni_istruttore', istruttoreId],
    enabled: !!istruttoreId,
    queryFn: async (): Promise<Intervallo[]> => {
      const [{ data: pren, error: e1 }, { data: rich, error: e2 }] = await Promise.all([
        supabase
          .from('prenotazioni')
          .select('inizio, fine')
          .eq('allenatore_id', istruttoreId)
          .gte('fine', new Date().toISOString()),
        supabase
          .from('richieste_lezione')
          .select('inizio, fine')
          .eq('istruttore_id', istruttoreId)
          .in('stato', ['in_attesa', 'accettata']),
      ])
      if (e1) throw e1
      if (e2) throw e2
      return [...(pren ?? []), ...(rich ?? [])] as Intervallo[]
    },
  })
}

// Richieste ricevute da un istruttore (per la tab Lezioni).
export function useRichiesteRicevute(istruttoreId: string | undefined) {
  const qc = useQueryClient()
  const queryKey = ['richieste_lezione_ricevute', istruttoreId]

  const query = useQuery({
    queryKey,
    enabled: !!istruttoreId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('richieste_lezione')
        .select('*')
        .eq('istruttore_id', istruttoreId)
        .order('creato_il', { ascending: false })
      if (error) throw error
      return (data ?? []) as RichiestaLezione[]
    },
  })

  const ricarica = () => qc.invalidateQueries({ queryKey })

  const accetta = useMutation({
    mutationFn: async ({ richiesta, campo }: { richiesta: RichiestaLezione; campo: Campo }) => {
      // Un istruttore semplice non ha (né deve avere) permesso RLS diretto per
      // creare una prenotazione a nome di un altro socio: la funzione
      // security-definer fa le tre scritture insieme, verificando che sia
      // davvero lui il destinatario della richiesta.
      const { error } = await supabase.rpc('accetta_richiesta_lezione', {
        p_richiesta_id: richiesta.id,
        p_campo_id: Number(campo.id),
      })
      if (error) throw error

      supabase.functions
        .invoke('invia-push', {
          body: {
            socio_id: richiesta.socio_id,
            titolo: 'Lezione confermata',
            corpo: `L'istruttore ha accettato la tua richiesta di lezione su ${campo.nome}.`,
            url: '/profilo?sezione=riepilogo',
          },
        })
        .catch(() => {})
    },
    onSuccess: ricarica,
  })

  const rifiuta = useMutation({
    mutationFn: async (richiesta: RichiestaLezione) => {
      const { error } = await supabase
        .from('richieste_lezione')
        .update({ stato: 'rifiutata' })
        .eq('id', richiesta.id)
      if (error) throw error

      supabase.functions
        .invoke('invia-push', {
          body: {
            socio_id: richiesta.socio_id,
            titolo: 'Richiesta di lezione rifiutata',
            corpo: "L'istruttore non ha potuto accettare la tua richiesta di lezione.",
            url: '/profilo?sezione=riepilogo',
          },
        })
        .catch(() => {})
    },
    onSuccess: ricarica,
  })

  return {
    richieste: query.data ?? [],
    caricamento: query.isLoading,
    errore: query.error,
    accetta,
    rifiuta,
  }
}

// Invio di una nuova richiesta (lato socio), dalla scheda istruttore in Club.
export function useInviaRichiestaLezione(socioId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dati: { istruttoreId: string; sport: Sport; inizio: string; fine: string }) => {
      if (!socioId) throw new Error('Utente non autenticato')
      const { error } = await supabase.from('richieste_lezione').insert({
        socio_id: socioId,
        istruttore_id: dati.istruttoreId,
        sport: dati.sport,
        inizio: dati.inizio,
        fine: dati.fine,
      })
      if (error) throw error

      supabase.functions
        .invoke('invia-push', {
          body: {
            socio_id: dati.istruttoreId,
            titolo: 'Nuova richiesta di lezione',
            corpo: 'Un socio ha richiesto una lezione privata. Vai su Profilo → Lezioni per rispondere.',
            url: '/profilo?sezione=lezioni',
          },
        })
        .catch(() => {})
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['richieste_lezione_inviate', socioId] }),
  })
}

// Richieste inviate da un socio (per mostrare quelle in attesa in Riepilogo).
export function useRichiesteInviate(socioId: string | undefined) {
  return useQuery({
    queryKey: ['richieste_lezione_inviate', socioId],
    enabled: !!socioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('richieste_lezione')
        .select('*')
        .eq('socio_id', socioId)
        .order('creato_il', { ascending: false })
      if (error) throw error
      return (data ?? []) as RichiestaLezione[]
    },
  })
}

// Campi liberi di uno sport in un intervallo (per il campo-picker all'accettazione).
export async function campiLiberi(sport: Sport, inizio: string, fine: string): Promise<Campo[]> {
  const { data: campi, error: errCampi } = await supabase
    .from('campi')
    .select('*')
    .eq('sport', sport)
    .eq('in_servizio', true)
  if (errCampi) throw errCampi
  const idCampi = (campi ?? []).map((c) => c.id)
  if (idCampi.length === 0) return []

  const { data: occupati, error: errOcc } = await supabase
    .from('prenotazioni')
    .select('campo_id')
    .in('campo_id', idCampi)
    .lt('inizio', fine)
    .gt('fine', inizio)
  if (errOcc) throw errOcc

  const occupatiSet = new Set((occupati ?? []).map((o) => o.campo_id))
  return (campi ?? []).filter((c) => !occupatiSet.has(c.id)) as Campo[]
}
