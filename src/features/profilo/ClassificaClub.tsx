import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { titleCase } from '@/lib/formato'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti } from './livelliPunti'
import { MedagliaPodio } from '@/components/MedagliaPodio'

interface RigaClassifica {
  posizione: number
  etichetta: string | null
  punti: number | null
  is_me: boolean
}

const TOP = 10

function RigaCl({ r }: { r: RigaClassifica }) {
  const isPodio = r.posizione >= 1 && r.posizione <= 3
  const lv = livelloDaPunti(r.punti ?? 0, LIVELLI_PUNTI_DEFAULT)
  const cfg = LIVELLI_PUNTI_DEFAULT[lv - 1]
  return (
    <div className={'classifica-riga' + (r.is_me ? ' io' : '')}>
      {isPodio ? (
        <span style={{ flexShrink: 0, width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MedagliaPodio pos={r.posizione as 1 | 2 | 3} />
        </span>
      ) : (
        <span className="cl-pos">{r.posizione}º</span>
      )}
      <span className="cl-nick">
        {r.etichetta ? titleCase(String(r.etichetta)) : cfg.nome}
      </span>
      <span className="cl-punti">{r.punti ?? 0} pt</span>
    </div>
  )
}

// Classifica del club: estratta a sé (usata sia dalla scheda "Classifica" di
// Area Club per il giocatore, sia dalla tab "Club" di collaboratore/
// istruttore in ClubProfilo.tsx) per non duplicare la logica della query.
export default function ClassificaClub({ nascondiHero = false }: { nascondiHero?: boolean }) {
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

  const miaFuori = mioIdx >= TOP
  const gapCount = miaFuori ? mioIdx - TOP : 0
  const altriCount = miaFuori
    ? lista.length - mioIdx - 1
    : Math.max(0, lista.length - TOP)
  const haRigheNascoste = lista.length > TOP

  return (
    <>
      {/* ── Hero banner ──────────────────────────────────────── */}
      {!nascondiHero && !query.isLoading && !query.error && lista.length > 0 && (
        <div className="club-hero">
          <div className="club-hero-sx">
            <div className="club-hero-kicker">La tua posizione</div>
            <div className="club-hero-pos">
              {mia ? `${mia.posizione}°` : '—'}
            </div>
          </div>
          <div className="club-hero-stats">
            <div className="club-hero-stat">
              <span className="club-hero-stat-num">{lista.length}</span>
              <span className="club-hero-stat-lbl">Iscritti</span>
            </div>
            <div className="club-hero-div" />
            <div className="club-hero-stat">
              <span className="club-hero-stat-num">{lista[0]?.punti ?? 0}</span>
              <span className="club-hero-stat-lbl">Top score</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Classifica ───────────────────────────────────────── */}
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
          <div className="flex flex-col gap-0.5">
            {espanso ? (
              lista.map((r, i) => <RigaCl key={i} r={r} />)
            ) : (
              <>
                {lista.slice(0, TOP).map((r, i) => <RigaCl key={i} r={r} />)}

                {miaFuori ? (
                  <>
                    {gapCount > 0 && (
                      <button className="cl-espandi" onClick={() => setEspanso(true)}>
                        ▼ {gapCount} {gapCount === 1 ? 'giocatore' : 'giocatori'}
                      </button>
                    )}
                    {mioIdx >= 0 && <RigaCl r={lista[mioIdx]} />}
                    {altriCount > 0 && (
                      <button className="cl-espandi" onClick={() => setEspanso(true)}>
                        ▼ {altriCount} {altriCount === 1 ? 'altro' : 'altri'}
                      </button>
                    )}
                  </>
                ) : (
                  altriCount > 0 && (
                    <button className="cl-espandi" onClick={() => setEspanso(true)}>
                      ▼ {altriCount} {altriCount === 1 ? 'altro' : 'altri'}
                    </button>
                  )
                )}
              </>
            )}

            {espanso && haRigheNascoste && (
              <button className="cl-espandi cl-comprimi" onClick={() => setEspanso(false)}>
                ▲ Comprimi
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
