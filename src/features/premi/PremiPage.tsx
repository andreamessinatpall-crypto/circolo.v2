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

const ETICHETTE_STATO: Record<string, [classe: string, testo: string]> = {
  in_attesa: ['attesa', 'In attesa'],
  approvato: ['approvato', 'Approvato'],
  consegnato: ['consegnato', 'Consegnato'],
}

export default function PremiPage() {
  const { profilo } = useAuth()
  const qc = useQueryClient()

  const saldoQuery = useSaldoCrediti(profilo?.id)
  const catalogoQuery = usePremiCatalogo()
  const richiesteQuery = useMieRichieste(profilo?.id)
  const popolaritaQuery = usePopolaritaPremi()

  const crediti = saldoQuery.data ?? 0

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
      <div className="eyebrow">Catalogo premi</div>
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
            onRiscatta={() => {
              if (window.confirm(`Riscattare "${p.nome}" per ${p.costo ?? 0} crediti?`))
                riscatta.mutate(p)
            }}
          />
        ))
      )}

      {/* Le mie richieste */}
      <div className="eyebrow">Le tue richieste</div>
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
                onAnnulla={() => {
                  if (window.confirm('Eliminare questa richiesta? I crediti ti verranno restituiti.'))
                    annulla.mutate(r)
                }}
              />
            ))}
          </div>
        )}
      </div>
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
          : 'Sempre disponibile'}
      </div>
      <div className="azioni mt-1">
        {esaurito ? (
          <button type="button" className="btn-bloccato" disabled>
            Esaurito
          </button>
        ) : insuff ? (
          <button
            type="button"
            className="btn-bloccato"
            disabled
            title={`Ti servono ${costo} crediti`}
          >
            {LUCCHETTO} {costo} CR
          </button>
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
  const [classe, testo] = ETICHETTE_STATO[richiesta.stato] ?? ['attesa', richiesta.stato || '—']
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div className="font-semibold">
          {richiesta.nome_premio} · {richiesta.costo_pagato ?? 0} cr
        </div>
        <div className="text-sm text-ink-2">{dataIt(richiesta.creato_il)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={'stato-pill ' + classe}>{testo}</span>
        {richiesta.stato !== 'consegnato' && (
          <button
            type="button"
            className="btn btn-mini btn-pericolo"
            disabled={inCorso}
            onClick={onAnnulla}
          >
            Elimina
          </button>
        )}
      </div>
    </div>
  )
}
