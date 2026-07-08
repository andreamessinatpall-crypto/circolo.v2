import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore } from '@/components/stili'
import { messaggioErrore } from '@/lib/errori'
import { tempoRelativo } from '@/lib/formato'
import { useAuth } from '@/auth/useAuth'
import { creaAnnuncio, eliminaAnnuncio, salvaAnnuncio, useAnnunci, type Annuncio } from './datiAnnunci'

type Esito = { tipo: 'errore'; testo: string } | null

// Fase 10 — Comunicazioni del club. Vive dentro l'hero scuro
// (.riep-wow in RiepilogoProfilo.tsx), subito sotto le statistiche
// punti/crediti/posizione — non più una sezione a parte, per non
// ripetere "comunicazione del club" tra titolo sezione ed etichetta
// della card. Sola lettura per tutti i soci; creazione/modifica/
// eliminazione riservate all'admin (RLS). Stile "Cartellone"
// (filo oro + etichetta maiuscola), qui adattato a card translucide
// coerenti con ".riep-oggi" per stare sullo sfondo scuro dell'hero.
export default function Bacheca() {
  const { profilo } = useAuth()
  const sonoAdmin = !!profilo?.is_admin
  const { data, isLoading, error } = useAnnunci()
  const lista = data ?? []

  return (
    <div className="annuncio-blocco">
      {sonoAdmin && <FormNuovoAnnuncio autoreId={profilo!.id} />}

      {isLoading ? (
        <p className="annuncio-nota">Caricamento…</p>
      ) : error ? (
        <p className={classiErrore}>Impossibile caricare gli annunci: {messaggioErrore(error)}</p>
      ) : lista.length === 0 ? (
        <p className="annuncio-nota">
          {sonoAdmin ? 'Nessun annuncio: pubblica il primo qui sopra.' : 'Nessun annuncio al momento.'}
        </p>
      ) : (
        <div>
          {lista.map((a) => (
            <CardAnnuncio key={a.id} annuncio={a} sonoAdmin={sonoAdmin} />
          ))}
        </div>
      )}
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
      <button type="button" className="annuncio-toggle btn btn-secondario mb-3" onClick={() => setAperto(true)}>
        ＋ Nuovo annuncio
      </button>
    )

  return (
    <form
      className="mb-3 rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3"
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

function CardAnnuncio({ annuncio, sonoAdmin }: { annuncio: Annuncio; sonoAdmin: boolean }) {
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
    // Stessa "isola" chiara del form di creazione: più leggibile che
    // scrivere direttamente sulla card translucida scura dell'hero.
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
    <div className="annuncio-card">
      <div className="annuncio-eyebrow">Comunicazione del club</div>
      <div className="annuncio-titolo">{annuncio.titolo}</div>
      <div className="annuncio-testo">{annuncio.testo}</div>
      <div className="annuncio-footer">
        {sonoAdmin ? (
          <div className="annuncio-azioni">
            <button
              type="button"
              title="Modifica"
              className="btn-icona-premio text-white/70 hover:bg-white/10"
              onClick={() => setInModifica(true)}
            >
              <svg className="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button
              type="button"
              title="Elimina"
              className="btn-icona-premio text-red-300 hover:bg-red-500/15 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={elimina.isPending}
              onClick={() => {
                setMsg(null)
                if (window.confirm(`Eliminare l'annuncio "${annuncio.titolo}"? L'operazione non si può annullare.`))
                  elimina.mutate()
              }}
            >
              <svg className="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>
          </div>
        ) : (
          <span />
        )}
        <span className="annuncio-data">{tempoRelativo(annuncio.creato_il)}</span>
      </div>
      {msg && <p className={`mt-2 ${classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
