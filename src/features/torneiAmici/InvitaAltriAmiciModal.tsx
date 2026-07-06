import { useState } from 'react'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { messaggioErrore } from '@/lib/errori'
import { titleCase } from '@/lib/formato'
import type { VoceAmico } from '@/features/profilo/amici/useAmici'

export default function InvitaAltriAmiciModal({
  amici,
  invita,
  onChiudi,
}: {
  amici: VoceAmico[]
  invita: {
    mutate: (amiciIds: string[], opts: { onSuccess: () => void }) => void
    isPending: boolean
    error: unknown
  }
  onChiudi: () => void
}) {
  useBloccaScrollBody()
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelezionati((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleInvita() {
    if (selezionati.size === 0) return
    invita.mutate(Array.from(selezionati), { onSuccess: onChiudi })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <div className="card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-xl">Invita altri amici</h2>

        {amici.length === 0 ? (
          <p className="sub mb-3">Tutti i tuoi amici sono già stati invitati a questo torneo.</p>
        ) : (
          <div className="flex flex-col gap-1 mb-3" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {amici.map((a) => (
              <label key={a.id} className="torneo-amici-check-riga">
                <input type="checkbox" checked={selezionati.has(a.id)} onChange={() => toggle(a.id)} />
                <span>{titleCase(a.etichetta)}</span>
              </label>
            ))}
          </div>
        )}

        {invita.error ? <p className="msg-errore mb-2">{messaggioErrore(invita.error)}</p> : null}

        <div className="flex gap-2">
          <button
            type="button"
            className="btn flex-1"
            onClick={handleInvita}
            disabled={selezionati.size === 0 || invita.isPending}
          >
            {invita.isPending ? 'Invito…' : 'Invita'}
          </button>
          <button type="button" className="btn btn-secondario" onClick={onChiudi}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
