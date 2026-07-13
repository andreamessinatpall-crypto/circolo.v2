import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ModalConferma from '@/components/ModalConferma'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import {
  SCRIPT_PREMI,
  mancaPremi,
  usePremiCatalogo,
  usePopolaritaPremi,
  useSaldoCrediti,
  useMieRichieste,
  type Premio,
  type Richiesta,
} from './datiPremi'

// Da quante richieste in su un premio è considerato "Popolare".
const SOGLIA_POPOLARE = 3

// Data breve in italiano (es. "21 giu 2026").
function dataIt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

const ICO_ATTESA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" width="15" height="15">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const ICO_APPROVATO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" width="15" height="15">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
)
const ICO_CONSEGNATO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" width="15" height="15">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const ICO_ELIMINA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" width="14" height="14">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
)

const ETICHETTE_STATO: Record<string, [classe: string, icona: ReactNode, titolo: string]> = {
  in_attesa: ['attesa',     ICO_ATTESA,     'In attesa'],
  approvato: ['approvato',  ICO_APPROVATO,  'Approvato'],
  consegnato: ['consegnato', ICO_CONSEGNATO, 'Consegnato'],
}

export default function PremiPage() {
  const { profilo } = useAuth()
  const qc = useQueryClient()

  const saldoQuery = useSaldoCrediti(profilo?.id)
  const catalogoQuery = usePremiCatalogo()
  const richiesteQuery = useMieRichieste(profilo?.id)
  const popolaritaQuery = usePopolaritaPremi()

  const crediti = saldoQuery.data ?? 0
  const [riscattaPending, setRiscattaPending] = useState<Premio | null>(null)
  const [annullaPending, setAnnullaPending] = useState<Richiesta | null>(null)

  const aggiorna = () => {
    qc.invalidateQueries({ queryKey: ['premi-catalogo'] })
    qc.invalidateQueries({ queryKey: ['saldo-crediti'] })
    qc.invalidateQueries({ queryKey: ['mie-richieste'] })
    qc.invalidateQueries({ queryKey: ['riepilogo-stat'] }) // aggiorna i crediti nel profilo
  }

  const riscatta = useMutation({
    mutationFn: async (p: Premio) => {
      const { data, error } = await supabase.rpc('riscatta_premio', { p_premio: p.id })
      if (error) throw error
      const esito = data as { ok?: boolean; errore?: string } | null
      if (esito && esito.ok === false) throw new Error(esito.errore || 'Richiesta non riuscita.')
    },
    onSuccess: aggiorna,
    onError: (e: unknown) =>
      window.alert(
        mancaRpc(e)
          ? `Sistema premi non ancora attivo: esegui lo script ${SCRIPT_PREMI} su Supabase.`
          : 'Non riuscito: ' + messaggioErrore(e),
      ),
  })

  const annulla = useMutation({
    mutationFn: async (r: Richiesta) => {
      const { data, error } = await supabase.rpc('annulla_richiesta_premio', { p_richiesta: r.id })
      if (error) throw error
      const esito = data as { ok?: boolean; errore?: string } | null
      if (esito && esito.ok === false) throw new Error(esito.errore || 'Non riuscito.')
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  if (!profilo) return null

  // Se le tabelle premi non esistono ancora sul database.
  if (catalogoQuery.error && mancaPremi(catalogoQuery.error)) {
    return (
      <p className="sub">
        Sistema premi non ancora attivo: esegui lo script{' '}
        <code className="rounded bg-verde-50 px-1">{SCRIPT_PREMI}</code> su Supabase.
      </p>
    )
  }

  const premi = catalogoQuery.data ?? []
  const richieste = richiesteQuery.data ?? []

  return (
    <div>
      {/* Saldo crediti */}
      <div className="saldo-crediti">
        <span className="num">{crediti}</span>
        <span className="et">Crediti disponibili</span>
      </div>

      {/* Catalogo */}
      <div className="club-sez-header" style={{ marginTop: '0.5rem' }}>
        <h2 className="club-sez-titolo">Catalogo premi</h2>
      </div>
      {catalogoQuery.isLoading ? (
        <p className="sub">Caricamento…</p>
      ) : premi.length === 0 ? (
        <p className="sub">Nessun premio disponibile al momento.</p>
      ) : (
        <CatalogoPaginato
          elementi={premi.map((p) => (
            <CardPremio
              key={p.id}
              premio={p}
              crediti={crediti}
              popolare={(popolaritaQuery.data?.get(p.nome.toLowerCase()) ?? 0) >= SOGLIA_POPOLARE}
              inCorso={riscatta.isPending}
              onRiscatta={() => setRiscattaPending(p)}
            />
          ))}
        />
      )}

      {/* Le mie richieste */}
      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <h2 className="club-sez-titolo">Le tue richieste</h2>
      </div>
      <div className="card">
        {richiesteQuery.isLoading ? (
          <p className="sub">Caricamento…</p>
        ) : richiesteQuery.error ? (
          <p className="sub">Impossibile caricare: {messaggioErrore(richiesteQuery.error)}</p>
        ) : richieste.length === 0 ? (
          <p className="sub">Non hai ancora richiesto premi.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {richieste.map((r) => (
              <RigaRichiesta
                key={r.id}
                richiesta={r}
                inCorso={annulla.isPending}
                onAnnulla={() => setAnnullaPending(r)}
              />
            ))}
          </div>
        )}
      </div>

      {riscattaPending && (
        <ModalConferma
          titolo="Riscattare il premio?"
          messaggio={`"${riscattaPending.nome}" costerà ${riscattaPending.costo ?? 0} crediti.`}
          labelConferma="Riscatta"
          onConferma={() => { riscatta.mutate(riscattaPending); setRiscattaPending(null) }}
          onAnnulla={() => setRiscattaPending(null)}
        />
      )}

      {annullaPending && (
        <ModalConferma
          titolo="Eliminare la richiesta?"
          messaggio="I crediti ti verranno restituiti."
          labelConferma="Sì, elimina"
          pericolo
          onConferma={() => { annulla.mutate(annullaPending); setAnnullaPending(null) }}
          onAnnulla={() => setAnnullaPending(null)}
        />
      )}
    </div>
  )
}

// Larghezza di una minicard (.premio-minicard in index.css) + il gap tra
// due, per calcolare quante ce ne stanno affiancate in una pagina.
const LARGHEZZA_MINICARD = 300
const GAP_MINICARD = 12
// Effetto "rivista": ogni pagina è più stretta del contenitore, così il
// bordo della pagina successiva resta leggermente visibile a destra —
// dà l'impressione di poterla sfogliare, non solo di scorrere una lista.
// Volutamente piccola: si deve intravedere giusto l'ombra della scheda
// dopo, non il suo contenuto.
const SBIRCIATA = 16
const GUTTER_PAGINE = 10

const ICO_FRECCIA_SX = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const ICO_FRECCIA_DX = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// Catalogo a pagine, effetto rivista: ogni pagina è una riga di minicard
// (tante quante ce ne stanno nella larghezza disponibile) più stretta del
// contenitore, in modo che il bordo della pagina dopo resti sempre
// leggermente visibile — swipe col dito per "sfogliare", o frecce/pallini
// su desktop.
function CatalogoPaginato({ elementi }: { elementi: ReactNode[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [perPagina, setPerPagina] = useState(1)
  const [pagina, setPagina] = useState(0)

  useEffect(() => {
    function calcola() {
      const larghezza = viewportRef.current?.clientWidth
      if (!larghezza) return
      const disponibile = larghezza - SBIRCIATA
      setPerPagina(Math.max(1, Math.floor((disponibile + GAP_MINICARD) / (LARGHEZZA_MINICARD + GAP_MINICARD))))
    }
    calcola()
    window.addEventListener('resize', calcola)
    return () => window.removeEventListener('resize', calcola)
  }, [])

  const pagine = useMemo(() => {
    const risultato: ReactNode[][] = []
    for (let i = 0; i < elementi.length; i += perPagina) risultato.push(elementi.slice(i, i + perPagina))
    return risultato
  }, [elementi, perPagina])

  useEffect(() => {
    if (pagina > pagine.length - 1) setPagina(0)
  }, [pagine.length, pagina])

  // Un "passo" di scroll = la larghezza di una pagina + il distacco prima
  // della successiva, non l'intero contenitore (che è più largo delle
  // pagine per lasciar sbirciare quella dopo).
  function passo(el: HTMLDivElement) {
    return el.clientWidth - SBIRCIATA + GUTTER_PAGINE
  }

  function vaiA(indice: number) {
    const el = viewportRef.current
    if (!el) return
    el.scrollTo({ left: Math.min(Math.max(0, indice), pagine.length - 1) * passo(el), behavior: 'smooth' })
  }

  function alloScroll() {
    const el = viewportRef.current
    if (!el) return
    setPagina(Math.round(el.scrollLeft / passo(el)))
  }

  if (pagine.length === 0) return null

  return (
    <div className="premi-pagine">
      <div className="premi-pagine-viewport" ref={viewportRef} onScroll={alloScroll}>
        {pagine.map((riga, i) => (
          <div className="premi-pagina" key={i} style={{ width: `calc(100% - ${SBIRCIATA}px)` }}>
            {riga}
          </div>
        ))}
      </div>
      {pagine.length > 1 && (
        <>
          <button
            type="button"
            className="premi-pagine-freccia premi-pagine-freccia-sx"
            onClick={() => vaiA(pagina - 1)}
            disabled={pagina === 0}
            aria-label="Pagina precedente"
          >
            {ICO_FRECCIA_SX}
          </button>
          <button
            type="button"
            className="premi-pagine-freccia premi-pagine-freccia-dx"
            onClick={() => vaiA(pagina + 1)}
            disabled={pagina === pagine.length - 1}
            aria-label="Pagina successiva"
          >
            {ICO_FRECCIA_DX}
          </button>
          <div className="premi-pagine-dots">
            {pagine.map((_, i) => (
              <button
                key={i}
                type="button"
                className={'premi-pagine-dot' + (i === pagina ? ' attivo' : '')}
                onClick={() => vaiA(i)}
                aria-label={`Pagina ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Lucchetto per il pulsante "bloccato" (crediti insufficienti).
const LUCCHETTO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

function CardPremio({
  premio,
  crediti,
  popolare,
  inCorso,
  onRiscatta,
}: {
  premio: Premio
  crediti: number
  popolare: boolean
  inCorso: boolean
  onRiscatta: () => void
}) {
  const costo = premio.costo ?? 0
  const esaurito = premio.stock != null && premio.stock <= 0
  const insuff = crediti < costo

  return (
    <div className={'premio-card premio-minicard' + (esaurito ? ' spento' : '')}>
      {popolare && (
        <span className="mini-badge-popolare" title="Premio molto richiesto">
          🔥 Popolare
        </span>
      )}
      <div className="premio-v1-top">
        <div className="min-w-0">
          <div className="premio-nome">{premio.nome}</div>
        </div>
        <div className="premio-v1-prezzo">
          <div className="num">{costo}</div>
          <div className="et">Crediti</div>
        </div>
      </div>
      <div className="premio-v1-stock">
        {premio.stock != null
          ? esaurito
            ? 'Esaurito'
            : `${premio.stock} disponibili`
          : 'Illimitato'}
      </div>
      {premio.descrizione && <div className="premio-descr mt-2">{premio.descrizione}</div>}
      {premio.immagine && (
        <div className="premio-v1-img">
          <img src={premio.immagine} alt="" />
        </div>
      )}
      <div className="premio-v1-azione">
        {esaurito ? (
          <span className="btn-bloccato w-full justify-center">Esaurito</span>
        ) : insuff ? (
          <span className="btn-bloccato w-full justify-center" title={`Ti servono ${costo} crediti`}>
            {LUCCHETTO} {costo} crediti
          </span>
        ) : (
          <button type="button" className="btn-riscatta w-full justify-center" disabled={inCorso} onClick={onRiscatta}>
            Riscatta · {costo} CR
          </button>
        )}
      </div>
    </div>
  )
}

function RigaRichiesta({
  richiesta,
  inCorso,
  onAnnulla,
}: {
  richiesta: Richiesta
  inCorso: boolean
  onAnnulla: () => void
}) {
  const [classe, icona, titolo] = ETICHETTE_STATO[richiesta.stato] ?? ['attesa', ICO_ATTESA, richiesta.stato || '—']
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="font-semibold">
          {richiesta.nome_premio} · {richiesta.costo_pagato ?? 0} cr
        </div>
        <div className="text-sm text-ink-2">{dataIt(richiesta.creato_il)}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={'stato-pill inline-flex items-center justify-center ' + classe} title={titolo}>
          {icona}
        </span>
        {richiesta.stato !== 'consegnato' && (
          <button
            type="button"
            className="btn btn-mini btn-pericolo inline-flex items-center justify-center"
            title="Elimina richiesta"
            disabled={inCorso}
            onClick={onAnnulla}
          >
            {ICO_ELIMINA}
          </button>
        )}
      </div>
    </div>
  )
}
