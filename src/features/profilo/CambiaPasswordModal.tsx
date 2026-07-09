import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { supabase } from '@/lib/supabase'
import { classiErrore, classiOk } from '@/components/stili'

interface Props {
  onChiudi: () => void
}

// Scheda a parte per il cambio password (richiesto esplicitamente, prima era
// dentro lo stesso form dei dati): un portale su document.body, altrimenti
// erediterebbe lo stile "vetro" trasparente della schermata account.
export default function CambiaPasswordModal({ onChiudi }: Props) {
  const [nuova, setNuova] = useState('')
  const [conferma, setConferma] = useState('')
  const [errore, setErrore] = useState('')
  const [fatto, setFatto] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useBloccaScrollBody()

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onChiudi])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore('')
    if (nuova.length < 8) { setErrore('La nuova password deve avere almeno 8 caratteri.'); return }
    if (nuova !== conferma) { setErrore('Le password non coincidono.'); return }
    setInCorso(true)
    const { error } = await supabase.auth.updateUser({ password: nuova })
    setInCorso(false)
    if (error) { setErrore(error.message); return }
    setFatto(true)
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {fatto ? (
          <>
            <h2 className="mb-1 text-lg">Password cambiata</h2>
            <p className={`mb-4 ${classiOk}`}>La tua password è stata aggiornata.</p>
            <button type="button" className="btn w-full" onClick={onChiudi}>Fatto</button>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-lg">Cambia password</h2>
            <p className="sub mb-4 text-sm">Inserisci la nuova password per il tuo account.</p>

            <form onSubmit={onSubmit}>
              <label htmlFor="nuova-pw">Nuova password</label>
              <input
                id="nuova-pw"
                ref={inputRef}
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 caratteri"
                value={nuova}
                onChange={(e) => setNuova(e.target.value)}
                required
              />

              <label htmlFor="conferma-pw" className="mt-3">Conferma password</label>
              <input
                id="conferma-pw"
                type="password"
                autoComplete="new-password"
                placeholder="Ripeti la password"
                value={conferma}
                onChange={(e) => setConferma(e.target.value)}
                required
              />

              {errore && <p className={`mt-3 ${classiErrore}`}>{errore}</p>}

              <div className="mt-4 flex gap-2">
                <button type="submit" className="btn flex-1" disabled={inCorso}>
                  {inCorso ? 'Salvataggio…' : 'Salva'}
                </button>
                <button type="button" className="btn btn-secondario flex-1" onClick={onChiudi} disabled={inCorso}>
                  Annulla
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
