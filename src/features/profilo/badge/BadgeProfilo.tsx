import type { ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { sportConsentiti } from '@/auth/ruoli'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import Medaglia from './Medaglia'
import {
  codiceBadge,
  EMOJI_SPORT,
  LABEL_VARIABILE,
  TRAGUARDI_DEFAULT,
  VARIABILI,
  useTraguardi,
  type Sport,
  type VariabileTraguardo,
} from './badgeDati'

type Conteggi = Record<Sport, number>

export default function BadgeProfilo() {
  const { profilo, ricaricaProfilo } = useAuth()
  const traguardiQuery = useTraguardi()

  const partiteQuery = useQuery({
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

  if (partiteQuery.isLoading) return <Contenitore>Caricamento…</Contenitore>

  if (partiteQuery.error) {
    return (
      <Contenitore>
        {mancaRpc(partiteQuery.error)
          ? 'Badge non ancora attivi: esegui lo script tappa5-badge-premi.sql su Supabase.'
          : 'Impossibile caricare i traguardi: ' + messaggioErrore(partiteQuery.error)}
      </Contenitore>
    )
  }

  const conteggi = partiteQuery.data ?? { padel: 0, calcio: 0 }
  const traguardi = traguardiQuery.data ?? TRAGUARDI_DEFAULT
  const sports: Sport[] = profilo.is_admin ? ['padel', 'calcio'] : sportConsentiti(profilo)

  // Conteggio per variabile × sport (solo "partite" ha dati reali per ora)
  function conteggio(variabile: VariabileTraguardo, sport: Sport): number {
    if (variabile === 'partite') return conteggi[sport]
    return 0
  }

  function etichettaConteggio(variabile: VariabileTraguardo, sport: Sport): string {
    const n = conteggio(variabile, sport)
    if (variabile === 'partite') return `${n} ${n === 1 ? 'partita' : 'partite'}`
    if (variabile === 'allenamenti') return `${n} ${n === 1 ? 'allenamento' : 'allenamenti'}`
    if (variabile === 'tornei') return `${n} ${n === 1 ? 'torneo' : 'tornei'}`
    return `${n} ${n === 1 ? 'amico' : 'amici'}`
  }

  function etichettaBadge(
    variabile: VariabileTraguardo,
    sbloccato: boolean,
    scelto: boolean,
    soglia: number,
  ): string {
    if (scelto) return 'In uso'
    if (sbloccato) return 'Sbloccato'
    const unita: Record<VariabileTraguardo, string> = {
      partite: 'partite',
      allenamenti: 'allenamenti',
      tornei: 'tornei',
      amici: 'amici',
    }
    return `${soglia} ${unita[variabile]}`
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-ink-2">
          Sblocchi i traguardi giocando, allenandoti e partecipando. Tocca un traguardo sbloccato
          per usarlo come <strong>immagine del profilo</strong>.
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

      {VARIABILI.map(variabile => {
        // Per questa variabile mostra solo gli sport a cui il socio ha accesso
        // e per cui esistono traguardi configurati
        const sezioni = sports
          .map(sport => ({
            sport,
            lista: traguardi
              .filter(t => t.variabile === variabile && t.sport === sport)
              .sort((a, b) => a.soglia - b.soglia),
          }))
          .filter(s => s.lista.length > 0)

        if (sezioni.length === 0) return null

        return (
          <div key={variabile} className="mb-6 last:mb-0">
            <div className="badge-titolo-sport" style={{ fontSize: '0.78rem', marginBottom: 12 }}>
              {LABEL_VARIABILE[variabile]}
            </div>

            {sezioni.map(({ sport, lista }) => {
              const n = conteggio(variabile, sport)
              return (
                <div key={sport} className="mb-4 last:mb-0">
                  <div className="badge-titolo-sport">
                    {EMOJI_SPORT[sport]} {sport === 'padel' ? 'Padel' : 'Calcio'} ·{' '}
                    {etichettaConteggio(variabile, sport)}
                  </div>
                  <div className="badge-griglia">
                    {lista.map(t => {
                      const sbloccato = n >= t.soglia
                      const codice = codiceBadge(t)
                      const scelto = profilo.badge_profilo === codice
                      return (
                        <button
                          key={codice}
                          type="button"
                          disabled={!sbloccato || salvaAvatar.isPending}
                          onClick={() => salvaAvatar.mutate(codice)}
                          className={
                            'badge-cella ' +
                            (sbloccato ? 'sbloccato' : 'bloccato') +
                            (scelto ? ' scelto' : '')
                          }
                        >
                          <div className="badge-medaglia">
                            <Medaglia
                              variabile={variabile}
                              sport={sport}
                              soglia={t.soglia}
                              size={66}
                              bloccato={!sbloccato}
                            />
                          </div>
                          <div className="badge-nome">{t.nome}</div>
                          <div className="badge-soglia">
                            {etichettaBadge(variabile, sbloccato, scelto, t.soglia)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
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
