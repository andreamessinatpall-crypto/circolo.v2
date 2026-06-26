import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { titleCase } from '@/lib/formato'
import BadgeProfilo from './badge/BadgeProfilo'
import { TorneiInCorso, TorneiInProgramma } from './TorneiClub'

interface RigaClassifica {
  posizione: number
  etichetta: string | null
  punti: number | null
  is_me: boolean
}

const TOP = 10

function RigaCl({ r }: { r: RigaClassifica }) {
  return (
    <div className={'classifica-riga' + (r.is_me ? ' io' : '')}>
      <span className="cl-pos">{r.posizione}º</span>
      <span className="cl-nick">
        {r.etichetta ? titleCase(String(r.etichetta)) : '—'}
      </span>
      <span className="cl-punti">{r.punti ?? 0} pt</span>
    </div>
  )
}

export default function ClubProfilo() {
  const [espanso, setEspanso] = useState(false)

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
  const mioIdx = lista.findIndex((r) => r.is_me)

  // L'utente è fuori dalla top-10 se il suo indice nella lista è >= TOP.
  const miaFuori = mioIdx >= TOP
  // Righe "nascoste" tra la top-10 e la riga dell'utente.
  const gapCount = miaFuori ? mioIdx - TOP : 0
  // Righe dopo la riga dell'utente (se fuori top-10) o dopo la top-10.
  const altriCount = miaFuori
    ? lista.length - mioIdx - 1
    : Math.max(0, lista.length - TOP)

  const haRigheNascoste = lista.length > TOP

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
              {espanso ? (
                lista.map((r, i) => <RigaCl key={i} r={r} />)
              ) : (
                <>
                  {/* Top 10 sempre visibili */}
                  {lista.slice(0, TOP).map((r, i) => <RigaCl key={i} r={r} />)}

                  {miaFuori ? (
                    <>
                      {/* Espandi verso l'alto (righe tra top-10 e utente) */}
                      {gapCount > 0 && (
                        <button className="cl-espandi" onClick={() => setEspanso(true)}>
                          ▼ {gapCount} {gapCount === 1 ? 'giocatore' : 'giocatori'}
                        </button>
                      )}
                      {/* Riga dell'utente sempre visibile */}
                      {mioIdx >= 0 && <RigaCl r={lista[mioIdx]} />}
                      {/* Espandi verso il basso (righe dopo utente) */}
                      {altriCount > 0 && (
                        <button className="cl-espandi" onClick={() => setEspanso(true)}>
                          ▼ {altriCount} {altriCount === 1 ? 'altro' : 'altri'}
                        </button>
                      )}
                    </>
                  ) : (
                    /* Utente in top-10 o non in classifica: espandi tutto ciò che è oltre */
                    altriCount > 0 && (
                      <button className="cl-espandi" onClick={() => setEspanso(true)}>
                        ▼ {altriCount} {altriCount === 1 ? 'altro' : 'altri'}
                      </button>
                    )
                  )}
                </>
              )}

              {/* Bottone comprimi (solo quando espanso e ci sono righe extra) */}
              {espanso && haRigheNascoste && (
                <button className="cl-espandi cl-comprimi" onClick={() => setEspanso(false)}>
                  ▲ Comprimi
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="eyebrow">Tornei in corso</div>
      <div className="card">
        <TorneiInCorso />
      </div>

      <div className="eyebrow">Tornei in programma</div>
      <div className="card">
        <TorneiInProgramma />
      </div>

      <div className="eyebrow">I tuoi traguardi</div>
      <BadgeProfilo />
    </div>
  )
}
