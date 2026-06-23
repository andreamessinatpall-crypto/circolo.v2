import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import {
  applicaLivelliPunti,
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
  colore: string
  emoji: string
}

function EditorLivelli({ iniziali }: { iniziali: LivelloPunti[] }) {
  const qc = useQueryClient()
  const [righe, setRighe] = useState<Riga[]>(() =>
    iniziali.map((l, i) => ({
      id: i,
      nome: l.nome,
      soglia: String(l.soglia),
      colore: l.colore,
      emoji: l.emoji,
    })),
  )
  const [msg, setMsg] = useState<Esito>(null)
  const idRef = useRef(iniziali.length || 1)
  const nuovoId = () => idRef.current++

  const aggiungi = () =>
    setRighe((r) => [
      ...r,
      { id: nuovoId(), nome: `Livello ${r.length + 1}`, soglia: '0', colore: '#2E9E6B', emoji: '🏅' },
    ])
  const togli = (id: number) => setRighe((r) => r.filter((x) => x.id !== id))
  const cambia = (id: number, campo: keyof Omit<Riga, 'id'>, val: string) =>
    setRighe((r) => r.map((x) => (x.id === id ? { ...x, [campo]: val } : x)))

  const salva = useMutation({
    mutationFn: async () => {
      if (righe.length === 0) throw new Error('Serve almeno un livello.')
      const livelli: LivelloPunti[] = righe.map((r) => ({
        nome: r.nome.trim() || 'Livello',
        soglia: Math.max(0, parseInt(r.soglia, 10) || 0),
        colore: r.colore,
        emoji: r.emoji.trim() || '🏅',
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
      <div className="flex flex-col gap-2">
        {righe.map((r, i) => (
          <div key={r.id} className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="etichetta !mb-1">Emoji</span>
              <input
                type="text"
                maxLength={4}
                className="casella-num !mt-0 w-14"
                value={r.emoji}
                onChange={(e) => {
                  cambia(r.id, 'emoji', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <label className="block">
              <span className="etichetta !mb-1">Colore</span>
              <input
                type="color"
                className="!mt-0 h-9 w-12 rounded-lg border border-verde-100 p-1"
                value={r.colore}
                onChange={(e) => {
                  cambia(r.id, 'colore', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <label className="block min-w-[8rem] flex-1">
              <span className="etichetta !mb-1">Nome</span>
              <input
                type="text"
                maxLength={30}
                className="w-full !mt-0"
                value={r.nome}
                onChange={(e) => {
                  cambia(r.id, 'nome', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <label className="block">
              <span className="etichetta !mb-1">Punti (soglia)</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="casella-num !mt-0 w-24"
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
