import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { prenotaSenzaLimite, puoGestirePrenotazioni } from '@/auth/ruoli'
import { dataDa } from './orari'
import type { Campo, Impostazioni, PrenotazioneGiorno, Sport } from './tipi'

// Regole di prenotazione (tollerante: se le colonne nuove mancano, usa i default).
export function useImpostazioni() {
  return useQuery({
    queryKey: ['impostazioni'],
    queryFn: async (): Promise<Impostazioni> => {
      let res = await supabase
        .from('impostazioni')
        .select('giorni_anticipo, max_pren_padel, max_pren_calcio')
        .eq('id', 1)
        .maybeSingle()
      if (res.error) {
        res = await supabase
          .from('impostazioni')
          .select('giorni_anticipo')
          .eq('id', 1)
          .maybeSingle()
      }
      const d = (res.data ?? {}) as Record<string, unknown>
      const ga = Number(d.giorni_anticipo)
      const mp = Number(d.max_pren_padel)
      const mc = Number(d.max_pren_calcio)
      return {
        giorniAnticipo: Number.isFinite(ga) ? ga : 6,
        maxPadel: Number.isFinite(mp) ? mp : 0,
        maxCalcio: Number.isFinite(mc) ? mc : 0,
      }
    },
  })
}

export function useCampi() {
  return useQuery({
    queryKey: ['campi'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campi').select('*').order('ordine')
      if (error) throw error
      return (data ?? []) as Campo[]
    },
  })
}

// Prenotazioni del giorno selezionato (tutti i campi); filtreremo per sport in pagina.
export function usePrenotazioniGiorno(giorno: string) {
  return useQuery({
    queryKey: ['prenotazioni', giorno],
    queryFn: async () => {
      const alba = dataDa(giorno, '00:00')
      const tramonto = new Date(alba.getTime() + 24 * 60 * 60 * 1000)
      const { data, error } = await supabase.rpc('prenotazioni_giorno', {
        alba: alba.toISOString(),
        tramonto: tramonto.toISOString(),
      })
      if (error) throw error
      return (data ?? []) as PrenotazioneGiorno[]
    },
  })
}

// Prenota un campo: controlla il limite di prenotazioni attive del socio (0 =
// nessun limite; staff esente), poi crea la riga in `prenotazioni` e, per le
// partite (non allenamenti), aggiunge subito il prenotante ai partecipanti.
// Condiviso da GrigliaPrenotazioni (vista staff) e PrenotaWizard (vista
// giocatore) così il limite e la gestione errori restano in un solo posto.
export function usePrenotaCampo(sport: Sport, campiSport: Campo[], imp: Impostazioni) {
  const { profilo } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campo,
      inizio,
      fine,
      allenamento,
      amicoId,
    }: {
      campo: Campo
      inizio: Date
      fine: Date
      allenamento: boolean
      amicoId?: string | null
    }) => {
      if (!profilo) throw new Error('Profilo non disponibile')
      const limite = sport === 'padel' ? imp.maxPadel : imp.maxCalcio
      const senzaLimite = prenotaSenzaLimite(profilo)
      if (limite > 0 && !senzaLimite) {
        const idCampiSport = campiSport.map((c) => c.id)
        const { count } = await supabase
          .from('prenotazioni')
          .select('id', { count: 'exact', head: true })
          .eq('socio_id', profilo.id)
          .eq('allenamento', false)
          .in('campo_id', idCampiSport)
          .gte('fine', new Date().toISOString())
        if (count != null && count >= limite) throw new Error(`LIMITE:${count}:${limite}`)
      }
      const dati: Record<string, unknown> = {
        campo_id: campo.id,
        socio_id: profilo.id,
        inizio: inizio.toISOString(),
        fine: fine.toISOString(),
      }
      if (allenamento) {
        dati.allenamento = true
        // Chi è istruttore (o gestisce le prenotazioni) si auto-assegna come
        // istruttore dell'allenamento, così gli compare nella vista Lezioni.
        if (profilo.e_allenatore || puoGestirePrenotazioni(profilo)) dati.allenatore_id = profilo.id
      }
      const { data: creata, error } = await supabase
        .from('prenotazioni')
        .insert(dati)
        .select('id')
        .single()
      if (error) throw error
      // Nelle partite normali il prenotante è subito tra i giocatori.
      if (!allenamento && creata) {
        const righe: { prenotazione_id: number; socio_id: string; confermato: boolean }[] = [
          { prenotazione_id: creata.id, socio_id: profilo.id, confermato: false },
        ]
        if (amicoId) {
          righe.push({ prenotazione_id: creata.id, socio_id: amicoId, confermato: false })
        }
        await supabase
          .from('partecipanti_amichevole')
          .upsert(righe, { onConflict: 'prenotazione_id,socio_id', ignoreDuplicates: true })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
      qc.invalidateQueries({ queryKey: ['amichevoli'] })
    },
    onError: (e: unknown) => {
      const err = e as { code?: string; message?: string }
      if (err.message?.startsWith('LIMITE:')) {
        const [, c, l] = err.message.split(':')
        window.alert(
          `Hai già ${c} prenotazioni ${sport} attive: il limite è ${l}. Annullane una per prenotare di nuovo.`,
        )
      } else if (err.code === '23505') {
        window.alert('Qualcuno ha appena prenotato questo slot.')
      } else if (err.code === '42501') {
        window.alert(
          `Prenotazione non consentita: si può prenotare solo entro ${imp.giorniAnticipo} giorni e per orari futuri.`,
        )
      } else {
        window.alert('Prenotazione non riuscita: ' + (err.message ?? ''))
      }
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
    },
  })
}
