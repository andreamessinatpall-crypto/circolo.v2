import { useState, type ReactNode } from 'react'
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
        <span className="club-sez-icona">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
        </span>
        <h2 className="club-sez-titolo">Catalogo premi</h2>
      </div>
      {catalogoQuery.isLoading ? (
        <p className="sub">Caricamento…</p>
      ) : premi.length === 0 ? (
        <p className="sub">Nessun premio disponibile al momento.</p>
      ) : (
        premi.map((p) => (
          <CardPremio
            key={p.id}
            premio={p}
            crediti={crediti}
            popolare={(popolaritaQuery.data?.get(p.nome.toLowerCase()) ?? 0) >= SOGLIA_POPOLARE}
            inCorso={riscatta.isPending}
            onRiscatta={() => setRiscattaPending(p)}
          />
        ))
      )}

      {/* Le mie richieste */}
      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <span className="club-sez-icona">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M12 12h4M12 16h4M8 12h.01M8 16h.01"/></svg>
        </span>
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
    <div className={'premio-card' + (esaurito ? ' spento' : '')}>
      {popolare && (
        <span className="badge-popolare" title="Premio molto richiesto">
          🔥 Popolare
        </span>
      )}
      <div className={'premio-top' + (popolare ? ' pr-pop' : '')}>
        <div className="premio-nome">{premio.nome}</div>
      </div>
      {premio.descrizione && <div className="premio-descr">{premio.descrizione}</div>}
      <div className="premio-stock">
        📦{' '}
        {premio.stock != null
          ? esaurito
            ? 'Esaurito'
            : `${premio.stock} disponibili`
          : 'Illimitato'}
      </div>
      <div className="azioni mt-1">
        {esaurito ? (
          <span className="btn-bloccato">Esaurito</span>
        ) : insuff ? (
          <span className="btn-bloccato" title={`Ti servono ${costo} crediti`}>
            {LUCCHETTO} {costo} crediti
          </span>
        ) : (
          <button type="button" className="btn-riscatta" disabled={inCorso} onClick={onRiscatta}>
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
