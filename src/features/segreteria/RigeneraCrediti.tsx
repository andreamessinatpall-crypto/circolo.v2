import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { messaggioErrore } from '@/lib/errori'
import { useCampi } from '@/features/prenotazioni/datiPrenotazioni'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import type { Sport } from '@/features/prenotazioni/tipi'
import { useValoriPunti } from './datiPunti'
import { useIntervalliCrediti } from './datiIntervalli'
import { rigeneraCrediti } from './rigenera'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

// (Fase 8d · blocco 4) Segreteria · pulsante per rigenerare i crediti delle
// presenze applicando gli intervalli. Sta nella stessa scheda degli intervalli.
export default function RigeneraCrediti() {
  const qc = useQueryClient()
  const valoriQuery = useValoriPunti()
  const modalitaPremiQuery = useModalitaPremi()
  const intervalliQuery = useIntervalliCrediti()
  const campiQuery = useCampi()
  const [msg, setMsg] = useState<Esito>(null)

  const sportDiCampo = useMemo(() => {
    const m = new Map<string, Sport>()
    for (const c of campiQuery.data ?? []) m.set(String(c.id), c.sport)
    return (campoId: number | string) => m.get(String(campoId)) ?? null
  }, [campiQuery.data])

  const rigenera = useMutation({
    mutationFn: async () => {
      if (!valoriQuery.data) throw new Error('Dati non ancora pronti: riprova tra un istante.')
      return rigeneraCrediti(
        valoriQuery.data,
        !!modalitaPremiQuery.data,
        sportDiCampo,
        intervalliQuery.data ?? [],
      )
    },
    onSuccess: ({ presenze }) => {
      qc.invalidateQueries({ queryKey: ['soci'] })
      qc.invalidateQueries({ queryKey: ['saldo-crediti'] })
      qc.invalidateQueries({ queryKey: ['riepilogo-stat'] })
      qc.invalidateQueries({ queryKey: ['storico-movimenti'] })
      setMsg({ tipo: 'ok', testo: `Crediti riallineati su ${presenze} presenze.` })
    },
    onError: (e: unknown) =>
      setMsg({ tipo: 'errore', testo: 'Rigenerazione non riuscita: ' + messaggioErrore(e) }),
  })

  const pronto = !!valoriQuery.data && !rigenera.isPending

  return (
    <div>
      <div className="eyebrow">Rigenera crediti</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          Riallinea i <strong>crediti</strong> delle presenze ai valori e agli intervalli correnti
          (solo a modalità premi accesa). I valori inseriti a mano restano.
        </p>
        <button
          type="button"
          className="btn btn-pericolo !mt-0"
          disabled={!pronto}
          onClick={() => {
            setMsg(null)
            if (window.confirm('Rigenerare i crediti di tutti i soci secondo gli intervalli?'))
              rigenera.mutate()
          }}
        >
          {rigenera.isPending && <span className="spinner-mini" aria-hidden="true" />}
          {rigenera.isPending ? 'Rigenerazione in corso…' : 'Rigenera crediti'}
        </button>
        {rigenera.isPending && (
          <p className="sub mt-2 mb-0">Può richiedere qualche minuto: non chiudere la pagina.</p>
        )}
        {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
      </div>
    </div>
  )
}
