import type { ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti } from '@/auth/ruoli'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import Medaglia from './Medaglia'
import {
  LIVELLI_PARTITE_DEFAULT,
  codiceBadge,
  livelloDaConteggio,
  useLivelliPartite,
  type Sport,
} from './badgeDati'

type Conteggi = Record<Sport, number>

export default function BadgeProfilo() {
  const { profilo, ricaricaProfilo } = useAuth()
  const livelliQuery = useLivelliPartite()

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
  const livelli = livelliQuery.data ?? LIVELLI_PARTITE_DEFAULT
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
        const raggiunto = livelloDaConteggio(n, livelli)
        return (
          <div key={sport} className="mb-6 last:mb-0">
            <div className="badge-titolo-sport">
              {sport === 'padel' ? '🎾 Padel' : '⚽ Calcio'} · {n}{' '}
              {n === 1 ? 'partita' : 'partite'}
            </div>
            <div className="badge-griglia">
              {livelli.map((l, idx) => {
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
                      'badge-cella ' +
                      (sbloccato ? 'sbloccato' : 'bloccato') +
                      (scelto ? ' scelto' : '')
                    }
                  >
                    <div className="badge-medaglia">
                      <Medaglia sport={sport} liv={liv} size={66} />
                    </div>
                    <div className="badge-nome">{l.nome}</div>
                    <div className="badge-soglia">
                      {sbloccato ? (scelto ? 'In uso' : 'Sbloccato') : l.soglia + ' partite'}
                    </div>
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
