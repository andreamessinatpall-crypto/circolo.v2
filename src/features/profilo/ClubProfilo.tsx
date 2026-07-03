import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { titleCase } from '@/lib/formato'
import { useAuth } from '@/auth/useAuth'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti } from './livelliPunti'
import { TorneiInCorso, TorneiInProgramma } from './TorneiClub'
import { useAmici, type VoceStaff } from './amici/useAmici'
import { MedagliaRuolo } from './ruoloBadge'

interface RigaClassifica {
  posizione: number
  etichetta: string | null
  punti: number | null
  is_me: boolean
}

const TOP = 10

function podioEmoji(pos: number): string | null {
  if (pos === 1) return '🥇'
  if (pos === 2) return '🥈'
  if (pos === 3) return '🥉'
  return null
}

function RigaCl({ r }: { r: RigaClassifica }) {
  const podio = podioEmoji(r.posizione)
  const lv = livelloDaPunti(r.punti ?? 0, LIVELLI_PUNTI_DEFAULT)
  const cfg = LIVELLI_PUNTI_DEFAULT[lv - 1]
  return (
    <div className={'classifica-riga' + (r.is_me ? ' io' : '')}>
      {podio
        ? <span className="cl-podio">{podio}</span>
        : <span className="cl-pos">{r.posizione}º</span>}
      <span className="cl-nick">
        {r.etichetta ? titleCase(String(r.etichetta)) : cfg.nome}
      </span>
      <span className="cl-punti">{r.punti ?? 0} pt</span>
    </div>
  )
}

function Ico({ d, children }: { d?: string; children?: ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d ? <path d={d} /> : children}
    </svg>
  )
}

const IcoTrofeo = <Ico d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" />
const IcoZap = <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Ico>
const IcoCal = <Ico><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Ico>
const IcoScudo = <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />

function sportEmoji(sport: string | null): string | null {
  if (sport === 'padel') return '🎾'
  if (sport === 'calcio') return '⚽'
  if (sport === 'entrambi') return '🎾⚽'
  return null
}

function CardStaff({ voce }: { voce: VoceStaff }) {
  const sport = sportEmoji(voce.sport)
  return (
    <div className="amici-card">
      <MedagliaRuolo ruolo={voce.ruolo} size={40} />
      <div className="amici-card-info">
        <div className="amici-card-nome">
          {voce.etichetta}
          {sport && <span className="amici-sport-ico">{sport}</span>}
        </div>
        <div className="amici-card-sub capitalize">{voce.ruolo}</div>
      </div>
    </div>
  )
}


function SezClub({
  icona,
  titolo,
  badge,
  children,
}: {
  icona?: ReactNode
  titolo: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <div className="club-sez-header">
        {icona && <span className="club-sez-icona">{icona}</span>}
        <h2 className="club-sez-titolo">{titolo}</h2>
        {badge}
      </div>
      {children}
    </section>
  )
}

export default function ClubProfilo() {
  const [espanso, setEspanso] = useState(false)
  const { profilo, ricaricaProfilo } = useAuth()
  const istruttore = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin
  const { staff } = useAmici(profilo?.id ?? '')
  const [mostraNome, setMostraNome] = useState(profilo?.mostra_in_classifica ?? false)

  async function handleToggleMostraNome() {
    const nuovo = !mostraNome
    setMostraNome(nuovo)
    await supabase.from('soci').update({ mostra_in_classifica: nuovo }).eq('id', profilo!.id)
    await ricaricaProfilo()
    query.refetch()
  }

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
    <div className="club-page">

      {/* ── Hero banner ──────────────────────────────────────── */}
      {!istruttore && !query.isLoading && !query.error && lista.length > 0 && (
        <div className="club-hero">
          <div className="club-hero-sx">
            <div className="club-hero-kicker">La tua posizione</div>
            <div className="club-hero-pos">
              {mia ? `${mia.posizione}°` : '—'}
            </div>
            <div className="club-hero-pos-sub">
              {mia ? `${mia.punti ?? 0} punti` : 'Non ancora in classifica'}
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
      <SezClub icona={IcoTrofeo} titolo="Classifica del club">
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
      </SezClub>

      {/* ── Visibilità in classifica ─────────────────────────── */}
      {!istruttore && profilo && (
        <div className="card" style={{ marginTop: '-0.25rem' }}>
          <label className="dati-check-row" style={{ margin: 0 }}>
            <input
              type="checkbox"
              className="dati-check"
              checked={mostraNome}
              onChange={handleToggleMostraNome}
            />
            <span>
              <span className="dati-check-titolo">Mostra il mio nome nella classifica</span>
              <span className="dati-check-sub">Se disattivato, comparirà solo il livello.</span>
            </span>
          </label>
        </div>
      )}

      {/* ── Tornei in corso ──────────────────────────────────── */}
      <SezClub icona={IcoZap} titolo="Tornei in corso">
        <div className="card">
          <TorneiInCorso />
        </div>
      </SezClub>

      {/* ── Tornei in programma ──────────────────────────────── */}
      <SezClub icona={IcoCal} titolo="Tornei in programma">
        <div className="card">
          <TorneiInProgramma />
        </div>
      </SezClub>

      {/* ── Staff del club ──────────────────────────────────── */}
      {staff.length > 0 && (
        <SezClub icona={IcoScudo} titolo="Staff del club">
          <div className="flex flex-col gap-2">
            {staff.map((s) => (
              <CardStaff key={s.id} voce={s} />
            ))}
          </div>
        </SezClub>
      )}

    </div>
  )
}
