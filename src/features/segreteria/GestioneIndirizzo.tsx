import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiInput, classiOk } from '@/components/stili'
import { useCircolo } from '@/circolo/useCircolo'
import { salvaIndirizzoCircolo } from '@/features/piattaforma/datiPiattaforma'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

// Indirizzo del circolo: geocodificato in coordinate al salvataggio (vedi
// salvaIndirizzoCircolo) e usato dal carosello di scelta circolo per
// ordinare i circoli più vicini alla posizione del socio.
export default function GestioneIndirizzo() {
  const circolo = useCircolo()
  const qc = useQueryClient()
  const [indirizzo, setIndirizzo] = useState(circolo.indirizzo ?? '')
  const [msg, setMsg] = useState<Esito>(null)

  const salva = useMutation({
    mutationFn: async () => {
      const esito = await salvaIndirizzoCircolo(circolo.id, indirizzo)
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Salvataggio non riuscito.')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['circolo', circolo.slug] })
      setMsg({ tipo: 'ok', testo: 'Indirizzo salvato: ora il circolo comparirà ordinato per vicinanza ai soci.' })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <div>
      <div className="eyebrow">SEDE DEL CIRCOLO</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          Serve a mostrare il circolo più vicino ai soci nella schermata di scelta dopo il login.
          Inserisci via, città e provincia per una geolocalizzazione precisa.
        </p>
        <label className="block">
          <span className="etichetta !mb-1">Indirizzo</span>
          <input
            type="text"
            placeholder="Es. Via Playa 3, 98066 Patti (ME)"
            className={`${classiInput} !mt-0 w-full max-w-md`}
            value={indirizzo}
            onChange={(e) => {
              setIndirizzo(e.target.value)
              setMsg(null)
            }}
          />
        </label>
        {circolo.latitudine != null && (
          <p className="mt-1 text-xs text-ink-2">Posizione attuale trovata e salvata.</p>
        )}
        <button
          type="button"
          className="btn mt-3"
          disabled={salva.isPending}
          onClick={() => {
            setMsg(null)
            salva.mutate()
          }}
        >
          {salva.isPending ? 'Ricerca indirizzo…' : 'Salva indirizzo'}
        </button>
        {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
      </div>
    </div>
  )
}
