import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { avviso } from '@/lib/dialoghi'
import { messaggioErrore } from '@/lib/errori'
import { logoDaFile } from '@/lib/immagini'
import { useCircolo } from '@/circolo/useCircolo'
import { salvaLogoCircolo } from '@/features/piattaforma/datiPiattaforma'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

// Logo del circolo: salvato come piccolo PNG "data URL" (stesso pattern di
// logoDaFile già usato per foto profilo e loghi squadre — niente Storage).
// Prima era modificabile solo dal pannello piattaforma (super-admin): il
// gestore ora lo carica direttamente da qui. Si salva subito alla scelta
// del file, senza un bottone "Salva" a parte — stesso comportamento delle
// altre immagini dell'app (vedi DatiProfilo.tsx).
export default function GestioneLogo() {
  const circolo = useCircolo()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<Esito>(null)

  const salva = useMutation({
    mutationFn: async (logoUrl: string | null) => {
      const esito = await salvaLogoCircolo(circolo.id, logoUrl)
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Salvataggio non riuscito.')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['circolo', circolo.slug] })
      setMsg({ tipo: 'ok', testo: 'Logo aggiornato.' })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  async function carica(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMsg(null)
    try {
      const dataUrl = await logoDaFile(file, 240, 4096)
      salva.mutate(dataUrl)
    } catch (err) {
      avviso(messaggioErrore(err))
    }
  }

  return (
    <div>
      <div className="eyebrow">LOGO DEL CIRCOLO</div>
      <div className="card">
        <p className="sub m-0 mb-3">
          Compare nell'intestazione dell'app e nella schermata di scelta circolo dopo il login.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[var(--border2)] bg-verde-50 text-2xl font-bold text-verde-800">
              {circolo.logo_url ? (
                <img src={circolo.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                circolo.nome.charAt(0).toUpperCase()
              )}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-verde-700 text-white shadow disabled:opacity-60"
              title={circolo.logo_url ? 'Cambia logo' : 'Carica logo'}
              disabled={salva.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <IconaCamera />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={carica} />
          </div>
          {circolo.logo_url && (
            <button
              type="button"
              className="btn btn-secondario !mt-0"
              disabled={salva.isPending}
              onClick={() => {
                setMsg(null)
                salva.mutate(null)
              }}
            >
              Rimuovi logo
            </button>
          )}
        </div>
        {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
      </div>
    </div>
  )
}

function IconaCamera() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
