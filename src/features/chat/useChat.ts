import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MessaggioChat {
  id: number
  mittente_id: string
  destinatario_id: string
  testo: string
  creato_il: string
  letto: boolean
}

// Tutti i messaggi (in entrambe le direzioni) del socio corrente. Chiamata
// da più punti contemporaneamente (badge non letti in AmiciProfilo + modale
// aperta): l'aggiornamento realtime NON va qui, ma nel canale unico
// useRealtimeCircolo.ts — due sottoscrizioni con lo stesso nome canale
// andrebbero in conflitto ("cannot add postgres_changes... after subscribe").
function useMessaggiChat(profiloId: string | undefined) {
  const query = useQuery({
    queryKey: ['messaggi_chat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messaggi_chat')
        .select('*')
        .order('creato_il', { ascending: true })
      if (error) throw error
      return (data ?? []) as MessaggioChat[]
    },
    enabled: !!profiloId,
  })

  return { messaggi: query.data ?? [], caricamento: query.isLoading, errore: query.error }
}

export interface Conversazione {
  altroId: string
  ultimo: MessaggioChat
  nonLetti: number
}

// Lista conversazioni: un socio per ogni "altro" con cui esiste almeno uno
// scambio, con ultimo messaggio e conteggio non letti.
export function useConversazioni(profiloId: string | undefined) {
  const { messaggi, caricamento, errore } = useMessaggiChat(profiloId)

  const conversazioni = useMemo<Conversazione[]>(() => {
    if (!profiloId) return []
    const perAltro = new Map<string, MessaggioChat[]>()
    for (const m of messaggi) {
      const altroId = m.mittente_id === profiloId ? m.destinatario_id : m.mittente_id
      if (!perAltro.has(altroId)) perAltro.set(altroId, [])
      perAltro.get(altroId)!.push(m)
    }
    return Array.from(perAltro.entries())
      .map(([altroId, lista]) => ({
        altroId,
        ultimo: lista[lista.length - 1],
        nonLetti: lista.filter((m) => m.destinatario_id === profiloId && !m.letto).length,
      }))
      .sort((a, b) => new Date(b.ultimo.creato_il).getTime() - new Date(a.ultimo.creato_il).getTime())
  }, [messaggi, profiloId])

  const totaleNonLetti = conversazioni.reduce((tot, c) => tot + c.nonLetti, 0)

  return { conversazioni, totaleNonLetti, caricamento, errore }
}

// Singola conversazione con un amico: messaggi in ordine, invio e segna-letti.
export function useConversazione(profiloId: string | undefined, altroId: string | undefined) {
  const qc = useQueryClient()
  const { messaggi, caricamento, errore } = useMessaggiChat(profiloId)

  const conversazione = useMemo(
    () =>
      messaggi.filter(
        (m) =>
          (m.mittente_id === profiloId && m.destinatario_id === altroId) ||
          (m.mittente_id === altroId && m.destinatario_id === profiloId),
      ),
    [messaggi, profiloId, altroId],
  )

  const ricarica = () => qc.invalidateQueries({ queryKey: ['messaggi_chat'] })

  const invia = useMutation({
    mutationFn: async (testo: string) => {
      if (!profiloId || !altroId) throw new Error('Conversazione non valida')
      const { data, error } = await supabase
        .from('messaggi_chat')
        .insert({ mittente_id: profiloId, destinatario_id: altroId, testo })
        .select()
        .single()
      if (error) throw error

      // Push al destinatario (Fase 1): una per ogni messaggio (così non perde
      // nulla se ha l'app chiusa), ma la riga in campanella è al massimo una
      // al giorno per amico (unaVoltaAlGiorno). Se non configurata/non
      // raggiungibile, ignoriamo l'errore: il messaggio resta comunque salvato.
      supabase.functions
        .invoke('invia-push', {
          body: {
            socio_id: altroId,
            titolo: 'Nuovo messaggio',
            corpo: testo.slice(0, 120),
            url: `/profilo?sezione=amici&amico=${profiloId}`,
            unaVoltaAlGiorno: true,
          },
        })
        .catch(() => {})

      return data as MessaggioChat
    },
    // Il mittente vede subito il proprio messaggio: aggiungiamo alla cache la
    // riga vera restituita dall'insert, senza aspettare un refetch/realtime
    // che dipendono dalla pubblicazione realtime della tabella.
    onSuccess: (nuovo) => {
      qc.setQueryData<MessaggioChat[]>(['messaggi_chat'], (precedenti) => [...(precedenti ?? []), nuovo])
    },
  })

  const segnaLetti = useMutation({
    mutationFn: async () => {
      if (!profiloId || !altroId) return
      const { error } = await supabase
        .from('messaggi_chat')
        .update({ letto: true })
        .eq('mittente_id', altroId)
        .eq('destinatario_id', profiloId)
        .eq('letto', false)
      if (error) throw error
    },
    onSuccess: ricarica,
  })

  return { conversazione, caricamento, errore, invia, segnaLetti }
}
