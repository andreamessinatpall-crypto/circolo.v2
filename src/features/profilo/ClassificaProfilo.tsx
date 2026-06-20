import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { titleCase } from '@/lib/formato'

interface RigaClassifica {
  posizione: number
  etichetta: string | null
  punti: number | null
  is_me: boolean
}

export default function ClassificaProfilo() {
  const query = useQuery({
    queryKey: ['classifica_visibile'],
    queryFn: async () => {
      // Classifica che rispetta la visibilità di ciascun socio (solo amici / tutti / nascosto).
      const { data, error } = await supabase.rpc('classifica_visibile')
      if (error) throw error
      return (data ?? []) as RigaClassifica[]
    },
  })

  if (query.isLoading) {
    return <Contenitore>Caricamento…</Contenitore>
  }

  if (query.error) {
    return (
      <Contenitore>
        Classifica non disponibile: potrebbe servire lo script dei punti su Supabase.
        <span className="mt-1 block text-xs text-ink-3">
          Dettaglio: {messaggioErrore(query.error)}
        </span>
      </Contenitore>
    )
  }

  const lista = query.data ?? []
  const mia = lista.find((r) => r.is_me)

  return (
    <div className="card">
      <div className="mb-5 flex items-baseline gap-3">
        <h2 className="text-xl">Classifica</h2>
        <span className="text-sm text-ink-2">
          La tua posizione:{' '}
          <strong className="text-verde-700">{mia ? mia.posizione + 'º' : '—'}</strong>
        </span>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-ink-3">
          Nessun socio da mostrare: gioca qualche partita per comparire in classifica.
        </p>
      ) : (
        <>
          {!mia && (
            <p className="mb-3 text-sm text-ink-3">
              Non sei ancora in classifica: gioca qualche partita per comparire.
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {lista.map((r) => (
              <div
                key={r.posizione + '-' + (r.etichetta ?? '')}
                className={'classifica-riga' + (r.is_me ? ' io' : '')}
              >
                <span className="cl-pos">{r.posizione}º</span>
                <span className="cl-nick">
                  {r.etichetta ? titleCase(String(r.etichetta)) : '—'}
                </span>
                <span className="cl-punti">{r.punti ?? 0} pt</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Contenitore({ children }: { children: ReactNode }) {
  return <div className="card text-ink-2">{children}</div>
}
