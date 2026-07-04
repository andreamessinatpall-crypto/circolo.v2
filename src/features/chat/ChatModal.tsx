import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { titleCase } from '@/lib/formato'
import { messaggioErrore } from '@/lib/errori'
import { useConversazione } from './useChat'

interface Props {
  profiloId: string
  amico: { id: string; etichetta: string }
  onChiudi: () => void
}

// Chat 1-a-1 mostrata come overlay, raggiungibile solo dall'icona chat sulla
// card amico in AmiciProfilo.tsx (nessuna pagina/route dedicata).
export default function ChatModal({ profiloId, amico, onChiudi }: Props) {
  const { conversazione, caricamento, errore, invia, segnaLetti } = useConversazione(profiloId, amico.id)
  const [testo, setTesto] = useState('')
  const fineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    segnaLetti.mutate()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onChiudi])

  useEffect(() => {
    fineRef.current?.scrollIntoView({ block: 'end' })
  }, [conversazione.length])

  function handleInvia(e: FormEvent) {
    e.preventDefault()
    const testoPulito = testo.trim()
    if (!testoPulito) return
    setTesto('')
    invia.mutate(testoPulito)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onChiudi}
    >
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-conv-head">
          <span className="chat-conv-nome">{titleCase(amico.etichetta)}</span>
          <button type="button" className="chat-conv-back" onClick={onChiudi} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <div className="chat-conv-messaggi">
          {caricamento ? (
            <p className="sub">Caricamento…</p>
          ) : errore ? (
            <p className="msg-errore">{messaggioErrore(errore)}</p>
          ) : conversazione.length === 0 ? (
            <p className="sub text-center">Nessun messaggio. Scrivi il primo!</p>
          ) : (
            conversazione.map((m) => (
              <div key={m.id} className={'chat-bolla' + (m.mittente_id === profiloId ? ' mia' : '')}>
                <p>{m.testo}</p>
              </div>
            ))
          )}
          <div ref={fineRef} />
        </div>

        {invia.error && <p className="msg-errore mb-2">{messaggioErrore(invia.error)}</p>}

        <form onSubmit={handleInvia} className="chat-conv-form">
          <input
            type="text"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Scrivi un messaggio…"
            disabled={invia.isPending}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-sm" disabled={invia.isPending || !testo.trim()}>
            Invia
          </button>
        </form>
      </div>
    </div>
  )
}
