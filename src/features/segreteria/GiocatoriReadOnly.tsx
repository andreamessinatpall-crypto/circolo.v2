import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { titleCase } from '@/lib/formato'
import { classiInput } from '@/components/stili'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti } from '@/features/profilo/livelliPunti'
import { MedagliaLv } from '@/features/profilo/MedagliaLv'
import type { SocioPubblico } from '@/features/profilo/amici/useAmici'
import { SportIcona } from '@/components/IconeSport'
import { etichettaSport } from '@/lib/formato'

function annoIscrizione(data: string | null): string {
  if (!data) return ''
  return String(new Date(data).getFullYear())
}

function useSociPubblici() {
  return useQuery({
    queryKey: ['soci_pubblici'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('soci_pubblici')
      if (error) throw error
      return (data ?? []) as SocioPubblico[]
    },
  })
}

function StatItem({ num, label, colore }: { num: string | number; label: string; colore?: string }) {
  return (
    <div className="gioc-stat-item">
      <span className="gioc-stat-num" style={colore ? { color: colore } : undefined}>{num}</span>
      <span className="gioc-stat-lbl">{label}</span>
    </div>
  )
}

function RigaGiocatore({
  socio,
  rank,
  maxPunti,
}: {
  socio: SocioPubblico
  rank: number
  maxPunti: number
}) {
  const sport = socio.sport_preferito
  const anno = annoIscrizione(socio.data_iscrizione)
  const lv = livelloDaPunti(socio.punti, LIVELLI_PUNTI_DEFAULT)
  const cfg = LIVELLI_PUNTI_DEFAULT[lv - 1]
  const pct = maxPunti > 0 ? Math.round((socio.punti / maxPunti) * 100) : 0

  return (
    <div className="gioc-riga">
      <span className="gioc-rank">{rank}</span>
      <MedagliaLv punti={socio.punti} size={40} />
      <div className="gioc-info">
        <div className="gioc-nome">{titleCase(socio.etichetta)}</div>
        <div className="gioc-sub">
          <span
            className="gioc-chip"
            style={{ color: cfg.colore, background: cfg.colore + '18', border: `1px solid ${cfg.colore}38` }}
          >
            {cfg.nome}
          </span>
          {sport && <span className="gioc-chip gioc-chip-sport"><SportIcona sport={sport} size={12} />{' '}{etichettaSport(sport)}</span>}
          {anno && <span className="gioc-chip gioc-chip-muted">dal {anno}</span>}
        </div>
      </div>
      <div className="gioc-pt-col">
        <span className="gioc-pt-num">{socio.punti}</span>
        <span className="gioc-pt-label">pt</span>
        <div className="gioc-bar-track">
          <div className="gioc-bar-fill" style={{ width: `${pct}%`, background: cfg.colore }} />
        </div>
      </div>
    </div>
  )
}

export default function GiocatoriReadOnly() {
  const { data, isLoading, error } = useSociPubblici()
  const [cerca, setCerca] = useState('')
  const [ordine, setOrdine] = useState<'punti' | 'cognome'>('punti')

  if (isLoading) return <p className="text-ink-2">Caricamento giocatori…</p>
  if (error) return <p className="msg-errore">Impossibile caricare i giocatori.</p>

  const tutti = (data ?? []).filter((s) => !s.is_allenatore && !s.e_allenatore)

  const q = cerca.trim().toLowerCase()
  const filtrati = q.length >= 1
    ? tutti.filter((s) => s.etichetta.toLowerCase().includes(q))
    : tutti.slice()

  filtrati.sort((a, b) => {
    if (ordine === 'cognome') return a.etichetta.localeCompare(b.etichetta, 'it')
    return (b.punti ?? 0) - (a.punti ?? 0) || a.etichetta.localeCompare(b.etichetta, 'it')
  })

  const mediaPunti = tutti.length > 0
    ? Math.round(tutti.reduce((acc, s) => acc + (s.punti ?? 0), 0) / tutti.length)
    : 0
  const maxPunti = Math.max(...filtrati.map(s => s.punti ?? 0), 1)
  const nPadel  = tutti.filter(s => s.sport_preferito === 'padel'  || s.sport_preferito === 'entrambi').length
  const nCalcio = tutti.filter(s => s.sport_preferito === 'calcio' || s.sport_preferito === 'entrambi').length

  return (
    <div>
      <div className="club-sez-header">
        <span className="club-sez-icona">
          <svg width="15" height="15" viewBox="0 -2 24 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <h2 className="club-sez-titolo">Giocatori del circolo</h2>
      </div>

      <div className="gioc-stats-strip">
        <StatItem num={tutti.length} label="Iscritti" />
        <StatItem num={mediaPunti} label="Media pt" />
        <StatItem num={nPadel}  label="🎾 Padel" />
        <StatItem num={nCalcio} label="⚽ Calcio" />
      </div>

      <div className="card">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            className={`${classiInput} !mt-0 w-full sm:flex-1`}
            placeholder="Cerca per nome o cognome…"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
          />
          <select
            className={`${classiInput} !mt-0 !w-auto shrink-0`}
            value={ordine}
            onChange={(e) => setOrdine(e.target.value as 'punti' | 'cognome')}
          >
            <option value="punti">Punti ↓</option>
            <option value="cognome">A → Z</option>
          </select>
        </div>

        <p className="sub mb-3">
          {q && filtrati.length !== tutti.length
            ? `${filtrati.length} su ${tutti.length} giocatori`
            : `${filtrati.length} giocatori`}
        </p>

        {filtrati.length === 0 ? (
          <p className="text-sm text-ink-3">Nessun giocatore trovato.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtrati.map((s, i) => (
              <RigaGiocatore key={s.id} socio={s} rank={i + 1} maxPunti={maxPunti} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
