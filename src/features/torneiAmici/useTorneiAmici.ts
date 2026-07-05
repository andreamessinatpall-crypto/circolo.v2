import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { incontroDisputato } from '@/features/tornei/calendario'
import type { Incontro } from '@/features/tornei/tipi'
import { generaCalendarioIniziale } from './generaIncontri'
import { prossimeRigheEliminazioneAmici } from './eliminazioneAmici'
import type {
  FormatoTorneoAmici,
  IncontroAmici,
  PartecipanteTorneoAmici,
  SetPunteggioAmici,
  SquadraAmici,
  TorneoAmici,
} from './tipi'
import type { Sport } from '@/features/prenotazioni/tipi'

function invia(body: Record<string, unknown>) {
  supabase.functions.invoke('invia-push', { body }).catch(() => {})
}

// Tornei tra amici in cui sono coinvolto (creatore o partecipante) — la RLS
// filtra già lato server, qui leggiamo tutto quello che il socio può vedere.
// Insieme al torneo, anche i conteggi coppie/partite per la card in elenco
// (stesso schema delle card dei tornei del club: barra di avanzamento partite).
export function useTorneiAmici(socioId: string | undefined) {
  const query = useQuery({
    queryKey: ['tornei_amici', socioId],
    enabled: !!socioId,
    queryFn: async () => {
      const { data, error } = await supabase.from('tornei_amici').select('*').order('creato_il', { ascending: false })
      if (error) throw error
      const tornei = (data ?? []) as TorneoAmici[]

      const idTornei = tornei.map((t) => t.id)
      const perTorneoSquadre: Record<string, number> = {}
      const perTorneoIncontri: Record<string, { totali: number; disputate: number }> = {}
      if (idTornei.length > 0) {
        const [{ data: squadre, error: e2 }, { data: incontri, error: e3 }] = await Promise.all([
          supabase.from('tornei_amici_squadre').select('torneo_amici_id').in('torneo_amici_id', idTornei),
          supabase.from('tornei_amici_incontri').select('torneo_amici_id, punti_casa').in('torneo_amici_id', idTornei),
        ])
        if (e2) throw e2
        if (e3) throw e3
        for (const s of squadre ?? []) {
          perTorneoSquadre[s.torneo_amici_id] = (perTorneoSquadre[s.torneo_amici_id] ?? 0) + 1
        }
        for (const m of incontri ?? []) {
          const cur = perTorneoIncontri[m.torneo_amici_id] ?? { totali: 0, disputate: 0 }
          cur.totali += 1
          if (m.punti_casa != null) cur.disputate += 1
          perTorneoIncontri[m.torneo_amici_id] = cur
        }
      }

      return { tornei, perTorneoSquadre, perTorneoIncontri }
    },
  })
  return {
    tornei: query.data?.tornei ?? [],
    perTorneoSquadre: query.data?.perTorneoSquadre ?? {},
    perTorneoIncontri: query.data?.perTorneoIncontri ?? {},
    caricamento: query.isLoading,
    errore: query.error,
  }
}

// Crea il torneo (solo il creatore entra subito come partecipante): gli
// amici si aggiungono in un secondo momento con "+ Invita altri amici", non
// in fase di creazione.
export function useCreaTorneoAmici(profiloId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dati: {
      nome: string
      sport: Sport
      formato: FormatoTorneoAmici
      andataRitorno: boolean
      finaleSecca: boolean
      terzoPosto: boolean
    }) => {
      if (!profiloId) throw new Error('Utente non autenticato')
      const { data: torneo, error: errTorneo } = await supabase
        .from('tornei_amici')
        .insert({
          creatore_id: profiloId,
          nome: dati.nome,
          sport: dati.sport,
          formato: dati.formato,
          andata_ritorno: dati.andataRitorno,
          // Finale secca e 3°/4° posto hanno senso solo in eliminazione diretta.
          finale_secca: dati.formato === 'eliminazione' ? dati.finaleSecca : false,
          terzo_posto: dati.formato === 'eliminazione' ? dati.terzoPosto : false,
        })
        .select('*')
        .single()
      if (errTorneo) throw errTorneo

      const { error: errPart } = await supabase
        .from('tornei_amici_partecipanti')
        .insert({ torneo_amici_id: torneo.id, socio_id: profiloId, stato_invito: 'accettata' as const })
      if (errPart) throw errPart

      return torneo as TorneoAmici
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei_amici', profiloId] }),
  })
}

