import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { logoDaFile } from '@/lib/immagini'
import {
  applicaLivelliPunti,
  PALETTE,
  salvaLivelliPunti,
  useLivelliPunti,
  type LivelloPunti,
} from '@/features/profilo/livelliPunti'
import { MedagliaLvDiretta } from '@/features/profilo/MedagliaLv'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

const MSG_PERMESSO =
  'Permesso negato dal database: serve la policy admin sulle impostazioni (script tappa13-campi-rls.sql).'

const ICO_CARICA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
    <path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 20h14" />
  </svg>
)
const ICO_X = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

function BadgeSlot({
  lv,
  colore,
  img,
  onCarica,
  onRimuovi,
}: {
  lv: number
  colore: string
  img: string | null
  onCarica: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRimuovi: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <span className="etichetta !mb-1 block whitespace-nowrap">Medaglia</span>
      <div className="flex items-center gap-1.5">
        {img ? (
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-black/10">
            <img src={img} alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <MedagliaLvDiretta lv={lv} colore={colore} size={44} />
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            title={img ? 'Cambia immagine' : 'Carica immagine personalizzata'}
            onClick={() => fileRef.current?.click()}
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-verde-100 bg-verde-50 text-verde-800"
          >
            {ICO_CARICA}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onCarica} />
          {img && (
            <button
              type="button"
              onClick={onRimuovi}
              title="Ripristina medaglia automatica"
              aria-label="Ripristina medaglia automatica"
              className="flex h-5 w-5 items-center justify-center rounded border border-black/10"
              style={{ color: 'var(--errore)' }}
            >
              {ICO_X}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// (Fase 8e) Segreteria · livelli a punti configurabili.
export default function GestioneLivelli() {
  const { data, isLoading, error } = useLivelliPunti()

  return (
    <div>
      <div className="eyebrow">Livelli a punti</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          I livelli si raggiungono in base ai <strong>punti</strong> raccolti. Il primo livello parte
          sempre da 0. La medaglia mostrata è quella automatica; puoi sovrascriverla caricando
          un'<strong>immagine</strong> personalizzata.
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
  const setImg = (id: number, val: string | null) =>
    setRighe((r) => r.map((x) => (x.id === id ? { ...x, img: val } : x)))

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
            <BadgeSlot
              lv={i + 1}
              colore={PALETTE[i % PALETTE.length]}
              img={r.img}
              onCarica={(e) => caricaImg(r.id, e)}
              onRimuovi={() => {
                setImg(r.id, null)
                setMsg(null)
              }}
            />
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
