import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import {
  applicaLivelliPunti,
  PALETTE,
  salvaLivelliPunti,
  useLivelliPunti,
  type LivelloPunti,
} from '@/features/profilo/livelliPunti'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

const MSG_PERMESSO =
  'Permesso negato dal database: serve la policy admin sulle impostazioni (script tappa13-campi-rls.sql).'

// (Fase 8e) Segreteria · livelli a punti configurabili.
export default function GestioneLivelli() {
  const { data, isLoading, error } = useLivelliPunti()

  return (
    <div>
      <div className="eyebrow">Livelli a punti</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          I livelli si raggiungono in base ai <strong>punti</strong> raccolti. Il primo livello parte
          sempre da 0.
        </p>
        {isLoading ? (
          <p className="text-ink-2">Caricamento…</p>
        ) : error ? (
          <p className={classiErrore}>Impossibile caricare i livelli: {error.message}</p>
        ) : (
          <EditorLivelli key={(data ?? []).map((l) => l.nome + l.soglia).join('|')} iniziali={data ?? []} />
        )}
      </div>
    </div>
  )
}

interface Riga {
  id: number
  nome: string
  soglia: string
  img: string | null
}

function EditorLivelli({ iniziali }: { iniziali: LivelloPunti[] }) {
  const qc = useQueryClient()
  const [righe, setRighe] = useState<Riga[]>(() =>
    iniziali.map((l, i) => ({
      id: i,
      nome: l.nome,
      soglia: String(l.soglia),
      img: l.img,
    })),
  )
  const [msg, setMsg] = useState<Esito>(null)
  const idRef = useRef(iniziali.length || 1)
  const nuovoId = () => idRef.current++

  const aggiungi = () =>
    setRighe((r) => [
      ...r,
      { id: nuovoId(), nome: `Livello ${r.length + 1}`, soglia: '0', img: null },
    ])
  const togli = (id: number) => setRighe((r) => r.filter((x) => x.id !== id))
  const cambia = (id: number, campo: 'nome' | 'soglia', val: string) =>
    setRighe((r) => r.map((x) => (x.id === id ? { ...x, [campo]: val } : x)))

  const salva = useMutation({
    mutationFn: async () => {
      if (righe.length === 0) throw new Error('Serve almeno un livello.')
      const livelli: LivelloPunti[] = righe.map((r, i) => ({
        nome: r.nome.trim() || 'Livello',
        soglia: Math.max(0, parseInt(r.soglia, 10) || 0),
        colore: PALETTE[i % PALETTE.length],
        img: r.img,
      }))
      const esito = await salvaLivelliPunti(livelli)
      if (!esito.ok)
        throw new Error(
          esito.mancaPermesso
            ? MSG_PERMESSO
            : esito.mancaScript
              ? 'Manca la colonna livelli_punti: esegui lo script tappa17-livelli-badge.sql su Supabase.'
              : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''),
        )
      return applicaLivelliPunti(livelli)
    },
    onSuccess: (puliti) => {
      qc.invalidateQueries({ queryKey: ['livelli-punti'] })
      setMsg({ tipo: 'ok', testo: `Livelli salvati (${puliti.length}).` })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div>
      <div className="flex flex-col gap-4">
        {righe.map((r, i) => (
          <div key={r.id} className="flex flex-wrap items-end gap-3">
            <label className="block !my-0 min-w-[8rem] flex-1">
              <span className="etichetta !mb-1 whitespace-nowrap">Nome</span>
              <input
                type="text"
                maxLength={30}
                className="!mt-0 h-11 w-full"
                value={r.nome}
                onChange={(e) => {
                  cambia(r.id, 'nome', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <label className="block !my-0">
              <span className="etichetta !mb-1 whitespace-nowrap">Punti (soglia)</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="casella-num !mt-0 h-11 w-24"
                value={i === 0 ? '0' : r.soglia}
                disabled={i === 0}
                title={i === 0 ? 'Il primo livello parte sempre da 0' : undefined}
                onChange={(e) => {
                  cambia(r.id, 'soglia', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <button
              type="button"
              aria-label="Togli livello"
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondario !mt-0" onClick={aggiungi}>
          ＋ Aggiungi livello
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
          Salva i livelli
        </button>
      </div>

      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