// Aggiunge altri amici a un torneo già creato (finché è ancora in
// formazione, prima di aver formato le coppie e avviato il calendario) —
// entrano subito, senza dover accettare un invito.
export function useInvitaAltriAmiciTorneo(torneoId: string, nomeTorneo: string, nomeCreatore: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (amiciIds: string[]) => {
      const righe = amiciIds.map((id) => ({
        torneo_amici_id: torneoId,
        socio_id: id,
        stato_invito: 'accettata' as const,
      }))
      const { error } = await supabase.from('tornei_amici_partecipanti').insert(righe)
      if (error) throw error

      for (const id of amiciIds) {
        invia({
          socio_id: id,
          titolo: 'Torneo tra amici',
          corpo: `${nomeCreatore} ti ha aggiunto al torneo "${nomeTorneo}".`,
          url: '/tornei',
        })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei_amici_dettaglio', torneoId] }),
  })
}

// Dettaglio completo di un torneo: partecipanti, squadre, incontri, e le
// eventuali prenotazioni già collegate a ciascun incontro.
export function useDettaglioTorneoAmici(torneoId: string | undefined) {
  const qc = useQueryClient()
  const queryKey = ['tornei_amici_dettaglio', torneoId]

  const query = useQuery({
    queryKey,
    enabled: !!torneoId,
    queryFn: async () => {
      const [
        { data: torneo, error: e1 },
        { data: partecipanti, error: e2 },
        { data: squadre, error: e3 },
        { data: incontri, error: e4 },
      ] = await Promise.all([
        supabase.from('tornei_amici').select('*').eq('id', torneoId!).single(),
        supabase.from('tornei_amici_partecipanti').select('*').eq('torneo_amici_id', torneoId!),
        supabase.from('tornei_amici_squadre').select('*').eq('torneo_amici_id', torneoId!),
        supabase.from('tornei_amici_incontri').select('*').eq('torneo_amici_id', torneoId!).order('round'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4

      const idIncontri = (incontri ?? []).map((m) => m.id)
      let prenotazioni: { id: string; torneo_amici_incontro_id: string; inizio: string; fine: string }[] = []
      if (idIncontri.length > 0) {
        const { data: pren, error: e5 } = await supabase
          .from('prenotazioni')
          .select('id, torneo_amici_incontro_id, inizio, fine')
          .in('torneo_amici_incontro_id', idIncontri)
        if (e5) throw e5
        prenotazioni = pren ?? []
      }

      // Un socio può leggere via RLS solo la propria riga in "soci": per i
      // nomi degli altri partecipanti serve la RPC soci_pubblici() (stesso
      // meccanismo usato da useAmici in tutta l'app), non una select diretta.
      const idSoci = new Set((partecipanti ?? []).map((p) => p.socio_id))
      let nomiSoci = new Map<string, string>()
      let puntiSoci = new Map<string, number>()
      if (idSoci.size > 0) {
        const { data: soci, error: e6 } = await supabase.rpc('soci_pubblici')
        if (e6) throw e6
        const sociVisibili = (soci ?? []).filter((s: { id: string }) => idSoci.has(s.id))
        nomiSoci = new Map(sociVisibili.map((s: { id: string; etichetta: string }) => [s.id, s.etichetta]))
        puntiSoci = new Map(sociVisibili.map((s: { id: string; punti: number }) => [s.id, s.punti]))
      }

      return {
        torneo: torneo as TorneoAmici,
        partecipanti: (partecipanti ?? []) as PartecipanteTorneoAmici[],
        squadre: (squadre ?? []) as SquadraAmici[],
        incontri: (incontri ?? []) as IncontroAmici[],
        prenotazioni,
        nomiSoci,
        puntiSoci,
      }
    },
  })

  return { ...query.data, caricamento: query.isLoading, errore: query.error, ricarica: () => qc.invalidateQueries({ queryKey }) }
}

// Forma una coppia fissa: crea la squadra e vi assegna i due partecipanti.
export function useFormaSquadra(torneoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ coppia, nome }: { coppia: [number, number]; nome?: string }) => {
      const { data: squadra, error: errSquadra } = await supabase
        .from('tornei_amici_squadre')
        .insert({ torneo_amici_id: torneoId, nome: nome ?? null })
        .select('*')
        .single()
      if (errSquadra) throw errSquadra

      const { error: errPart } = await supabase
        .from('tornei_amici_partecipanti')
        .update({ squadra_id: squadra.id })
        .in('id', coppia)
      if (errPart) throw errPart
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei_amici_dettaglio', torneoId] }),
  })
}

// Scioglie una coppia già formata (torna a partecipanti liberi).
export function useScioglieSquadra(torneoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (squadraId: string) => {
      await supabase.from('tornei_amici_partecipanti').update({ squadra_id: null }).eq('squadra_id', squadraId)
      const { error } = await supabase.from('tornei_amici_squadre').delete().eq('id', squadraId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei_amici_dettaglio', torneoId] }),
  })
}

