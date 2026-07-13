import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore } from '@/components/stili'
import { messaggioErrore } from '@/lib/errori'
import { tempoRelativo } from '@/lib/formato'
import { useAuth } from '@/auth/useAuth'
import RitaglioImmagine from '@/components/RitaglioImmagine'
import { creaAnnuncio, eliminaAnnuncio, salvaAnnuncio, useAnnunci, type Annuncio } from '@/features/profilo/datiAnnunci'

type Esito = { tipo: 'errore'; testo: string } | null

// Rapporto d'aspetto del banner (16:7), condiviso da upload e ritaglio.
const ASPETTO_BANNER = 16 / 7

const ICO_MATITA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
)
const ICO_RITAGLIO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
    <path d="M6 2v14a2 2 0 002 2h14" />
    <path d="M2 6h14a2 2 0 012 2v14" />
  </svg>
)

// Campo banner: dopo il caricamento mostra direttamente l'anteprima fedele
// (stesse classi CSS del rendering finale, .annuncio-img-wrap/-titolo, col
// titolo digitato sovrapposto) invece dell'immagine grezza caricata — niente
// doppia anteprima. Sia al primo caricamento sia in un secondo momento
// ("Ritaglia") si passa da RitaglioImmagine, che lascia scegliere quale
// parte della foto mantenere invece di un ritaglio centrato automatico.
function CampoBanner({
  img,
  onCambia,
  titolo,
}: {
  img: string | null
  onCambia: (dataUrl: string | null) => void
  titolo: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [errore, setErrore] = useState<string | null>(null)
  // Sorgente in attesa di ritaglio: un object URL per un file appena
  // scelto (va revocato dopo), oppure l'immagine già salvata quando si
  // riapre il ritaglio su quella esistente (già un data URL, nulla da
  // revocare).
  const [sorgente, setSorgente] = useState<{ url: string; blob: boolean } | null>(null)

  function carica(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\//.test(file.type)) {
      setErrore('Seleziona un file immagine.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrore('Immagine troppo pesante (max 15 MB).')
      return
    }
    setErrore(null)
    setSorgente({ url: URL.createObjectURL(file), blob: true })
  }

  function chiudiRitaglio() {
    if (sorgente?.blob) URL.revokeObjectURL(sorgente.url)
    setSorgente(null)
  }

  return (
    <div>
      <span className="etichetta !mb-1 block">Banner (facoltativo)</span>
      {img ? (
        <div className="annuncio-img-wrap">
          <img src={img} alt="" className="annuncio-img" />
          <div className="annuncio-img-titolo">{titolo.trim() || 'Titolo annuncio'}</div>
          <button
            type="button"
            onClick={() => onCambia(null)}
            title="Rimuovi immagine"
            aria-label="Rimuovi immagine"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => setSorgente({ url: img, blob: false })}
            title="Ritaglia di nuovo"
            aria-label="Ritaglia di nuovo"
            className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
          >
            {ICO_RITAGLIO}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Cambia immagine"
            aria-label="Cambia immagine"
            className="absolute left-9 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
          >
            {ICO_MATITA}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border2)] text-sm text-ink-2 hover:bg-black/5"
          style={{ aspectRatio: '16/7' }}
        >
          ＋ Carica immagine
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={carica} />
      <span className="sub text-xs mt-1 block">
        Dimensione consigliata: 1200×525 px (rapporto 16:7 circa). Dopo aver scelto il file puoi
        decidere tu quale parte mantenere nel riquadro di ritaglio.
      </span>
      {errore && (
        <p className="mt-1 text-xs" style={{ color: 'var(--errore)' }}>
          {errore}
        </p>
      )}
      {sorgente && (
        <RitaglioImmagine
          src={sorgente.url}
          aspetto={ASPETTO_BANNER}
          onConferma={(dataUrl) => {
            onCambia(dataUrl)
            chiudiRitaglio()
          }}
          onAnnulla={chiudiRitaglio}
        />
      )}
    </div>
  )
}

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

