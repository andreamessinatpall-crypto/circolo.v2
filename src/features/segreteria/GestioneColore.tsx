import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { useCircolo } from '@/circolo/useCircolo'
import { salvaColoreCircolo } from '@/features/piattaforma/datiPiattaforma'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

const COLORE_DEFAULT = '#0e4a78'
const RE_HEX = /^#[0-9a-fA-F]{6}$/

// Colore del tema: di default TUTTI i circoli hanno lo stesso colore (nessun
// colore_primario impostato — vedi temaCircolo.ts, che senza un valore
// lascia la palette base dell'app). Il gestore può scegliere di scostarsene
// per il proprio circolo; "Ripristina predefinito" torna al colore comune
// azzerando colore_primario invece di impostarlo esplicitamente allo stesso
// hex (così il circolo resta allineato a eventuali cambi futuri del colore
// di base dell'app, non "congelato" sul valore di oggi).
export default function GestioneColore() {
  const circolo = useCircolo()
  const qc = useQueryClient()
  const [colore, setColore] = useState(circolo.colore_primario ?? COLORE_DEFAULT)
  const [msg, setMsg] = useState<Esito>(null)

  const salva = useMutation({
    mutationFn: async (valore: string | null) => {
      const esito = await salvaColoreCircolo(circolo.id, valore)
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Salvataggio non riuscito.')
    },
    onSuccess: (_dato, valore) => {
      qc.invalidateQueries({ queryKey: ['circolo', circolo.slug] })
      setMsg({
        tipo: 'ok',
        testo: valore ? 'Colore del circolo aggiornato.' : 'Tornato al colore predefinito, uguale per tutti i circoli.',
      })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div>
      <div className="eyebrow">COLORE DEL CIRCOLO</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          Di default tutti i circoli hanno lo stesso colore. Puoi personalizzare quello del tuo: cambia i
          bottoni, le tab attive e gli accenti in tutta l'app.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            className="h-10 w-16 cursor-pointer rounded border border-[var(--border2)]"
            value={RE_HEX.test(colore) ? colore : COLORE_DEFAULT}
            onChange={(e) => {
              setColore(e.target.value)
              setMsg(null)
            }}
          />
          <input
            type="text"
            className="campo !mt-0 !w-32"
            value={colore}
            onChange={(e) => {
              setColore(e.target.value)
              setMsg(null)
            }}
          />
          <button
            type="button"
            className="btn !mt-0"
            disabled={salva.isPending || !RE_HEX.test(colore)}
            onClick={() => {
              setMsg(null)
              salva.mutate(colore)
            }}
          >
            Salva colore
          </button>
          {circolo.colore_primario && (
            <button
              type="button"
              className="btn btn-secondario !mt-0"
              disabled={salva.isPending}
              onClick={() => {
                setMsg(null)
                setColore(COLORE_DEFAULT)
                salva.mutate(null)
              }}
            >
              Ripristina predefinito
            </button>
          )}
        </div>
        {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
      </div>
    </div>
  )
}