// Genera il calendario (girone o eliminazione) e avvia il torneo.
export function useAvviaTorneoAmici(torneoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      formato,
      squadraIds,
      andataRitorno,
    }: {
      formato: FormatoTorneoAmici
      squadraIds: string[]
      andataRitorno: boolean
    }) => {
      const { incontri, bracketSeed } = generaCalendarioIniziale(formato, squadraIds, andataRitorno)

      // Genera prima le partite: se questa scrittura fallisce il torneo resta
      // in stato "creazione" (ripetibile), invece di restare bloccato senza
      // calendario ma già segnato come avviato.
      const righe = incontri.map((m) => ({ torneo_amici_id: torneoId, ...m }))
      const { error: errIncontri } = await supabase.from('tornei_amici_incontri').insert(righe)
      if (errIncontri) throw errIncontri

      const { error } = await supabase
        .from('tornei_amici')
        .update({ stato: 'in_corso', ...(bracketSeed ? { bracket_seed: bracketSeed } : {}) })
        .eq('id', torneoId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei_amici_dettaglio', torneoId] }),
  })
}

// Inserisce il risultato di una partita (uno qualsiasi dei 4 giocatori
// coinvolti può farlo, nessuna validazione incrociata). Per l'eliminazione,
// se il turno si completa genera subito il turno successivo — stesso
// meccanismo usato dai tornei ufficiali (TabelloneEliminazione.tsx).
export function useInserisciRisultatoAmici(torneo: TorneoAmici, incontriAttuali: IncontroAmici[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      incontro,
      puntiCasa,
      puntiOspite,
      setPunteggi,
      giocatori,
    }: {
      incontro: IncontroAmici
      puntiCasa: number
      puntiOspite: number
      setPunteggi?: SetPunteggioAmici[]
      giocatori: string[]
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('tornei_amici_incontri')
        .update({
          punti_casa: puntiCasa,
          punti_ospite: puntiOspite,
          set_punteggi: setPunteggi ?? null,
          data_disputata: new Date().toISOString().slice(0, 10),
          inserito_da: userData.user?.id ?? null,
        })
        .eq('id', incontro.id)
      if (error) throw error

      const aggiornato: IncontroAmici = {
        ...incontro,
        punti_casa: puntiCasa,
        punti_ospite: puntiOspite,
        set_punteggi: setPunteggi ?? null,
      }
      const incontriAgg = incontriAttuali.map((m) => (m.id === incontro.id ? aggiornato : m))

      if (torneo.formato === 'eliminazione' && torneo.bracket_seed) {
        const righe = prossimeRigheEliminazioneAmici(
          torneo.bracket_seed,
          incontriAgg as unknown as Incontro[],
          aggiornato as unknown as Incontro,
          { andataRitorno: torneo.andata_ritorno, finaleSecca: torneo.finale_secca, terzoPosto: torneo.terzo_posto },
        )
        if (righe.length) {
          await supabase.from('tornei_amici_incontri').insert(righe.map((r) => ({ torneo_amici_id: torneo.id, ...r })))
        }
      }

      for (const socioId of giocatori) {
        invia({
          socio_id: socioId,
          titolo: 'Risultato inserito',
          corpo: `È stato inserito il risultato della tua partita in "${torneo.nome}": ${puntiCasa}-${puntiOspite}.`,
          url: '/profilo?sezione=amici',
        })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei_amici_dettaglio', torneo.id] }),
  })
}

// Chiude (concluso, resta visibile) o elimina definitivamente il torneo — solo il creatore.
// Il creatore può passare avanti e indietro tra "In corso" e "Concluso"
// quando vuole (non è un'azione a senso unico come "chiudi").
export function useCambiaStatoTorneoAmici(torneoId: string, profiloId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stato: 'in_corso' | 'concluso') => {
      const { error } = await supabase.from('tornei_amici').update({ stato }).eq('id', torneoId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tornei_amici', profiloId] })
      qc.invalidateQueries({ queryKey: ['tornei_amici_dettaglio', torneoId] })
    },
  })
}

export function useEliminaTorneoAmici(profiloId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (torneoId: string) => {
      const { error } = await supabase.from('tornei_amici').delete().eq('id', torneoId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei_amici', profiloId] }),
  })
}

// Prenota una partita del torneo su un campo vero (RPC: aggancia i 4
// giocatori delle due squadre come partecipanti_amichevole).
export async function prenotaIncontroAmici(prenotazioneId: string, incontroId: string) {
  const { error } = await supabase.rpc('prenota_incontro_amici', {
    p_prenotazione: prenotazioneId,
    p_incontro_amici_id: incontroId,
  })
  if (error) throw error
}

// Annulla la prenotazione collegata a una partita del torneo (uno dei 4
// giocatori coinvolti può farlo, vedi RLS "giocatore cancella prenotazione
// incontro amici").
export function useAnnullaPrenotazioneAmici(torneoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (prenotazioneId: string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', prenotazioneId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei_amici_dettaglio', torneoId] }),
  })
}

export { incontroDisputato }
