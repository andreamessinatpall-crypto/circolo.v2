import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { SportIcona } from '@/components/IconeSport'
import { etichettaSport } from '@/lib/formato'
import { useCircolo } from '@/circolo/useCircolo'
import { useCampi, sportDisponibili } from '@/features/prenotazioni/datiPrenotazioni'
import type { Sport } from '@/features/prenotazioni/tipi'
import { salvaValoriPunti, useValoriPunti, type ValoriPunti as Valori, type ValoriSport } from './datiPunti'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

// (Fase 8d · blocco 1, estesa Tappa 94) Segreteria · valori di punti e
// crediti per ogni azione, un blocco per ogni sport configurato nel circolo.
export default function ValoriPunti() {
  const { data, isLoading, error } = useValoriPunti()
  const { data: campi } = useCampi()
  const sports = useMemo(() => sportDisponibili(campi ?? []), [campi])

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
          <FormValori valori={data} sports={sports} />
        ) : null}
      </div>
    </div>
  )
}

function BloccoSport({ sport, children }: { sport: Sport; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <div className="flex items-center gap-2 bg-white px-3 py-2">
        <span className="flex h-4 w-4 items-center justify-center"><SportIcona sport={sport} /></span>
        <span className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-ink">
          {etichettaSport(sport)}
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

interface RigheSport {
  partita: string
  allenamento: string
  creditiPartita: string
  creditiAllenamento: string
}

function FormValori({ valori, sports }: { valori: Valori; sports: Sport[] }) {
  const qc = useQueryClient()
  const circolo = useCircolo()
  const [righe, setRighe] = useState<Record<Sport, RigheSport>>(() => {
    const iniziali = {} as Record<Sport, RigheSport>
    for (const s of sports) {
      const v = valori[s]
      iniziali[s] = {
        partita: String(v?.partita ?? 0),
        allenamento: String(v?.allenamento ?? 0),
        creditiPartita: String(v?.creditiPartita ?? 0),
        creditiAllenamento: String(v?.creditiAllenamento ?? 0),
      }
    }
    return iniziali
  })
  const [msg, setMsg] = useState<Esito>(null)

  function aggiorna(sport: Sport, campo: keyof RigheSport, valore: string) {
    setRighe((prev) => ({ ...prev, [sport]: { ...prev[sport], [campo]: valore } }))
  }

  const salva = useMutation({
    mutationFn: async () => {
      const nuoviValori: Valori = {}
      for (const s of sports) {
        const r = righe[s]
        const numeri = [r.partita, r.allenamento, r.creditiPartita, r.creditiAllenamento].map((v) =>
          parseInt(v, 10),
        )
        if (numeri.some((n) => !Number.isInteger(n) || n < 0))
          throw new Error('Inserisci numeri interi ≥ 0 in tutti i campi.')
        const valoriSport: ValoriSport = {
          partita: numeri[0],
          allenamento: numeri[1],
          creditiPartita: numeri[2],
          creditiAllenamento: numeri[3],
        }
        nuoviValori[s] = valoriSport
      }
      const esito = await salvaValoriPunti(nuoviValori, circolo.id)
      if (!esito.ok)
        throw new Error(
          esito.mancaPermesso
            ? 'Permesso negato dal database: solo un amministratore può modificare i valori.'
            : esito.mancaScript
              ? 'Mancano delle colonne: esegui su Supabase lo script tappa94-nuovi-sport-classifica-toggle.sql.'
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
        {sports.map((s) => (
          <BloccoSport key={s} sport={s}>
            <RigaValore
              etichetta="Partita giocata"
              idBase={`pc-partita-${s}`}
              punti={righe[s]?.partita ?? '0'}
              setPunti={(v) => aggiorna(s, 'partita', v)}
              crediti={righe[s]?.creditiPartita ?? '0'}
              setCrediti={(v) => aggiorna(s, 'creditiPartita', v)}
            />
            <RigaValore
              etichetta="Presenza a un allenamento"
              idBase={`pc-allenamento-${s}`}
              punti={righe[s]?.allenamento ?? '0'}
              setPunti={(v) => aggiorna(s, 'allenamento', v)}
              crediti={righe[s]?.creditiAllenamento ?? '0'}
              setCrediti={(v) => aggiorna(s, 'creditiAllenamento', v)}
            />
          </BloccoSport>
        ))}
      </div>

      <button type="submit" className="btn mt-4" disabled={salva.isPending}>
        Salva valori
      </button>
      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </form>
  )
}
