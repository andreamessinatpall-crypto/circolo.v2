import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCircolo } from '@/circolo/useCircolo'
import { classiErrore, classiOk } from '@/components/stili'
import { titleCase, iniziali } from '@/lib/formato'
import Avatar from '@/components/Avatar'
import { aggiornaRuoloMembro, useMembriCircolo } from '@/features/piattaforma/datiPiattaforma'
import type { MembroCircolo } from '@/features/piattaforma/tipi'

// (Fase 9c-bis) Nessuno crea più account per conto di altri: i soci si
// registrano da soli e scelgono il circolo (Fase 6). L'unica cosa che un
// gestore può ancora decidere per un altro socio è se è un suo
// collaboratore — qui, scoped al circolo corrente. Riusa la stessa RPC/RLS
// del pannello piattaforma (aggiornaRuoloMembro/useMembriCircolo, già
// scoped per e_gestore(circolo_id)), ma con una UI più semplice: niente
// ricerca/aggiunta di membri nuovi (il socio deve già essere iscritto al
// circolo) e niente opzione "Gestore" (promuovere un pari gestore resta
// una decisione da /piattaforma, riservata al super-admin).
type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

export default function GestioneCollaboratori() {
  const circolo = useCircolo()
  const { data: membri, isLoading, error } = useMembriCircolo(circolo.id)

  const gestibili = (membri ?? [])
    .filter((m) => m.ruolo !== 'gestore' && m.socio)
    .sort((a, b) => {
      if (a.ruolo !== b.ruolo) return a.ruolo === 'collaboratore' ? -1 : 1
      const an = `${a.socio?.cognome ?? ''} ${a.socio?.nome ?? ''}`
      const bn = `${b.socio?.cognome ?? ''} ${b.socio?.nome ?? ''}`
      return an.localeCompare(bn, 'it')
    })

  return (
    <div>
      <div className="eyebrow">Collaboratori</div>
      <p className="sub mb-3">
        Scegli quali soci del circolo sono tuoi collaboratori (possono creare e gestire tornei) e
        quali possono anche dare lezioni.
      </p>
      <div className="card">
        {isLoading ? (
          <p className="text-ink-2">Caricamento soci…</p>
        ) : error ? (
          <p className={classiErrore}>Impossibile caricare i soci: {error.message}</p>
        ) : gestibili.length === 0 ? (
          <p className="text-ink-2">Nessun socio ancora iscritto a questo circolo.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {gestibili.map((m) => (
              <RigaMembro key={m.id} membro={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RigaMembro({ membro }: { membro: MembroCircolo }) {
  const qc = useQueryClient()
  const circolo = useCircolo()
  const [msg, setMsg] = useState<Esito>(null)
  const eCollaboratore = membro.ruolo === 'collaboratore'
  const nome = titleCase(membro.socio?.nome ?? '')
  const cognome = titleCase(membro.socio?.cognome ?? '')

  const salva = useMutation({
    mutationFn: async (patch: { ruolo: 'socio' | 'collaboratore'; puo_dare_lezioni: boolean }) => {
      const esito = await aggiornaRuoloMembro(membro.id, patch)
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Salvataggio non riuscito.')
    },
    onSuccess: () => {
      setMsg(null)
      qc.invalidateQueries({ queryKey: ['soci_circoli', circolo.id] })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-black/10 px-3 py-2.5">
      <Avatar iniziali={iniziali(membro.socio?.nome ?? '', membro.socio?.cognome ?? '')} titolo={`${cognome} ${nome}`} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{cognome} {nome}</div>
        <div className="truncate text-xs text-ink-3">{membro.socio?.email}</div>
      </div>

      <label className="flex items-center gap-1.5 text-sm text-ink-2">
        <input
          type="checkbox"
          className="h-4 w-4 accent-verde-600"
          checked={eCollaboratore}
          disabled={salva.isPending}
          onChange={(e) =>
            salva.mutate({ ruolo: e.target.checked ? 'collaboratore' : 'socio', puo_dare_lezioni: false })
          }
        />
        Collaboratore
      </label>

      {eCollaboratore && (
        <label className="flex items-center gap-1.5 text-sm text-ink-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-verde-600"
            checked={membro.puo_dare_lezioni}
            disabled={salva.isPending}
            onChange={(e) => salva.mutate({ ruolo: 'collaboratore', puo_dare_lezioni: e.target.checked })}
          />
          Può dare lezioni
        </label>
      )}

      {msg && <p className={`w-full ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}
