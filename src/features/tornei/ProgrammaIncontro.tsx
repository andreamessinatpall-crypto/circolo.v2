import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import { puoGestireTornei } from '@/auth/ruoli'
import { useCampi, usePrenotazioniGiorno } from '@/features/prenotazioni/datiPrenotazioni'
import { dataDa, oraLocale, orariCampo, SLOT_MINUTI, ymd } from '@/features/prenotazioni/orari'
import { nomeSquadraElegante } from './gironi'
import { SPORT_LABEL } from './tipi'
import type { Componente, Incontro, Torneo } from './tipi'

// I titolari da iscrivere alla prenotazione: si esclude la riserva e, nel padel,
// si tengono al massimo i primi 2 (la coppia che gioca davvero).
function titolari(comp: Componente[], sport: 'padel' | 'calcio'): string[] {
  // I componenti manuali (senza socio_id) non possono essere iscritti alla
  // prenotazione, che collega utenti registrati: li si esclude qui.
  const ids = comp
    .filter((c) => c.riserva !== true && c.socio_id)
    .map((c) => c.socio_id as string)
  return sport === 'padel' ? ids.slice(0, 2) : ids
}

// (Fase 6e) Programmazione di un incontro: si crea una prenotazione legata
// all'incontro (campo + giorno + orario) e, con la RPC crea_partecipanti_sfida,
// si aggiungono in automatico i giocatori delle due squadre/coppie.
// Lo stesso flusso serve sia all'organizzatore ("Programma") sia al socio padel
// che organizza la propria partita ("Sfida").

// Bottone che apre la modale di programmazione.
export function BottoneProgramma({
  torneo,
  m,
  nomi,
  compCasa,
  compOspite,
  etichetta,
  classe = 'btn-secondario',
  titolo = 'Programma incontro',
}: {
  torneo: Torneo
  m: Incontro
  nomi: Record<string, string>
  compCasa: Componente[]
  compOspite: Componente[]
  etichetta: string
  classe?: string
  titolo?: string
}) {
  const [aperto, setAperto] = useState(false)
  return (
    <>
      <button
        type="button"
        className={'btn btn-mini ' + classe}
        onClick={() => setAperto(true)}
      >
        {etichetta}
      </button>
      {aperto &&
        createPortal(
          <ModaleProgramma
            torneo={torneo}
            m={m}
            nomi={nomi}
            compCasa={compCasa}
            compOspite={compOspite}
            titolo={titolo}
            onChiudi={() => setAperto(false)}
          />,
          document.body,
        )}
    </>
  )
}

// Bottone per annullare la programmazione (rimuove la prenotazione collegata).
export function BottoneAnnullaProgrammazione({ m }: { m: Incontro }) {
  const qc = useQueryClient()
  const annulla = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('prenotazioni').delete().eq('incontro_id', m.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tornei'] })
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
    },
    onError: (e: unknown) => window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })
  return (
    <button
      type="button"
      className="btn btn-mini btn-pericolo"
      disabled={annulla.isPending}
      onClick={() => {
        if (
          window.confirm(
            'Annullare la programmazione di questo incontro? La prenotazione collegata verrà rimossa.',
          )
        )
          annulla.mutate()
      }}
    >
      Annulla programmazione
    </button>
  )
}

