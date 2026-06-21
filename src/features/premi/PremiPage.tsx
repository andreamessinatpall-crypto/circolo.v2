import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import {
  SCRIPT_PREMI,
  mancaPremi,
  usePremiCatalogo,
  useSaldoCrediti,
  useMieRichieste,
  type Premio,
  type Richiesta,
} from './datiPremi'

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

function CardPremio({
  premio,
  crediti,
  inCorso,
  onRiscatta,
}: {
  premio: Premio
  crediti: number
  inCorso: boolean
  onRiscatta: () => void
}) {
  const costo = premio.costo ?? 0
  const esaurito = premio.stock != null && premio.stock <= 0
  const insuff = crediti < costo

  return (
    <div className={'premio-card' + (esaurito ? ' spento' : '')}>
      <div className="premio-top">
        <div className="premio-nome">{premio.nome}</div>
        <div className="premio-costo">{costo} cr</div>
      </div>
      {premio.descrizione && <div className="premio-descr">{premio.descrizione}</div>}
      <div className="premio-meta">
        {premio.stock != null
          ? esaurito
            ? 'Esaurito'
            : 'Disponibili: ' + premio.stock
          : 'Sempre disponibile'}
      </div>
      <div className="azioni">
        <button
          type="button"
          className="btn"
          disabled={esaurito || insuff || inCorso}
          onClick={onRiscatta}
        >
          {esaurito ? 'Esaurito' : insuff ? 'Crediti insufficienti' : 'Richiedi'}
        </button>
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
