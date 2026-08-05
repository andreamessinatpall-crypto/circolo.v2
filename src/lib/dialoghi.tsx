import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'

// Sostituisce window.alert()/window.confirm(): dialoghi con la grafica
// dell'app invece della finestra nativa del browser (che mostra il dominio
// del sito ed espone al rischio "impedisci altre finestre di dialogo" — un
// tocco per sbaglio silenzia TUTTI gli alert/confirm successivi, senza modo
// per l'app di accorgersene). Uso: montare <DialogoHost /> una sola volta
// vicino alla radice (vedi App.tsx), poi richiamare avviso()/conferma() da
// qualsiasi punto del codice, come si farebbe con window.alert/confirm.

interface RichiestaAvviso {
  tipo: 'avviso'
  messaggio: string
}
interface RichiestaConferma {
  tipo: 'conferma'
  messaggio: string
  labelConferma?: string
  pericolo?: boolean
}
type Richiesta = RichiestaAvviso | RichiestaConferma

let impostaRichiesta: ((r: Richiesta | null) => void) | null = null
let risolviAttuale: ((v: boolean) => void) | null = null

function apri(r: Richiesta): Promise<boolean> {
  return new Promise((resolve) => {
    // Un dialogo alla volta: se ce n'era già uno in sospeso lo chiudiamo
    // come annullato prima di aprire il nuovo, per non lasciare la promise
    // precedente agganciata per sempre.
    risolviAttuale?.(false)
    risolviAttuale = resolve
    impostaRichiesta?.(r)
  })
}

/** Sostituisce window.alert(messaggio). */
export function avviso(messaggio: string): Promise<void> {
  return apri({ tipo: 'avviso', messaggio }).then(() => undefined)
}

/** Sostituisce window.confirm(messaggio): true se confermato, false se annullato/chiuso. */
export function conferma(
  messaggio: string,
  opzioni?: { labelConferma?: string; pericolo?: boolean },
): Promise<boolean> {
  return apri({ tipo: 'conferma', messaggio, ...opzioni })
}

export function DialogoHost() {
  const [richiesta, setRichiestaLocale] = useState<Richiesta | null>(null)

  useEffect(() => {
    impostaRichiesta = setRichiestaLocale
    return () => {
      impostaRichiesta = null
    }
  }, [])

  useBloccaScrollBody(richiesta !== null)

  useEffect(() => {
    if (!richiesta) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') chiudi(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [richiesta])

  if (!richiesta) return null

  function chiudi(valore: boolean) {
    risolviAttuale?.(valore)
    risolviAttuale = null
    setRichiestaLocale(null)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={() => chiudi(false)}
    >
      <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <p className="sub mt-0 mb-4 text-sm whitespace-pre-line">{richiesta.messaggio}</p>
        {richiesta.tipo === 'avviso' ? (
          <button type="button" className="btn btn-block" onClick={() => chiudi(true)}>
            OK
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className={`btn${richiesta.pericolo ? ' btn-pericolo' : ''} flex-1`}
              onClick={() => chiudi(true)}
            >
              {richiesta.labelConferma ?? 'Conferma'}
            </button>
            <button type="button" className="btn btn-secondario flex-1" onClick={() => chiudi(false)}>
              Annulla
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
