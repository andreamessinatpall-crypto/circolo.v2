import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import { classiErrore, classiEtichetta } from '@/components/stili'
import AuthHero from '@/pages/AuthHero'
import { iscrivitiCircolo, useCircoliDaScoprire, useMieCircoli } from './datiCircoloSocio'
import type { Circolo } from '@/features/piattaforma/tipi'

// Schermata di scelta circolo: mostrata quando il socio appartiene a più
// circoli (deve scegliere quale usare) o a nessuno (deve iscriversi a uno
// per iniziare). Con un solo circolo appartenente, App.tsx ci passa oltre
// senza mai mostrarla (redirect diretto).
export default function SceltaCircoloPage() {
  const { profilo, esci } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [errore, setErrore] = useState('')

  const { data: mieiCircoli, isLoading: caricoMiei } = useMieCircoli(profilo?.id)
  const idGiaMembro = (mieiCircoli ?? []).map((m) => m.circolo.id)
  const { data: daScoprire, isLoading: caricoScoprire } = useCircoliDaScoprire(idGiaMembro)

  const iscriviti = useMutation({
    mutationFn: async (circolo: Circolo) => {
      if (!profilo) throw new Error("Devi effettuare l'accesso.")
      const esito = await iscrivitiCircolo(circolo.id, profilo.id)
      if (!esito.ok) throw new Error(esito.messaggio)
      return circolo
    },
    onSuccess: (circolo) => {
      qc.invalidateQueries({ queryKey: ['miei-circoli'] })
      navigate(`/c/${circolo.slug}`)
    },
    onError: (e: Error) => setErrore(e.message),
  })

  return (
    <div className="auth-page flex min-h-[100dvh] flex-col items-center px-4 py-5">
      <div className="flex w-full max-w-[420px] flex-1 flex-col justify-center">
        <AuthHero />

        <div className="card auth-card">
          <h1 className="mb-1 text-center text-2xl">Scegli il tuo circolo</h1>

          {caricoMiei ? (
            <p className="mt-4 text-ink-2">Caricamento…</p>
          ) : (mieiCircoli ?? []).length > 0 ? (
            <div className="mt-4 flex flex-col gap-2.5">
              {mieiCircoli!.map((m) => (
                <button
                  key={m.circolo.id}
                  type="button"
                  className="btn btn-block"
                  onClick={() => navigate(`/c/${m.circolo.slug}`)}
                >
                  {m.circolo.nome}
                </button>
              ))}
            </div>
          ) : (
            <p className="sub mb-4">
              Non sei ancora iscritto a nessun circolo. Scegline uno qui sotto per iniziare.
            </p>
          )}

          <div className="mt-6">
            <div className={`${classiEtichetta} mb-2`}>Altri circoli disponibili</div>
            {caricoScoprire ? (
              <p className="text-ink-2">Caricamento…</p>
            ) : (daScoprire ?? []).length === 0 ? (
              <p className="text-sm text-ink-2">Nessun altro circolo disponibile al momento.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {daScoprire!.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="btn btn-secondario btn-block"
                    disabled={iscriviti.isPending}
                    onClick={() => {
                      setErrore('')
                      iscriviti.mutate(c)
                    }}
                  >
                    Iscriviti a {c.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          {errore && <p className={`mt-4 ${classiErrore}`}>{errore}</p>}

          <button type="button" className="btn btn-secondario btn-block mt-6" onClick={() => esci()}>
            Esci
          </button>
        </div>
      </div>
    </div>
  )
}
