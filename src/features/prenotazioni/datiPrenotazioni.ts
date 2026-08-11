import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { useCircolo } from '@/circolo/useCircolo'
import { useMioRuolo } from '@/circolo/useMioRuolo'
import { avviso } from '@/lib/dialoghi'
import { dataDa } from './orari'
import type { Campo, Impostazioni, PrenotazioneGiorno, Sport } from './tipi'

// Regole di prenotazione (tollerante: se le colonne nuove mancano, usa i default).
export function useImpostazioni() {
  const circolo = useCircolo()
  return useQuery({
    queryKey: ['impostazioni', circolo.id],
    queryFn: async (): Promise<Impostazioni> => {
      let res = await supabase
        .from('impostazioni')
        .select(
          'giorni_anticipo, max_pren_padel, max_pren_calcio, max_pren_padel_giorno, max_pren_calcio_giorno',
        )
        .eq('circolo_id', circolo.id)
        .maybeSingle()
      if (res.error) {
        res = await supabase
          .from('impostazioni')
          .select('giorni_anticipo')
          .eq('circolo_id', circolo.id)
          .maybeSingle()
      }
      const d = (res.data ?? {}) as Record<string, unknown>
      const ga = Number(d.giorni_anticipo)
      const mp = Number(d.max_pren_padel)
      const mc = Number(d.max_pren_calcio)
      const mpg = Number(d.max_pren_padel_giorno)
      const mcg = Number(d.max_pren_calcio_giorno)
      return {
        giorniAnticipo: Number.isFinite(ga) ? ga : 6,
        maxPadel: Number.isFinite(mp) ? mp : 0,
        maxCalcio: Number.isFinite(mc) ? mc : 0,
        maxPadelGiorno: Number.isFinite(mpg) ? mpg : 0,
        maxCalcioGiorno: Number.isFinite(mcg) ? mcg : 0,
      }
    },
  })
}

export function useCampi() {
  const circolo = useCircolo()
  return useQuery({
    queryKey: ['campi', circolo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campi')
        .select('*')
        .eq('circolo_id', circolo.id)
        .order('ordine')
      if (error) throw error
      return (data ?? []) as Campo[]
    },
  })
}

// Prenotazioni del giorno selezionato (tutti i campi); filtreremo per sport in pagina.
export function usePrenotazioniGiorno(giorno: string) {
  const circolo = useCircolo()
  return useQuery({
    queryKey: ['prenotazioni', giorno, circolo.id],
    queryFn: async () => {
      const alba = dataDa(giorno, '00:00')
      const tramonto = new Date(alba.getTime() + 24 * 60 * 60 * 1000)
      const { data, error } = await supabase.rpc('prenotazioni_giorno', {
        alba: alba.toISOString(),
        tramonto: tramonto.toISOString(),
        p_circolo_id: circolo.id,
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
  const circolo = useCircolo()
  const { puoGestire } = useMioRuolo()
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
      const limiteGiorno = sport === 'padel' ? imp.maxPadelGiorno : imp.maxCalcioGiorno
      const senzaLimite = puoGestire
      if ((limite > 0 || limiteGiorno > 0) && !senzaLimite) {
        const idCampiSport = campiSport.map((c) => c.id)
        if (limite > 0) {
          const { count } = await supabase
            .from('prenotazioni')
            .select('id', { count: 'exact', head: true })
            .eq('socio_id', profilo.id)
            .eq('allenamento', false)
            .in('campo_id', idCampiSport)
            .gte('fine', new Date().toISOString())
          if (count != null && count >= limite) throw new Error(`LIMITE:${count}:${limite}`)
        }
        if (limiteGiorno > 0) {
          const giornoInizio = new Date(inizio)
          giornoInizio.setHours(0, 0, 0, 0)
          const giornoFine = new Date(giornoInizio.getTime() + 24 * 60 * 60 * 1000)
          const { count } = await supabase
            .from('prenotazioni')
            .select('id', { count: 'exact', head: true })
            .eq('socio_id', profilo.id)
            .eq('allenamento', false)
            .in('campo_id', idCampiSport)
            .gte('inizio', giornoInizio.toISOString())
            .lt('inizio', giornoFine.toISOString())
          if (count != null && count >= limiteGiorno)
            throw new Error(`LIMITEGIORNO:${count}:${limiteGiorno}`)
        }
      }
      const dati: Record<string, unknown> = {
        campo_id: campo.id,
        socio_id: profilo.id,
        inizio: inizio.toISOString(),
        fine: fine.toISOString(),
        circolo_id: circolo.id,
      }
      if (allenamento) {
        dati.allenamento = true
        // Chi gestisce il circolo si auto-assegna come istruttore
        // dell'allenamento, così gli compare nella vista Lezioni.
        if (puoGestire) dati.allenatore_id = profilo.id
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
        avviso(
          `Hai già ${c} prenotazioni ${sport} attive: il limite è ${l}. Annullane una per prenotare di nuovo.`,
        )
      } else if (err.message?.startsWith('LIMITEGIORNO:')) {
        const [, c, l] = err.message.split(':')
        avviso(
          `Hai già ${c} prenotazioni ${sport} in questo giorno: il limite giornaliero è ${l}.`,
        )
      } else if (err.code === '23505') {
        avviso('Qualcuno ha appena prenotato questo slot.')
      } else if (err.code === '42501') {
        avviso(
          `Prenotazione non consentita: si può prenotare solo entro ${imp.giorniAnticipo} giorni e per orari futuri.`,
        )
      } else {
        avviso('Prenotazione non riuscita: ' + (err.message ?? ''))
      }
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
    },
  })
}
