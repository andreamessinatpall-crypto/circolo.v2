import { useState, type ReactNode } from 'react'
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

// Un blocco compatto per sport: intestazione + righe Azione / Punti / Crediti
// su una griglia a 3 colonne, così le caselle restano allineate e strette.
function BloccoSport({ icona, nome, children }: { icona: string; nome: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-sm font-semibold text-verde-800">
        {icona} {nome}
      </div>
      <div className="grid grid-cols-[1fr_4rem_4rem] items-center gap-x-2 gap-y-1.5">
        <span />
        <span className="text-center text-xs font-medium text-ink-3">Punti</span>
        <span className="text-center text-xs font-medium text-ink-3">Crediti</span>
        {children}
      </div>
    </div>
  )
}

// Una riga della griglia: etichetta azione + casella punti + casella crediti.
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
  const classeInput = '!mt-0 w-full px-2 py-1.5 text-center'
  return (
    <>
      <label htmlFor={`${idBase}-punti`} className="text-sm text-ink">
        {etichetta}
      </label>
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
    </>
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
      <BloccoSport icona="🎾" nome="Padel">
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

      <BloccoSport icona="⚽" nome="Calcio">
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

      <button type="submit" className="btn !mt-1" disabled={salva.isPending}>
        Salva valori
      </button>
      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </form>
  )
}
