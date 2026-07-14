import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { IconaCalcio, IconaPadel } from '@/components/IconeSport'
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
          Punti e crediti per ogni azione. I crediti contano solo a modalità premi accesa e dentro
          gli intervalli.
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

const SPORT_CFG = {
  padel: {
    label: 'Padel',
    colore: '#0d92ad',
    icona: <IconaPadel />,
  },
  calcio: {
    label: 'Calcio',
    colore: 'var(--color-verde-600)',
    icona: <IconaCalcio />,
  },
} as const

function BloccoSport({ tipo, children }: { tipo: 'padel' | 'calcio'; children: ReactNode }) {
  const cfg = SPORT_CFG[tipo]
  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <div className="flex items-center gap-2 bg-white px-3 py-2">
        <span className="flex h-4 w-4 items-center justify-center" style={{ color: cfg.colore }}>{cfg.icona}</span>
        <span className="text-[0.72rem] font-bold uppercase tracking-[0.1em]" style={{ color: cfg.colore }}>
          {cfg.label}
        </span>
        <span className="ml-auto flex items-center gap-2 text-[11px] font-bold text-ink">
          <span className="w-14 text-center">Punti</span>
          <span className="w-14 text-center">Crediti</span>
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-2.5">{children}</div>
    </div>
  )
}

// Una riga: l'azione a sinistra e le caselle Punti/Crediti a destra, allineate
// (centrate verticalmente) e con il valore centrato nella casella.
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
  const classeInput = 'casella-num !mt-0 w-14 px-1.5 py-1'
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={`${idBase}-punti`} className="text-sm leading-tight text-ink">
        {etichetta}
      </label>
      <div className="flex shrink-0 gap-2">
        <input
          id={`${idBase}-punti`}
          type="number"
          min={0}
          max={100000}
          inputMode="numeric"
          required
          className={classeInput}
          value={punti}
          onChange={(e) => setPunti(e.target.value)}
        />
        <input
          id={`${idBase}-crediti`}
          type="number"
          min={0}
          max={100000}
          inputMode="numeric"
          required
          className={classeInput}
          value={crediti}
          onChange={(e) => setCrediti(e.target.value)}
        />
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
      <div className="grid gap-3 md:grid-cols-2">
        <BloccoSport tipo="padel">
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
        </BloccoSport>

        <BloccoSport tipo="calcio">
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
        </BloccoSport>
      </div>

      <button type="submit" className="btn mt-4" disabled={salva.isPending}>
        Salva valori
      </button>
      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </form>
  )
}
