import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { logoDaFile } from '@/lib/immagini'
import {
  applicaTraguardi,
  LABEL_VARIABILE,
  salvaTraguardi,
  useTraguardi,
  VARIABILI,
  type Sport,
  type Traguardo,
  type VariabileTraguardo,
} from '@/features/profilo/badge/badgeDati'
import SlotImmagine from './SlotImmagine'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

const MSG_PERMESSO =
  'Permesso negato dal database: serve la policy admin sulle impostazioni (script tappa13-campi-rls.sql).'

export default function GestioneTraguardi() {
  const { data, isLoading, error } = useTraguardi()

  return (
    <div>
      <div className="eyebrow">Traguardi</div>
      <div className="card">
        <p className="sub m-0 mb-4">
          Configura i traguardi per <strong>Partite giocate</strong>,{' '}
          <strong>Allenamenti fatti</strong>, <strong>Tornei vinti</strong> e{' '}
          <strong>Numero di amici</strong>, separati per Padel e Calcio.
        </p>
        {isLoading ? (
          <p className="text-ink-2">Caricamento…</p>
        ) : error ? (
          <p className={classiErrore}>Impossibile caricare i traguardi: {error.message}</p>
        ) : (
          <EditorTraguardi
            key={(data ?? []).map(t => t.variabile + t.sport + t.soglia).join('|')}
            iniziali={data ?? []}
          />
        )}
      </div>
    </div>
  )
}

interface Riga {
  id: number
  variabile: VariabileTraguardo
  sport: Sport
  soglia: string
  nome: string
  img: string | null
}

function EditorTraguardi({ iniziali }: { iniziali: Traguardo[] }) {
  const qc = useQueryClient()
  const [righe, setRighe] = useState<Riga[]>(() =>
    iniziali.map((t, i) => ({
      id: i,
      variabile: t.variabile,
      sport: t.sport,
      soglia: String(t.soglia),
      nome: t.nome,
      img: t.img,
    })),
  )
  const [msg, setMsg] = useState<Esito>(null)
  const idRef = useRef(iniziali.length || 1)
  const nuovoId = () => idRef.current++

  const aggiungi = (variabile: VariabileTraguardo, sport: Sport) =>
    setRighe(r => [
      ...r,
      { id: nuovoId(), variabile, sport, soglia: '1', nome: '', img: null },
    ])
  const togli = (id: number) => setRighe(r => r.filter(x => x.id !== id))
  const cambia = (id: number, campo: 'nome' | 'soglia' | 'sport', val: string) =>
    setRighe(r => r.map(x => (x.id === id ? { ...x, [campo]: val } : x)))
  const setImg = (id: number, val: string | null) =>
    setRighe(r => r.map(x => (x.id === id ? { ...x, img: val } : x)))

  async function caricaImg(id: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMsg(null)
    try {
      setImg(id, await logoDaFile(file))
    } catch (err) {
      setMsg({ tipo: 'errore', testo: err instanceof Error ? err.message : 'Immagine non valida.' })
    }
  }

  const salva = useMutation({
    mutationFn: async () => {
      const traguardi: Traguardo[] = righe.map(r => ({
        variabile: r.variabile,
        sport: r.sport,
        soglia: Math.max(1, parseInt(r.soglia, 10) || 1),
        nome: r.nome.trim() || LABEL_VARIABILE[r.variabile],
        img: r.img,
      }))
      const esito = await salvaTraguardi(traguardi)
      if (!esito.ok)
        throw new Error(
          esito.mancaPermesso
            ? MSG_PERMESSO
            : esito.mancaScript
              ? 'Manca la colonna badge_livelli: esegui lo script tappa17-livelli-badge.sql su Supabase.'
              : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''),
        )
      return applicaTraguardi(traguardi)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['badge-livelli'] })
      setMsg({ tipo: 'ok', testo: 'Traguardi salvati.' })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div>
      <div className="flex flex-col gap-8">
        {VARIABILI.map(variabile => {
          const gruppo = righe.filter(r => r.variabile === variabile)
          return (
            <div key={variabile}>
              {/* Intestazione sezione */}
              <div className="mb-3 flex items-center gap-2">
                <span className="font-display text-sm font-semibold uppercase tracking-wide text-verde-700">
                  {LABEL_VARIABILE[variabile]}
                </span>
                <div className="flex-1 border-t border-verde-100" />
              </div>

              {/* Righe traguardo */}
              <div className="flex flex-col gap-3">
                {gruppo.length === 0 && (
                  <p className="text-sm italic text-ink-3">Nessun traguardo configurato.</p>
                )}
                {gruppo.map(r => (
                  <div key={r.id} className="flex flex-wrap items-end gap-3">
                    <SlotImmagine
                      etichetta="IMG"
                      img={r.img}
                      colore={r.sport === 'padel' ? '#2E9E6B' : '#E0A83A'}
                      onCarica={e => caricaImg(r.id, e)}
                      onRimuovi={() => {
                        setImg(r.id, null)
                        setMsg(null)
                      }}
                    />
                    <label className="block !my-0">
                      <span className="etichetta !mb-1 whitespace-nowrap">Sport</span>
                      <select
                        className="!mt-0 h-11 w-28"
                        value={r.sport}
                        onChange={e => {
                          cambia(r.id, 'sport', e.target.value)
                          setMsg(null)
                        }}
                      >
                        <option value="padel">Padel</option>
                        <option value="calcio">Calcio</option>
                      </select>
                    </label>
                    <label className="block !my-0 min-w-[8rem] flex-1">
                      <span className="etichetta !mb-1 whitespace-nowrap">Nome</span>
                      <input
                        type="text"
                        maxLength={30}
                        className="!mt-0 h-11 w-full"
                        placeholder={LABEL_VARIABILE[variabile]}
                        value={r.nome}
                        onChange={e => {
                          cambia(r.id, 'nome', e.target.value)
                          setMsg(null)
                        }}
                      />
                    </label>
                    <label className="block !my-0">
                      <span className="etichetta !mb-1 whitespace-nowrap">Numero</span>
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        className="casella-num !mt-0 h-11 w-24"
                        value={r.soglia}
                        onChange={e => {
                          cambia(r.id, 'soglia', e.target.value)
                          setMsg(null)
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      aria-label="Togli traguardo"
                      className="btn btn-pericolo btn-mini !mt-0 flex h-11 w-11 shrink-0 items-center justify-center !px-0 text-base"
                      onClick={() => {
                        togli(r.id)
                        setMsg(null)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Pulsanti aggiungi per questa tipologia */}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondario btn-mini !mt-0"
                  onClick={() => aggiungi(variabile, 'padel')}
                >
                  + Padel
                </button>
                <button
                  type="button"
                  className="btn btn-secondario btn-mini !mt-0"
                  onClick={() => aggiungi(variabile, 'calcio')}
                >
                  + Calcio
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 border-t border-verde-100 pt-4">
        <button
          type="button"
          className="btn !mt-0"
          disabled={salva.isPending}
          onClick={() => {
            setMsg(null)
            salva.mutate()
          }}
        >
          Salva i traguardi
        </button>
      </div>

      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
