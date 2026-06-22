import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { messaggioErrore } from '@/lib/errori'
import { useCampi } from '@/features/prenotazioni/datiPrenotazioni'
import { useTornei } from '@/features/tornei/datiTornei'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import type { Sport } from '@/features/prenotazioni/tipi'
import { useValoriPunti } from './datiPunti'
import { rigeneraTuttiIPunti } from './rigenera'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

// (Fase 8d · blocco 2) Segreteria · pulsante per rigenerare i punti.
export default function RigeneraPunti() {
  const qc = useQueryClient()
  const torneiQuery = useTornei()
  const valoriQuery = useValoriPunti()
  const modalitaPremiQuery = useModalitaPremi()
  const campiQuery = useCampi()
  const [msg, setMsg] = useState<Esito>(null)

  const sportDiCampo = useMemo(() => {
    const m = new Map<string, Sport>()
    for (const c of campiQuery.data ?? []) m.set(String(c.id), c.sport)
    return (campoId: number | string) => m.get(String(campoId)) ?? null
  }, [campiQuery.data])

  const rigenera = useMutation({
    mutationFn: async () => {
      if (!torneiQuery.data || !valoriQuery.data)
        throw new Error('Dati non ancora pronti: riprova tra un istante.')
      return rigeneraTuttiIPunti(
        torneiQuery.data,
        valoriQuery.data,
        !!modalitaPremiQuery.data,
        sportDiCampo,
      )
    },
    onSuccess: ({ tornei, presenze }) => {
      qc.invalidateQueries({ queryKey: ['soci'] })
      qc.invalidateQueries({ queryKey: ['saldo-crediti'] })
      qc.invalidateQueries({ queryKey: ['riepilogo-stat'] })
      qc.invalidateQueries({ queryKey: ['storico-movimenti'] })
      setMsg({
        tipo: 'ok',
        testo: `Fatto: rivalutati ${tornei} tornei e ${presenze} presenze ai valori attuali.`,
      })
    },
    onError: (e: unknown) =>
      setMsg({ tipo: 'errore', testo: 'Rigenerazione non riuscita: ' + messaggioErrore(e) }),
  })

  const pronto = !!torneiQuery.data && !!valoriQuery.data && !rigenera.isPending

  return (
    <div>
      <div className="eyebrow">Rigenera punti</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          Ricostruisce i <strong>punti</strong> di tutti i soci dagli eventi reali (tornei e
          presenze) con i valori impostati qui sopra. Riallinea anche i <strong>crediti</strong>{' '}
          delle presenze (solo a modalità premi accesa). I valori inseriti a mano restano.
        </p>
        <button
          type="button"
          className="btn btn-pericolo !mt-0"
          disabled={!pronto}
          onClick={() => {
            setMsg(null)
            if (
              window.confirm(
                'Rigenerare i punti di TUTTI i soci? Ogni evento viene rivalutato con i valori attuali. I crediti delle presenze vengono riallineati. Procedere?',
              )
            )
              rigenera.mutate()
          }}
        >
          {rigenera.isPending ? 'Rigenerazione in corso…' : 'Rigenera punti'}
        </button>
        {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
      </div>
    </div>
  )
}
