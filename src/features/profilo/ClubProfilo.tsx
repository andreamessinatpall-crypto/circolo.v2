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
import { SportIcona } from '@/components/IconeSport'
import DisponibilitaIstruttoreModal from '@/features/lezioni/DisponibilitaIstruttoreModal'

interface RigaClassifica {
  posizione: number
  etichetta: string | null
  punti: number | null
  is_me: boolean
}

const TOP = 10

const PODIO_CFG = {
  1: { hi: '#FFE566', mid: '#F5C518', lo: '#C49A08', text: '#6B4700' },
  2: { hi: '#F4F4F4', mid: '#C8C8C8', lo: '#989898', text: '#444' },
  3: { hi: '#ECA96E', mid: '#CD7F32', lo: '#9B5E1E', text: '#4A2800' },
} as const

function MedagliaPodio({ pos }: { pos: 1 | 2 | 3 }) {
  const c = PODIO_CFG[pos]
  return (
    <div style={{ flexShrink: 0, width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 30, height: 30,
        borderRadius: '50%',
        background: `linear-gradient(145deg, ${c.hi} 0%, ${c.mid} 50%, ${c.lo} 100%)`,
        boxShadow: `0 0 0 2px ${c.lo}, inset 0 1px 0 rgba(255,255,255,0.55), 0 3px 8px rgba(0,0,0,0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: '0.8rem',
        color: c.text,
        letterSpacing: '-0.01em',
        userSelect: 'none' as const,
        textShadow: '0 1px 0 rgba(255,255,255,0.5)',
      }}>
        {pos}
      </div>
    </div>
  )
}

function RigaCl({ r }: { r: RigaClassifica }) {
  const isPodio = r.posizione >= 1 && r.posizione <= 3
  const lv = livelloDaPunti(r.punti ?? 0, LIVELLI_PUNTI_DEFAULT)
  const cfg = LIVELLI_PUNTI_DEFAULT[lv - 1]
  return (
    <div className={'classifica-riga' + (r.is_me ? ' io' : '')}>
      {isPodio
        ? <MedagliaPodio pos={r.posizione as 1 | 2 | 3} />
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

function CardStaff({ voce, onClick }: { voce: VoceStaff; onClick?: () => void }) {
  const cliccabile = voce.ruolo === 'istruttore' && !!onClick
  return (
    <div
      className={'amici-card' + (cliccabile ? ' cursor-pointer' : '')}
      onClick={onClick}
      role={cliccabile ? 'button' : undefined}
      tabIndex={cliccabile ? 0 : undefined}
      onKeyDown={
        cliccabile
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick!()
              }
            }
          : undefined
      }
      title={cliccabile ? 'Vedi le sue disponibilità per lezioni' : undefined}
    >
      <MedagliaRuolo ruolo={voce.ruolo} size={40} />
      <div className="amici-card-info">
        <div className="amici-card-nome">
          {voce.etichetta}
          {voce.sport && <span className="amici-sport-ico"><SportIcona sport={voce.sport} /></span>}
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
  const [istruttoreAperto, setIstruttoreAperto] = useState<VoceStaff | null>(null)
  const { profilo } = useAuth()
  const istruttore = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin
  const { staff } = useAmici(profilo?.id ?? '')
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
              <CardStaff
                key={s.id}
                voce={s}
                onClick={s.ruolo === 'istruttore' ? () => setIstruttoreAperto(s) : undefined}
              />
            ))}
          </div>
        </SezClub>
      )}

      {istruttoreAperto && (
        <DisponibilitaIstruttoreModal
          istruttoreId={istruttoreAperto.id}
          nome={istruttoreAperto.etichetta}
          onChiudi={() => setIstruttoreAperto(null)}
        />
      )}

    </div>
  )
}
