import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { messaggioErrore } from '@/lib/errori'
import { useCampi, usePrenotazioniGiorno } from '@/features/prenotazioni/datiPrenotazioni'
import { dataDa, oraLocale, orariCampo, SLOT_MINUTI, ymd } from '@/features/prenotazioni/orari'
import type { Sport } from '@/features/prenotazioni/tipi'
import { prenotaIncontroAmici } from './useTorneiAmici'

// Programmazione di una partita del torneo tra amici: stesso principio di
// ProgrammaIncontro.tsx per i tornei ufficiali — un modale autonomo con
// campo/giorno/orario, che crea la prenotazione e vi aggancia i 4 giocatori,
// invece di passare dalla griglia prenotazioni condivisa. Lì, per un socio
// normale (non staff), cliccare su uno slot libero prenota subito senza
// aprire nessun modale di scelta: l'aggancio al torneo non veniva mai fatto.

export function BottoneProgrammaAmici({
  sport,
  incontroId,
  etichetta,
  classe = 'btn-mini',
}: {
  sport: Sport
  incontroId: string
  etichetta: string
  classe?: string
}) {
  const [aperto, setAperto] = useState(false)
  return (
    <>
      <button type="button" className={'btn ' + classe} onClick={() => setAperto(true)}>
        {etichetta}
      </button>
      {aperto &&
        createPortal(
          <ModaleProgrammaAmici sport={sport} incontroId={incontroId} onChiudi={() => setAperto(false)} />,
          document.body,
        )}
    </>
  )
}

function ModaleProgrammaAmici({
  sport,
  incontroId,
  onChiudi,
}: {
  sport: Sport
  incontroId: string
  onChiudi: () => void
}) {
  useBloccaScrollBody()
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const campiQuery = useCampi()
  const campiSport = (campiQuery.data ?? []).filter((c) => c.sport === sport && c.in_servizio !== false)

  const oggi = ymd(new Date())
  const [campoId, setCampoId] = useState('')
  const [giorno, setGiorno] = useState(oggi)
  const [ora, setOra] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const campo = campiSport.find((c) => String(c.id) === campoId) ?? campiSport[0]
  const prenGiorno = usePrenotazioniGiorno(giorno)
  const adesso = new Date()
  const occupati = new Set(
    (prenGiorno.data ?? [])
      .filter((p) => campo && String(p.campo_id) === String(campo.id))
      .map((p) => new Date(p.inizio).getTime()),
  )
  const slot = campo
    ? orariCampo(campo, SLOT_MINUTI).filter((o) => {
        const inizio = dataDa(giorno, o)
        return inizio > adesso && !occupati.has(inizio.getTime())
      })
    : []

  const salva = useMutation({
    mutationFn: async () => {
      if (!campo || !ora || !profilo) throw new Error('Scegli un campo e un orario disponibile.')
      const inizio = dataDa(giorno, ora)
      const fine = new Date(inizio.getTime() + SLOT_MINUTI * 60000)
      const { data, error } = await supabase
        .from('prenotazioni')
        .insert({ campo_id: campo.id, socio_id: profilo.id, inizio: inizio.toISOString(), fine: fine.toISOString() })
        .select('id')
        .single()
      if (error) throw error
      try {
        await prenotaIncontroAmici(data.id, incontroId)
      } catch (errAggancio) {
        await supabase.from('prenotazioni').delete().eq('id', data.id)
        throw errAggancio
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tornei_amici_dettaglio'] })
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
      onChiudi()
    },
    onError: (e: unknown) => {
      const err = e as { code?: string; message?: string }
      const testo =
        err.code === '23505'
          ? 'Quello slot è appena stato occupato: scegline un altro.'
          : err.code === '42501'
            ? 'Prenotazione non consentita: lo slot potrebbe essere fuori orario o oltre la finestra di prenotazione.'
            : messaggioErrore(e)
      setMsg(testo)
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain bg-black/40 p-4"
      onClick={onChiudi}
    >
      <div className="card my-auto max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-xl">Prenota questa partita</h2>

        {campiQuery.isLoading ? (
          <p className="sub">Caricamento campi…</p>
        ) : !campiSport.length ? (
          <>
            <p className="msg-errore">Nessun campo disponibile per questo sport.</p>
            <button type="button" className="btn btn-secondario mt-3" onClick={onChiudi}>
              Chiudi
            </button>
          </>
        ) : (
          <>
            <label>Campo</label>
            <select className="campo" value={campo ? String(campo.id) : ''} onChange={(e) => setCampoId(e.target.value)}>
              {campiSport.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.nome}</option>
              ))}
            </select>

            <label>Giorno</label>
            <input
              type="date"
              className="campo"
              min={oggi}
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
                  {o}–{oraLocale(new Date(dataDa(giorno, o).getTime() + SLOT_MINUTI * 60000))}
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