export function FormNuovoAnnuncio({ autoreId }: { autoreId: string }) {
  const qc = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [titolo, setTitolo] = useState('')
  const [testo, setTesto] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [immagine, setImmagine] = useState<string | null>(null)
  const [msg, setMsg] = useState<Esito>(null)

  const crea = useMutation({
    mutationFn: async () => {
      const t = titolo.trim()
      const c = testo.trim()
      if (!t) throw new Error("Dai un titolo all'annuncio.")
      await creaAnnuncio({
        titolo: t,
        testo: c,
        autore_id: autoreId,
        scadenza: scadenza ? scadenza + 'T23:59:59' : null,
        immagine,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annunci'] })
      setTitolo('')
      setTesto('')
      setScadenza('')
      setImmagine(null)
      setAperto(false)
      setMsg(null)
    },
    onError: (e: unknown) => setMsg({ tipo: 'errore', testo: messaggioErrore(e) }),
  })

  if (!aperto)
    return (
      <button type="button" className="btn btn-secondario" onClick={() => setAperto(true)}>
        ＋ Aggiungi un nuovo annuncio
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
      <div className="mt-2">
        <CampoBanner img={immagine} onCambia={setImmagine} titolo={titolo} />
      </div>
      <label className="mt-2 block">
        <span className="etichetta !mb-1">Testo (facoltativo)</span>
        <textarea
          maxLength={2000}
          rows={4}
          className="w-full !mt-0"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
        />
      </label>
      <label className="mt-2 block">
        <span className="etichetta !mb-1">Scadenza (facoltativa)</span>
        <input
          type="date"
          className="w-full !mt-0"
          value={scadenza}
          onChange={(e) => setScadenza(e.target.value)}
        />
        <span className="sub text-xs">Lascia vuoto per un annuncio fisso, senza scadenza.</span>
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

export function RigaAnnuncio({ annuncio }: { annuncio: Annuncio }) {
  const qc = useQueryClient()
  const [inModifica, setInModifica] = useState(false)
  const [titolo, setTitolo] = useState(annuncio.titolo)
  const [testo, setTesto] = useState(annuncio.testo)
  const [scadenza, setScadenza] = useState(annuncio.scadenza?.slice(0, 10) ?? '')
  const [immagine, setImmagine] = useState<string | null>(annuncio.immagine)
  const [msg, setMsg] = useState<Esito>(null)

  const invalida = () => qc.invalidateQueries({ queryKey: ['annunci'] })

  const salva = useMutation({
    mutationFn: async () => {
      const t = titolo.trim()
      const c = testo.trim()
      if (!t) throw new Error('Il titolo non può essere vuoto.')
      await salvaAnnuncio(annuncio.id, { titolo: t, testo: c, scadenza: scadenza ? scadenza + 'T23:59:59' : null, immagine })
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
        <div className="mt-2">
          <CampoBanner img={immagine} onCambia={setImmagine} titolo={titolo} />
        </div>
        <label className="mt-2 block">
          <span className="etichetta !mb-1">Testo (facoltativo)</span>
          <textarea
            maxLength={2000}
            rows={4}
            className="w-full !mt-0"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
          />
        </label>
        <label className="mt-2 block">
          <span className="etichetta !mb-1">Scadenza (facoltativa)</span>
          <input
            type="date"
            className="w-full !mt-0"
            value={scadenza}
            onChange={(e) => setScadenza(e.target.value)}
          />
          <span className="sub text-xs">Lascia vuoto per un annuncio fisso, senza scadenza.</span>
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
              setScadenza(annuncio.scadenza?.slice(0, 10) ?? '')
              setImmagine(annuncio.immagine)
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
        <div className="min-w-0 flex-1">
          {annuncio.immagine ? (
            <div className="annuncio-img-wrap">
              <img src={annuncio.immagine} alt="" className="annuncio-img" />
              <div className="annuncio-img-titolo">{annuncio.titolo}</div>
            </div>
          ) : (
            <div className="font-semibold">{annuncio.titolo}</div>
          )}
          {annuncio.testo && <p className="sub m-0 mt-1.5 whitespace-pre-wrap">{annuncio.testo}</p>}
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
      <div className="mt-1.5 text-xs text-ink-3">
        {tempoRelativo(annuncio.creato_il)}
        {' · '}
        {annuncio.scadenza
          ? `Scade il ${new Date(annuncio.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : 'Senza scadenza'}
      </div>
      {msg && <p className={`mt-2 ${classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
