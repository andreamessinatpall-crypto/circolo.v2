import { useEffect, useRef, useState, type FormEvent } from 'react'
import { classiErrore } from '@/components/stili'

interface Props {
  titolo?: string
  descrizione?: string
  onConferma: (password: string) => Promise<void>
  onAnnulla: () => void
}

export default function ModalConfermaPassword({
  titolo = 'Conferma con password',
  descrizione = 'Inserisci la password attuale per procedere.',
  onConferma,
  onAnnulla,
}: Props) {
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onAnnulla() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onAnnulla])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrore('')
    setInCorso(true)
    try {
      await onConferma(password)
    } catch (err) {
      setErrore((err as Error).message ?? 'Operazione non riuscita.')
      setInCorso(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onAnnulla}
    >
      <div
        className="card w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg">{titolo}</h2>
        <p className="sub mb-4 text-sm">{descrizione}</p>

        <form onSubmit={onSubmit}>
          <label htmlFor="modal-pw">Password</label>
          <input
            id="modal-pw"
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errore && <p className={`mt-3 ${classiErrore}`}>{errore}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="btn flex-1"
              disabled={inCorso}
            >
              {inCorso ? 'Verifica…' : 'Conferma'}
            </button>
            <button
              type="button"
              className="btn btn-secondario flex-1"
              onClick={onAnnulla}
              disabled={inCorso}
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
