import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiInput, classiOk } from '@/components/stili'
import { conferma } from '@/lib/dialoghi'
import { rimuoviMembro } from '@/features/piattaforma/datiPiattaforma'
import { impostaSospensione } from '@/features/segreteria/datiSoci'
import { useGiocatoriPiattaforma, type GiocatorePiattaforma } from './datiGiocatoriAdmin'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

const ETICHETTA_RUOLO: Record<string, string> = { socio: 'Socio', collaboratore: 'Collaboratore', gestore: 'Gestore' }

// Elenco giocatori dell'INTERA piattaforma (tutti i circoli insieme), con
// ricerca e due azioni: rimuovere l'iscrizione a un circolo, sospendere/
// riattivare l'account (globale, vale ovunque — stessa colonna soci.sospeso
// già usata dalla segreteria in DettaglioGiocatore.tsx, qui riusata da una
// vista cross-circolo invece che dentro un singolo circolo).
export default function GiocatoriTab() {
  const { data: giocatori, isLoading, error } = useGiocatoriPiattaforma()
  const [termine, setTermine] = useState('')

  const filtrati = useMemo(() => {
    const t = termine.trim().toLowerCase()
    if (!t) return giocatori ?? []
    return (giocatori ?? []).filter((g) =>
      `${g.nome} ${g.cognome} ${g.email ?? ''}`.toLowerCase().includes(t),
    )
  }, [giocatori, termine])

  return (
    <div>
      <div className="eyebrow">Piattaforma · Giocatori</div>
      <div className="card">
        <label htmlFor="cerca-giocatore" className="sr-only">Cerca giocatore</label>
        <input
          id="cerca-giocatore"
          type="text"
          placeholder="Cerca per nome, cognome o email…"
          className={`${classiInput} w-full`}
          value={termine}
          onChange={(e) => setTermine(e.target.value)}
        />

        {isLoading ? (
          <p className="mt-3 text-ink-2">Caricamento giocatori…</p>
        ) : error ? (
          <p className={`mt-3 ${classiErrore}`}>Impossibile caricare i giocatori: {error.message}</p>
        ) : filtrati.length === 0 ? (
          <p className="mt-3 text-ink-2">Nessun giocatore trovato.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5">
            {filtrati.map((g) => (
              <RigaGiocatore key={g.id} giocatore={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RigaGiocatore({ giocatore }: { giocatore: GiocatorePiattaforma }) {
  const qc = useQueryClient()
  const [msg, setMsg] = useState<Esito>(null)

  const invalida = () => qc.invalidateQueries({ queryKey: ['giocatori-piattaforma'] })

  const sospendi = useMutation({
    mutationFn: async (valore: boolean) => {
      const esito = await impostaSospensione(giocatore.id, valore)
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Operazione non riuscita.')
    },
    onSuccess: invalida,
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const rimuovi = useMutation({
    mutationFn: async (membroId: string) => {
      const esito = await rimuoviMembro(membroId)
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Rimozione non riuscita.')
    },
    onSuccess: invalida,
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {giocatore.nome} {giocatore.cognome}
            {giocatore.is_super_admin && (
              <span className="ml-2 rounded-full bg-[var(--v050)] px-2 py-0.5 text-xs font-semibold text-[var(--v700)]">
                Super-admin
              </span>
            )}
            {giocatore.sospeso && (
              <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                Sospeso
              </span>
            )}
          </div>
          <div className="truncate text-xs text-ink-3">{giocatore.email}</div>
        </div>
        {!giocatore.is_super_admin && (
          <button
            type="button"
            className="btn btn-secondario !mt-0 !w-auto !px-3 !py-1.5 text-sm"
            disabled={sospendi.isPending}
            onClick={async () => {
              setMsg(null)
              const valore = !giocatore.sospeso
              if (valore && !(await conferma(`Sospendere ${giocatore.nome} ${giocatore.cognome}? Non potrà più accedere all'app finché non lo riattivi.`, { pericolo: true, labelConferma: 'Sospendi' })))
                return
              sospendi.mutate(valore)
            }}
          >
            {giocatore.sospeso ? 'Riattiva' : 'Sospendi'}
          </button>
        )}
      </div>

      {giocatore.circoli.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {giocatore.circoli.map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-1.5 rounded-full border border-black/10 py-0.5 pl-2.5 pr-1 text-xs"
            >
              {m.circolo.nome} · {ETICHETTA_RUOLO[m.ruolo] ?? m.ruolo}
              <button
                type="button"
                title={`Rimuovi da ${m.circolo.nome}`}
                disabled={rimuovi.isPending}
                onClick={async () => {
                  setMsg(null)
                  if (await conferma(`Rimuovere ${giocatore.nome} ${giocatore.cognome} da ${m.circolo.nome}?`, { pericolo: true, labelConferma: 'Rimuovi' }))
                    rimuovi.mutate(m.id)
                }}
                className="rounded-full px-1 text-ink-2 hover:bg-black/5 hover:text-ink"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {msg && <p className={`text-sm ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
