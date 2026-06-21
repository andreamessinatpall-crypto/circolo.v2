import type { ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti } from '@/auth/ruoli'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import Medaglia from './Medaglia'
import {
  LIVELLI_PARTITE,
  codiceBadge,
  livelloDaConteggio,
  type Sport,
} from './badgeDati'

type Conteggi = Record<Sport, number>

export default function BadgeProfilo() {
  const { profilo, ricaricaProfilo } = useAuth()

  const query = useQuery({
    queryKey: ['mie_partite_per_sport'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mie_partite_per_sport')
      if (error) throw error
      const out: Conteggi = { padel: 0, calcio: 0 }
      for (const r of (data ?? []) as Array<{ sport?: string; partite?: number }>) {
        if (r.sport === 'padel' || r.sport === 'calcio') out[r.sport] = Number(r.partite) || 0
      }
      return out
    },
  })

  const salvaAvatar = useMutation({
    mutationFn: async (code: string | null) => {
      if (!profilo) throw new Error('Profilo non disponibile')
      const { error } = await supabase
        .from('soci')
        .update({ badge_profilo: code })
        .eq('id', profilo.id)
      if (error) throw error
    },
    onSuccess: () => ricaricaProfilo(),
  })

  if (!profilo) return null

  if (query.isLoading) {
    return <Contenitore>Caricamento…</Contenitore>
  }

  if (query.error) {
    return (
      <Contenitore>
        {mancaRpc(query.error)
          ? 'Badge non ancora attivi: esegui lo script tappa5-badge-premi.sql su Supabase.'
          : 'Impossibile caricare i traguardi: ' + messaggioErrore(query.error)}
      </Contenitore>
    )
  }

  const conteggi = query.data ?? { padel: 0, calcio: 0 }
  const sports: Sport[] = profilo.is_admin
    ? ['padel', 'calcio']
    : sportConsentiti(profilo)

  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-ink-2">
          Sblocchi i traguardi giocando partite. Tocca un traguardo sbloccato per usarlo
          come <strong>immagine del profilo</strong>.
        </p>
        {profilo.badge_profilo && (
          <button
            type="button"
            onClick={() => salvaAvatar.mutate(null)}
            className="btn-pericolo btn-mini shrink-0"
          >
            Togli immagine
          </button>
        )}
      </div>

      {sports.map((sport) => {
        const n = conteggi[sport]
        const raggiunto = livelloDaConteggio(n)
        return (
          <div key={sport} className="mb-6 last:mb-0">
            <div className="mb-3 text-sm font-semibold text-ink-2">
              {sport === 'padel' ? '🎾 Padel' : '⚽ Calcio'} · {n}{' '}
              {n === 1 ? 'partita' : 'partite'}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {LIVELLI_PARTITE.map((l, idx) => {
                const liv = idx + 1
                const sbloccato = liv <= raggiunto
                const scelto = profilo.badge_profilo === codiceBadge(sport, liv)
                return (
                  <button
                    key={liv}
                    type="button"
                    disabled={!sbloccato || salvaAvatar.isPending}
                    onClick={() => salvaAvatar.mutate(codiceBadge(sport, liv))}
                    className={
                      'flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition ' +
                      (scelto
                        ? 'border-ottone-500 bg-ottone-100'
                        : 'border-verde-700/10') +
                      (sbloccato ? ' hover:border-ottone-400' : ' cursor-not-allowed')
                    }
                  >
                    <Medaglia sport={sport} liv={liv} bloccato={!sbloccato} />
                    <span className="mt-1 text-xs font-semibold text-ink">{l.nome}</span>
                    <span className="text-[11px] text-ink-3">
                      {sbloccato ? (scelto ? 'In uso' : 'Sbloccato') : l.soglia + ' partite'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <p className="mt-2 text-xs text-ink-3">
        Tocca una medaglia sbloccata per usarla come immagine del profilo.
      </p>
    </div>
  )
}

function Contenitore({ children }: { children: ReactNode }) {
  return <div className="card text-ink-2">{children}</div>
}
