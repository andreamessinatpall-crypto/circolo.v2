import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import {
  normalizzaIntervalli,
  salvaIntervalli,
  useIntervalliCrediti,
  type Intervallo,
} from './datiIntervalli'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

const MSG_PERMESSO =
  'Permesso negato dal database: serve la policy admin sulle impostazioni (script tappa13-campi-rls.sql).'

// (Fase 8d · blocco 3) Segreteria · editor degli intervalli crediti. Carica gli
// intervalli salvati e li lascia modificare in righe Dal/Al.
export default function IntervalliCrediti() {
  const { data, isLoading, error } = useIntervalliCrediti()

  return (
    <div>
      <div className="eyebrow">Intervalli per l'accumulo dei crediti</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          I <strong>crediti</strong> contano solo per gli eventi dentro un intervallo. Nessun
          intervallo = nessun limite di date. I punti non sono mai filtrati.
        </p>
        {isLoading ? (
          <p className="text-ink-2">Caricamento…</p>
        ) : error ? (
          <p className={classiErrore}>Impossibile caricare gli intervalli: {error.message}</p>
        ) : (
          // key sui dati: re-inizializza il form quando arrivano/cambiano i dati.
          <EditorIntervalli key={(data ?? []).map((i) => i.da + i.a).join('|')} iniziali={data ?? []} />
        )}
      </div>
    </div>
  )
}

interface Riga {
  id: number
  da: string
  a: string
}

function EditorIntervalli({ iniziali }: { iniziali: Intervallo[] }) {
  const qc = useQueryClient()
  const [righe, setRighe] = useState<Riga[]>(() =>
    iniziali.length
      ? iniziali.map((iv, i) => ({ id: i, da: iv.da, a: iv.a }))
      : [{ id: 0, da: '', a: '' }],
  )
  const [msg, setMsg] = useState<Esito>(null)
  // Prossimo id libero per le righe aggiunte (gli iniziali usano 0..length-1).
  const idRef = useRef(iniziali.length || 1)
  const nuovoId = () => idRef.current++

  const aggiungi = () => setRighe((r) => [...r, { id: nuovoId(), da: '', a: '' }])
  const togli = (id: number) => setRighe((r) => r.filter((x) => x.id !== id))
  const cambia = (id: number, campo: 'da' | 'a', val: string) =>
    setRighe((r) => r.map((x) => (x.id === id ? { ...x, [campo]: val } : x)))

  const salva = useMutation({
    mutationFn: async () => {
      const raccolti: Intervallo[] = []
      for (const r of righe) {
        if (!r.da && !r.a) continue // riga vuota: la ignoro
        if (!r.da || !r.a)
          throw new Error('Ogni intervallo deve avere sia la data di inizio sia quella di fine.')
        if (r.da > r.a)
          throw new Error("In un intervallo la data di inizio non può essere dopo quella di fine.")
        raccolti.push({ da: r.da, a: r.a })
      }
      const esito = await salvaIntervalli(raccolti)
      if (!esito.ok)
        throw new Error(
          esito.mancaPermesso
            ? MSG_PERMESSO
            : esito.mancaScript
              ? 'Per salvare gli intervalli esegui lo script tappa6-pannello-admin.sql su Supabase.'
              : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''),
        )
      return normalizzaIntervalli(raccolti)
    },
    onSuccess: (puliti) => {
      qc.invalidateQueries({ queryKey: ['intervalli-crediti'] })
      setMsg({
        tipo: 'ok',
        testo: puliti.length
          ? `Intervalli salvati (${puliti.length}). Usa “Rigenera punti” qui sotto per applicarli ai crediti già assegnati.`
          : "Nessun intervallo: i crediti non hanno limiti di data (vale solo la modalità premi).",
      })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div>
      <div className="flex flex-col gap-2">
        {righe.map((r) => (
          <div key={r.id} className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="etichetta !mb-1">Dal</span>
              <input
                type="date"
                max="9999-12-31"
                className="campo !mt-0 !w-auto"
                value={r.da}
                onChange={(e) => {
                  cambia(r.id, 'da', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <label className="block">
              <span className="etichetta !mb-1">Al</span>
              <input
                type="date"
                max="9999-12-31"
                className="campo !mt-0 !w-auto"
                value={r.a}
                onChange={(e) => {
                  cambia(r.id, 'a', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-pericolo btn-mini !mt-0"
              onClick={() => {
                togli(r.id)
                setMsg(null)
              }}
            >
              Togli
            </button>
          </div>
        ))}
        {righe.length === 0 && (
          <p className="text-ink-2 text-sm">Nessun intervallo: i crediti non hanno limiti di data.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondario !mt-0" onClick={aggiungi}>
          ＋ Aggiungi intervallo
        </button>
        <button
          type="button"
          className="btn !mt-0"
          disabled={salva.isPending}
          onClick={() => {
            setMsg(null)
            salva.mutate()
          }}
        >
          Salva intervalli
        </button>
      </div>

      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
