import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { useCampi, usePrenotazioniGiorno } from '@/features/prenotazioni/datiPrenotazioni'
import { dataDa, oraLocale, orariCampo, SLOT_MINUTI, ymd } from '@/features/prenotazioni/orari'
import { formatNomeAmericano } from './americano'
import { SPORT_LABEL } from './tipi'
import type { AmericanoPartita, Torneo } from './tipi'

export function BottoneProgrammaAmericano({
  torneo,
  m,
  nomi,
  sociBySquadra,
  etichetta = 'Programma',
}: {
  torneo: Torneo
  m: AmericanoPartita
  nomi: Record<string, string>
  sociBySquadra: Record<string, string | null>
  etichetta?: string
}) {
  const [aperto, setAperto] = useState(false)
  return (
    <>
      <button
        type="button"
        className="btn btn-mini btn-secondario"
        onClick={() => setAperto(true)}
      >
        {etichetta}
      </button>
      {aperto &&
        createPortal(
          <ModaleProgrammaAmericano
            torneo={torneo}
            m={m}
            nomi={nomi}
            sociBySquadra={sociBySquadra}
            onChiudi={() => setAperto(false)}
          />,
          document.body,
        )}
    </>
  )
}

export function BottoneAnnullaProgrammazioneAmericano({ m }: { m: AmericanoPartita }) {
  const qc = useQueryClient()
  const annulla = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('prenotazioni')
        .delete()
        .eq('americano_partita_id', m.id)
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
        if (window.confirm('Annullare la programmazione? La prenotazione collegata verrà rimossa.'))
          annulla.mutate()
      }}
    >
      Annulla programmazione
    </button>
  )
}

function ModaleProgrammaAmericano({
  torneo,
  m,
  nomi,
  sociBySquadra,
  onChiudi,
}: {
  torneo: Torneo
  m: AmericanoPartita
  nomi: Record<string, string>
  sociBySquadra: Record<string, string | null>
  onChiudi: () => void
}) {
  const qc = useQueryClient()
  const campiQuery = useCampi()
  const durataMn = torneo.durata_minuti ?? SLOT_MINUTI

  const campiSport = (campiQuery.data ?? []).filter(
    (c) => c.sport === torneo.sport && c.in_servizio !== false,
  )

  const oggi = ymd(new Date())
  const [campoId, setCampoId] = useState('')
  const [giorno, setGiorno] = useState(oggi)
  const [ora, setOra] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const campo = campiSport.find((c) => String(c.id) === campoId) ?? campiSport[0]
  const prenGiorno = usePrenotazioniGiorno(giorno)

  const occupati = new Set(
    (prenGiorno.data ?? [])
      .filter((p) => campo && String(p.campo_id) === String(campo.id))
      .map((p) => new Date(p.inizio).getTime()),
  )
  const slot = campo
    ? orariCampo(campo, durataMn).filter((o) => !occupati.has(dataDa(giorno, o).getTime()))
    : []

  const n = (id: number | string) => formatNomeAmericano(nomi[String(id)] ?? '?')

  const salva = useMutation({
    mutationFn: async () => {
      if (!campo || !ora) throw new Error('Scegli un campo e un orario.')
      const inizio = dataDa(giorno, ora)
      const fine = new Date(inizio.getTime() + durataMn * 60000)

      await supabase.from('prenotazioni').delete().eq('americano_partita_id', m.id)

      const { data, error } = await supabase
        .from('prenotazioni')
        .insert({
          campo_id: campo.id,
          socio_id: (await supabase.auth.getUser()).data.user?.id,
          inizio: inizio.toISOString(),
          fine: fine.toISOString(),
          americano_partita_id: m.id,
        })
        .select('id')
        .single()
      if (error) throw error

      // Aggiungi i 4 giocatori come partecipanti (solo quelli registrati).
      const ids = [m.p1_id, m.p2_id, m.p3_id, m.p4_id]
        .map((pid) => sociBySquadra[String(pid)])
        .filter((sid): sid is string => !!sid)

      if (ids.length) {
        await supabase.from('partecipanti_amichevole').upsert(
          ids.map((socio_id) => ({ prenotazione_id: data.id, socio_id, confermato: false })),
          { onConflict: 'prenotazione_id,socio_id', ignoreDuplicates: true },
        )
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tornei'] })
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
      onChiudi()
    },
    onError: (e: unknown) => setMsg(messaggioErrore(e)),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain bg-black/40 p-4"
      onClick={onChiudi}
    >
      <div className="card my-auto max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-xl">Programma partita</h2>
        <p className="sub mb-3">
          {n(m.p1_id)} / {n(m.p2_id)} · Campo {m.campo}
        </p>

        {campiQuery.isLoading ? (
          <p className="sub">Caricamento campi…</p>
        ) : !campiSport.length ? (
          <>
            <p className="msg-errore">
              Nessun campo di {SPORT_LABEL[torneo.sport] ?? torneo.sport} disponibile.
            </p>
            <button type="button" className="btn btn-secondario mt-3" onClick={onChiudi}>
              Chiudi
            </button>
          </>
        ) : (
          <>
            <label>Campo</label>
            <select
              className="campo"
              value={campo ? String(campo.id) : ''}
              onChange={(e) => setCampoId(e.target.value)}
            >
              {campiSport.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.nome}</option>
              ))}
            </select>

            <label>Giorno</label>
            <input
              type="date"
              className="campo"
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
                    : 'Nessuno slot libero'}
              </option>
              {slot.map((o) => (
                <option key={o} value={o}>
                  {o}–{oraLocale(new Date(dataDa(giorno, o).getTime() + durataMn * 60000))}
                </option>
              ))}
            </select>

            {msg && <p className="msg-errore mt-3">{msg}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn"
                disabled={salva.isPending || !ora}
                onClick={() => { setMsg(null); salva.mutate() }}
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