function ModaleProgramma({
  torneo,
  m,
  nomi,
  compCasa,
  compOspite,
  titolo,
  onChiudi,
}: {
  torneo: Torneo
  m: Incontro
  nomi: Record<string, string>
  compCasa: Componente[]
  compOspite: Componente[]
  titolo: string
  onChiudi: () => void
}) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const campiQuery = useCampi()
  const staff = !!profilo && puoGestireTornei(profilo)
  const durataMn = torneo.durata_minuti ?? SLOT_MINUTI

  const campiSport = (campiQuery.data ?? []).filter(
    (c) => c.sport === torneo.sport && c.in_servizio !== false,
  )

  const oggi = ymd(new Date())
  const [campoId, setCampoId] = useState('')
  const [giorno, setGiorno] = useState(oggi)
  const [ora, setOra] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'errore' | 'ok'; testo: string } | null>(null)

  // Campo scelto (il primo disponibile finché l'utente non sceglie).
  const campo = campiSport.find((c) => String(c.id) === campoId) ?? campiSport[0]

  // Prenotazioni del giorno: servono a togliere gli slot già occupati.
  const prenGiorno = usePrenotazioniGiorno(giorno)

  // Staff può programmare anche nel passato; i soci vedono solo slot futuri.
  const adesso = new Date()
  const occupati = new Set(
    (prenGiorno.data ?? [])
      .filter((p) => campo && String(p.campo_id) === String(campo.id))
      .map((p) => new Date(p.inizio).getTime()),
  )
  const slot = campo
    ? orariCampo(campo, durataMn).filter((o) => {
        const inizio = dataDa(giorno, o)
        return (staff || inizio > adesso) && !occupati.has(inizio.getTime())
      })
    : []

  const salva = useMutation({
    mutationFn: async () => {
      if (!campo || !ora) throw new Error('Scegli un campo e un orario disponibile.')
      const inizio = dataDa(giorno, ora)
      const fine = new Date(inizio.getTime() + durataMn * 60000)
      // Se sto riprogrammando, libero prima la vecchia prenotazione collegata.
      await supabase.from('prenotazioni').delete().eq('incontro_id', m.id)
      const { data, error } = await supabase
        .from('prenotazioni')
        .insert({
          campo_id: campo.id,
          socio_id: profilo!.id,
          inizio: inizio.toISOString(),
          fine: fine.toISOString(),
          incontro_id: m.id,
        })
        .select('id')
        .single()
      if (error) throw error
      // Aggiungo in automatico i titolari delle due squadre alla prenotazione.
      // Lo staff li iscrive direttamente (ne ha i permessi); il socio che
      // organizza la propria sfida usa la RPC (così può aggiungere anche gli
      // avversari, che potrebbero non essere suoi amici).
      if (staff) {
        const righe = [
          ...titolari(compCasa, torneo.sport),
          ...titolari(compOspite, torneo.sport),
        ].map((socio_id) => ({ prenotazione_id: data.id, socio_id, confermato: false }))
        if (righe.length) {
          const { error: errP } = await supabase
            .from('partecipanti_amichevole')
            .upsert(righe, { onConflict: 'prenotazione_id,socio_id', ignoreDuplicates: true })
          if (errP) return { avviso: errP } // prenotazione ok, ma giocatori non aggiunti
        }
      } else {
        // La squadra "mia" è quella di cui faccio parte (così la RPC non sbaglia
        // il controllo di appartenenza quando gioco come ospite).
        const miaSquadra = compCasa.some((c) => c.socio_id === profilo?.id)
          ? m.casa_id
          : m.ospite_id
        const avversaria = String(miaSquadra) === String(m.casa_id) ? m.ospite_id : m.casa_id
        const { error: errS } = await supabase.rpc('crea_partecipanti_sfida', {
          p_prenotazione: data.id,
          p_squadra_mia: miaSquadra,
          p_squadra_avv: avversaria,
        })
        if (errS) return { avviso: errS } // prenotazione ok, ma giocatori non aggiunti
      }
      return {}
    },
    onSuccess: (esito) => {
      qc.invalidateQueries({ queryKey: ['tornei'] })
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
      if (esito?.avviso) {
        window.alert(
          mancaRpc(esito.avviso)
            ? 'Incontro programmato, ma per aggiungere i giocatori serve lo script sfida.sql su Supabase.'
            : 'Incontro programmato, ma non ho potuto aggiungere i giocatori: ' +
                messaggioErrore(esito.avviso),
        )
      }
      onChiudi()
    },
    onError: (e: unknown) => {
      const err = e as { code?: string; message?: string }
      const testo =
        err.code === '23505'
          ? 'Quello slot è appena stato occupato: scegline un altro.'
          : err.code === '42501'
            ? 'Programmazione non consentita: lo slot potrebbe essere fuori orario o oltre la finestra di prenotazione.'
            : messaggioErrore(e)
      setMsg({ tipo: 'errore', testo })
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain bg-black/40 p-4"
      onClick={onChiudi}
    >
      <div className="card my-auto max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-xl">{titolo}</h2>
        <p className="sub mb-3">
          {nomeSquadraElegante(nomi[String(m.casa_id)] ?? '?')} vs{' '}
          {nomeSquadraElegante(nomi[String(m.ospite_id)] ?? '?')}
        </p>

        {campiQuery.isLoading ? (
          <p className="sub">Caricamento campi…</p>
        ) : !campiSport.length ? (
          <>
            <p className="msg-errore">
              Nessun campo di {SPORT_LABEL[torneo.sport] ?? torneo.sport} disponibile. Aggiungi o
              riattiva un campo in Segreteria › Campi e orari.
            </p>
            <button type="button" className="btn btn-secondario mt-3" onClick={onChiudi}>
              Chiudi
            </button>
          </>
        ) : (
          <>
            <label>Campo</label>
            <select className="campo" value={campo ? String(campo.id) : ''} onChange={(e) => setCampoId(e.target.value)}>
              {campiSport.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nome}
                </option>
              ))}
            </select>

            <label>Giorno</label>
            <input
              type="date"
              className="campo"
              {...(!staff && { min: oggi })}
              max="9999-12-31"
              value={giorno}
              onChange={(e) => setGiorno(e.target.value)}
            />

            <label>Orario di inizio</label>
            <select className="campo" value={ora} onChange={(e) => setOra(e.target.value)}>
              <option value="">
                {prenGiorno.isLoading
                  ? 'Calcolo slot liberi…'
                  : slot.length
                    ? 'Scegli un orario…'
                    : 'Nessuno slot libero in questo giorno'}
              </option>
              {slot.map((o) => (
                <option key={o} value={o}>
                  {o}–{oraLocale(new Date(dataDa(giorno, o).getTime() + durataMn * 60000))}
                </option>
              ))}
            </select>

            {msg && <p className={'mt-3 ' + (msg.tipo === 'errore' ? 'msg-errore' : 'msg-ok')}>{msg.testo}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn"
                disabled={salva.isPending || !ora}
                onClick={() => {
                  setMsg(null)
                  salva.mutate()
                }}
              >
                {salva.isPending ? 'Salvataggio…' : 'Conferma'}
              </button>
              <button type="button" className="btn btn-secondario" onClick={onChiudi}>
                Annulla
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
