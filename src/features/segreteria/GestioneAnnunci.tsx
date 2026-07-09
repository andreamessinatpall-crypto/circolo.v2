import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore } from '@/components/stili'
import { messaggioErrore } from '@/lib/errori'
import { tempoRelativo } from '@/lib/formato'
import { useAuth } from '@/auth/useAuth'
import { creaAnnuncio, eliminaAnnuncio, salvaAnnuncio, useAnnunci, type Annuncio } from '@/features/profilo/datiAnnunci'

type Esito = { tipo: 'errore'; testo: string } | null

// Spostata qui da Profilo → Bacheca (Fase 10): i soci ora vedono gli
// annunci solo come notifica (campanella), non più come feed nel
// riepilogo profilo — la gestione (creare/modificare/eliminare) resta
// riservata all'admin, quindi vive in Segreteria come le altre.
export default function GestioneAnnunci() {
  const { profilo } = useAuth()
  const { data, isLoading, error } = useAnnunci()
  const lista = data ?? []

  return (
    <div>
      <div className="eyebrow">Comunicazioni del club</div>
      <div className="card">
        <p className="sub mb-3">
          Ogni annuncio pubblicato notifica automaticamente tutti i soci (campanella + push).
        </p>
        <FormNuovoAnnuncio autoreId={profilo!.id} />
        <div className="mt-4">
          {isLoading ? (
            <p className="text-ink-2">Caricamento…</p>
          ) : error ? (
            <p className={classiErrore}>Impossibile caricare gli annunci: {messaggioErrore(error)}</p>
          ) : lista.length === 0 ? (
            <p className="text-ink-2">Nessun annuncio: pubblica il primo qui sopra.</p>
          ) : (
            lista.map((a) => <RigaAnnuncio key={a.id} annuncio={a} />)
          )}
        </div>
      </div>
    </div>
  )
}

function FormNuovoAnnuncio({ autoreId }: { autoreId: string }) {
  const qc = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [titolo, setTitolo] = useState('')
  const [testo, setTesto] = useState('')
  const [msg, setMsg] = useState<Esito>(null)

  const crea = useMutation({
    mutationFn: async () => {
      const t = titolo.trim()
      const c = testo.trim()
      if (!t) throw new Error("Dai un titolo all'annuncio.")
      if (!c) throw new Error("Scrivi il testo dell'annuncio.")
      await creaAnnuncio({ titolo: t, testo: c, autore_id: autoreId })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annunci'] })
      setTitolo('')
      setTesto('')
      setAperto(false)
      setMsg(null)
    },
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: messaggioErrore(e) }),
  })

  if (!aperto)
    return (
      <button type="button" className="btn btn-secondario" onClick={() => setAperto(true)}>
        ＋ Nuovo annuncio
      </button>
    )

  return (
    <form
      className="rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault()
        setMsg(null)
        crea.mutate()
      }}
    >
      <label className="block">
        <span className="etichetta !mb-1">Titolo</span>
        <input
          type="text"
          maxLength={80}
          className="w-full !mt-0"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
        />
      </label>
      <label className="mt-2 block">
        <span className="etichetta !mb-1">Testo</span>
        <textarea
          maxLength={2000}
          rows={4}
          className="w-full !mt-0"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
        />
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button type="submit" className="btn btn-mini !mt-0" disabled={crea.isPending}>
          Pubblica
        </button>
        <button
          type="button"
          className="btn btn-secondario btn-mini !mt-0"
          onClick={() => { setAperto(false); setMsg(null) }}
        >
          Annulla
        </button>
      </div>
      {msg && <p className={`mt-2 ${classiErrore}`}>{msg.testo}</p>}
    </form>
  )
}

function RigaAnnuncio({ annuncio }: { annuncio: Annuncio }) {
  const qc = useQueryClient()
  const [inModifica, setInModifica] = useState(false)
  const [titolo, setTitolo] = useState(annuncio.titolo)
  const [testo, setTesto] = useState(annuncio.testo)
  const [msg, setMsg] = useState<Esito>(null)

  const invalida = () => qc.invalidateQueries({ queryKey: ['annunci'] })

  const salva = useMutation({
    mutationFn: async () => {
      const t = titolo.trim()
      const c = testo.trim()
      if (!t) throw new Error('Il titolo non può essere vuoto.')
      if (!c) throw new Error('Il testo non può essere vuoto.')
      await salvaAnnuncio(annuncio.id, { titolo: t, testo: c })
    },
    onSuccess: () => {
      invalida()
      setInModifica(false)
      setMsg(null)
    },
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: messaggioErrore(e) }),
  })

  const elimina = useMutation({
    mutationFn: () => eliminaAnnuncio(annuncio.id),
    onSuccess: invalida,
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: messaggioErrore(e) }),
  })

  if (inModifica) {
    return (
      <div className="mt-2.5 rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3">
        <label className="block">
          <span className="etichetta !mb-1">Titolo</span>
          <input
            type="text"
            maxLength={80}
            className="w-full !mt-0"
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
          />
        </label>
        <label className="mt-2 block">
          <span className="etichetta !mb-1">Testo</span>
          <textarea
            maxLength={2000}
            rows={4}
            className="w-full !mt-0"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
          />
        </label>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" className="btn btn-mini !mt-0" disabled={salva.isPending} onClick={() => { setMsg(null); salva.mutate() }}>
            Salva
          </button>
          <button
            type="button"
            className="btn btn-secondario btn-mini !mt-0"
            onClick={() => {
              setTitolo(annuncio.titolo)
              setTesto(annuncio.testo)
              setInModifica(false)
              setMsg(null)
            }}
          >
            Annulla
          </button>
        </div>
        {msg && <p className={`mt-2 ${classiErrore}`}>{msg.testo}</p>}
      </div>
    )
  }

  return (
    <div className="mt-2.5 rounded-xl border border-verde-100 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{annuncio.titolo}</div>
          <p className="sub m-0 mt-0.5 whitespace-pre-wrap">{annuncio.testo}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button type="button" title="Modifica" className="icon-btn" onClick={() => setInModifica(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
          <button
            type="button"
            title="Elimina"
            className="icon-btn icon-btn-pericolo"
            disabled={elimina.isPending}
            onClick={() => {
              setMsg(null)
              if (window.confirm(`Eliminare l'annuncio "${annuncio.titolo}"? L'operazione non si può annullare.`))
                elimina.mutate()
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-1.5 text-xs text-ink-3">{tempoRelativo(annuncio.creato_il)}</div>
      {msg && <p className={`mt-2 ${classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
