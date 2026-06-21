import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { titleCase } from '@/lib/formato'
import BadgeProfilo from './badge/BadgeProfilo'

interface RigaClassifica {
  posizione: number
  etichetta: string | null
  punti: number | null
  is_me: boolean
}

export default function ClubProfilo() {
  const query = useQuery({
    queryKey: ['classifica_visibile'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('classifica_visibile')
      if (error) throw error
      return (data ?? []) as RigaClassifica[]
    },
  })

  const lista = query.data ?? []
  const mia = lista.find((r) => r.is_me)

  return (
    <div>
      <div className="eyebrow">Classifica del club</div>
      <div className="bacheca">
        {query.isLoading && <p className="text-sm">Caricamento…</p>}

        {query.error && (
          <p className="text-sm">
            Classifica non disponibile: potrebbe servire lo script dei punti su Supabase.
            <span className="mt-1 block text-xs opacity-80">
              Dettaglio: {messaggioErrore(query.error)}
            </span>
          </p>
        )}

        {!query.isLoading && !query.error && lista.length === 0 && (
          <p className="text-sm">
            Nessun socio da mostrare: gioca qualche partita per comparire in classifica.
          </p>
        )}

        {!query.error && lista.length > 0 && (
          <>
            <div className="mb-3 text-sm">
              La tua posizione:{' '}
              <strong>{mia ? mia.posizione + 'º' : 'non in classifica'}</strong>
            </div>
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

      <div className="eyebrow">I tuoi traguardi</div>
      <BadgeProfilo />
    </div>
  )
}
