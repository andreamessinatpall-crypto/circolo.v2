import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { salvaValoriPunti, useValoriPunti, type ValoriPunti as Valori } from './datiPunti'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

// (Fase 8d · blocco 1) Segreteria · valori di punti e crediti per ogni azione.
export default function ValoriPunti() {
  const { data, isLoading, error } = useValoriPunti()

  return (
    <div>
      <div className="eyebrow">Valori di punti e crediti</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          Quanti <strong>punti</strong> e quanti <strong>crediti</strong> vale ciascuna azione,
          distinti per Padel e Calcio. I crediti si accreditano solo a modalità premi accesa e
          dentro gli intervalli.
        </p>
        {isLoading ? (
          <p className="text-ink-2">Caricamento…</p>
        ) : error ? (
          <p className={classiErrore}>Impossibile caricare i valori: {error.message}</p>
        ) : data ? (
          <FormValori valori={data} />
        ) : null}
      </div>
    </div>
  )
}

// Una riga = un'azione, con due caselle affiancate: Punti e Crediti.
function RigaValore({
  etichetta,
  idBase,
  punti,
  setPunti,
  crediti,
  setCrediti,
}: {
  etichetta: string
  idBase: string
  punti: string
  setPunti: (v: string) => void
  crediti: string
  setCrediti: (v: string) => void
}) {
  return (
    <div className="mb-3">
      <div className="etichetta !mb-1">{etichetta}</div>
      <div className="flex flex-wrap gap-4">
        <label className="block">
          <span className="mb-1 block text-sm text-ink-2">Punti</span>
          <input
            id={`${idBase}-punti`}
            type="number"
            min={0}
            max={100000}
            inputMode="numeric"
            required
            className="!mt-0 !w-28"
            value={punti}
            onChange={(e) => setPunti(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-ink-2">Crediti</span>
          <input
            id={`${idBase}-crediti`}
            type="number"
            min={0}
            max={100000}
            inputMode="numeric"
            required
            className="!mt-0 !w-28"
            value={crediti}
            onChange={(e) => setCrediti(e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

function FormValori({ valori }: { valori: Valori }) {
  const qc = useQueryClient()
  // Punti
  const [partitaPadel, setPartitaPadel] = useState(String(valori.partitaPadel))
  const [allenamentoPadel, setAllenamentoPadel] = useState(String(valori.allenamentoPadel))
  const [partitaCalcio, setPartitaCalcio] = useState(String(valori.partitaCalcio))
  const [allenamentoCalcio, setAllenamentoCalcio] = useState(String(valori.allenamentoCalcio))
  // Crediti
  const [crPartitaPadel, setCrPartitaPadel] = useState(String(valori.creditiPartitaPadel))
  const [crAllenamentoPadel, setCrAllenamentoPadel] = useState(String(valori.creditiAllenamentoPadel))
  const [crPartitaCalcio, setCrPartitaCalcio] = useState(String(valori.creditiPartitaCalcio))
  const [crAllenamentoCalcio, setCrAllenamentoCalcio] = useState(String(valori.creditiAllenamentoCalcio))
  const [msg, setMsg] = useState<Esito>(null)

  const salva = useMutation({
    mutationFn: async () => {
      const campi = {
        partitaPadel,
        allenamentoPadel,
        partitaCalcio,
        allenamentoCalcio,
        creditiPartitaPadel: crPartitaPadel,
        creditiAllenamentoPadel: crAllenamentoPadel,
        creditiPartitaCalcio: crPartitaCalcio,
        creditiAllenamentoCalcio: crAllenamentoCalcio,
      }
      const numeri: Record<string, number> = {}
      for (const [k, v] of Object.entries(campi)) {
        const n = parseInt(v, 10)
        if (!Number.isInteger(n) || n < 0)
          throw new Error('Inserisci numeri interi ≥ 0 in tutti i campi.')
        numeri[k] = n
      }
      const esito = await salvaValoriPunti(numeri as unknown as Valori)
      if (!esito.ok)
        throw new Error(
          esito.mancaPermesso
            ? 'Permesso negato dal database: solo un amministratore può modificare i valori.'
            : esito.mancaScript
              ? 'Mancano delle colonne: esegui su Supabase lo script tappa14-valori-crediti.sql (valori crediti) e, se serve, tappa6-pannello-admin.sql (valori punti per sport).'
              : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''),
        )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['valori-punti'] })
      setMsg({ tipo: 'ok', testo: 'Valori di punti e crediti salvati.' })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setMsg(null)
        salva.mutate()
      }}
    >
      <div className="eyebrow !mt-2 !mb-2">🎾 Padel</div>
      <RigaValore
        etichetta="Partita giocata"
        idBase="pc-partita-padel"
        punti={partitaPadel}
        setPunti={setPartitaPadel}
        crediti={crPartitaPadel}
        setCrediti={setCrPartitaPadel}
      />
      <RigaValore
        etichetta="Presenza a un allenamento"
        idBase="pc-allenamento-padel"
        punti={allenamentoPadel}
        setPunti={setAllenamentoPadel}
        crediti={crAllenamentoPadel}
        setCrediti={setCrAllenamentoPadel}
      />

      <div className="eyebrow !mb-2">⚽ Calcio</div>
      <RigaValore
        etichetta="Partita giocata"
        idBase="pc-partita-calcio"
        punti={partitaCalcio}
        setPunti={setPartitaCalcio}
        crediti={crPartitaCalcio}
        setCrediti={setCrPartitaCalcio}
      />
      <RigaValore
        etichetta="Presenza a un allenamento"
        idBase="pc-allenamento-calcio"
        punti={allenamentoCalcio}
        setPunti={setAllenamentoCalcio}
        crediti={crAllenamentoCalcio}
        setCrediti={setCrAllenamentoCalcio}
      />

      <button type="submit" className="btn mt-4" disabled={salva.isPending}>
        Salva valori
      </button>
      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </form>
  )
}
