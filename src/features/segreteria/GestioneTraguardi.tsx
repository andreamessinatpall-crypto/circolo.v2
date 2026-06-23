import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { logoDaFile } from '@/lib/immagini'
import {
  applicaBadgeLivelli,
  salvaBadgeLivelli,
  useLivelliPartite,
  type Livello,
} from '@/features/profilo/badge/badgeDati'
import SlotImmagine from './SlotImmagine'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

const MSG_PERMESSO =
  'Permesso negato dal database: serve la policy admin sulle impostazioni (script tappa13-campi-rls.sql).'

// (Fase 8e · blocco 2) Segreteria · traguardi di partita configurabili, con
// immagini per Padel e Calcio.
export default function GestioneTraguardi() {
  const { data, isLoading, error } = useLivelliPartite()

  return (
    <div>
      <div className="eyebrow">Traguardi di partita</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          I traguardi si sbloccano col numero di <strong>partite confermate</strong>. Per ogni
          traguardo puoi caricare un’<strong>immagine</strong> distinta per Padel e Calcio; se non la
          carichi si usa l’emblema col colore.
        </p>
        {isLoading ? (
          <p className="text-ink-2">Caricamento…</p>
        ) : error ? (
          <p className={classiErrore}>Impossibile caricare i traguardi: {error.message}</p>
        ) : (
          <EditorTraguardi key={(data ?? []).map((l) => l.nome + l.soglia).join('|')} iniziali={data ?? []} />
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
  img_padel: string | null
  img_calcio: string | null
}

function EditorTraguardi({ iniziali }: { iniziali: Livello[] }) {
  const qc = useQueryClient()
  const [righe, setRighe] = useState<Riga[]>(() =>
    iniziali.map((l, i) => ({
      id: i,
      nome: l.nome,
      soglia: String(l.soglia),
      colore: l.colore,
      img_padel: l.img_padel,
      img_calcio: l.img_calcio,
    })),
  )
  const [msg, setMsg] = useState<Esito>(null)
  const idRef = useRef(iniziali.length || 1)
  const nuovoId = () => idRef.current++

  const aggiungi = () =>
    setRighe((r) => [
      ...r,
      {
        id: nuovoId(),
        nome: `Livello ${r.length + 1}`,
        soglia: '1',
        colore: '#2E9E6B',
        img_padel: null,
        img_calcio: null,
      },
    ])
  const togli = (id: number) => setRighe((r) => r.filter((x) => x.id !== id))
  const cambia = (id: number, campo: 'nome' | 'soglia' | 'colore', val: string) =>
    setRighe((r) => r.map((x) => (x.id === id ? { ...x, [campo]: val } : x)))
  const setImg = (id: number, campo: 'img_padel' | 'img_calcio', val: string | null) =>
    setRighe((r) => r.map((x) => (x.id === id ? { ...x, [campo]: val } : x)))

  async function caricaImg(
    id: number,
    campo: 'img_padel' | 'img_calcio',
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMsg(null)
    try {
      setImg(id, campo, await logoDaFile(file))
    } catch (err) {
      setMsg({ tipo: 'errore', testo: err instanceof Error ? err.message : 'Immagine non valida.' })
    }
  }

  const salva = useMutation({
    mutationFn: async () => {
      if (righe.length === 0) throw new Error('Serve almeno un traguardo.')
      const livelli: Livello[] = righe.map((r) => ({
        nome: r.nome.trim() || 'Livello',
        soglia: Math.max(1, parseInt(r.soglia, 10) || 1),
        colore: r.colore,
        img_padel: r.img_padel,
        img_calcio: r.img_calcio,
      }))
      const esito = await salvaBadgeLivelli(livelli)
      if (!esito.ok)
        throw new Error(
          esito.mancaPermesso
            ? MSG_PERMESSO
            : esito.mancaScript
              ? 'Manca la colonna badge_livelli: esegui lo script tappa17-livelli-badge.sql su Supabase.'
              : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''),
        )
      return applicaBadgeLivelli(livelli)
    },
    onSuccess: (puliti) => {
      qc.invalidateQueries({ queryKey: ['badge-livelli'] })
      setMsg({ tipo: 'ok', testo: `Traguardi salvati (${puliti.length}).` })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div>
      <div className="flex flex-col gap-3">
        {righe.map((r) => (
          <div key={r.id} className="flex flex-wrap items-end gap-3 border-b border-verde-100 pb-3">
            <SlotImmagine
              etichetta="Padel"
              img={r.img_padel}
              colore={r.colore}
              onCarica={(e) => caricaImg(r.id, 'img_padel', e)}
              onRimuovi={() => {
                setImg(r.id, 'img_padel', null)
                setMsg(null)
              }}
            />
            <SlotImmagine
              etichetta="Calcio"
              img={r.img_calcio}
              colore={r.colore}
              onCarica={(e) => caricaImg(r.id, 'img_calcio', e)}
              onRimuovi={() => {
                setImg(r.id, 'img_calcio', null)
                setMsg(null)
              }}
            />
            <label className="block">
              <span className="etichetta !mb-1">Colore</span>
              <input
                type="color"
                className="!mt-0 h-11 w-12 rounded-lg border border-verde-100 p-1"
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
                className="!mt-0 h-11 w-full"
                value={r.nome}
                onChange={(e) => {
                  cambia(r.id, 'nome', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <label className="block">
              <span className="etichetta !mb-1">Partite (soglia)</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className="casella-num !mt-0 h-11 w-24"
                value={r.soglia}
                onChange={(e) => {
                  cambia(r.id, 'soglia', e.target.value)
                  setMsg(null)
                }}
              />
            </label>
            <button
              type="button"
              aria-label="Togli traguardo"
              className="btn btn-pericolo btn-mini !mt-0 flex h-11 w-11 items-center justify-center !px-0 text-base"
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
          ＋ Aggiungi traguardo
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
          Salva i traguardi
        </button>
      </div>

      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
