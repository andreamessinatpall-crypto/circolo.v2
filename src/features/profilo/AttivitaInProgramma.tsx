import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import { useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { oraLocale } from '@/features/prenotazioni/orari'

const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

const ICONA_CAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
)

interface RigaAttivita {
  prenotazione_id: number | string
  inizio: string
  fine: string
  campo_nome: string | null
  sport: string
  prenotante_id: string | null
  socio_id: string
  confermato: boolean
}

interface Attivita {
  id: number | string
  inizio: string
  fine: string
  campo_nome: string | null
  sport: string
  prenotante_id: string | null
  parti: { socio_id: string; confermato: boolean }[]
  allenamento: boolean
  allenatore_id: string | null
}

export default function AttivitaInProgramma() {
  const { profilo } = useAuth()
  const sociQuery = useSociPubblici()

  const query = useQuery({
    queryKey: ['attivita-programma', profilo?.id],
    enabled: !!profilo,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('partite_in_programma')
      if (error) throw error
      const rows = (data ?? []) as RigaAttivita[]

      const map = new Map<string, Attivita>()
      for (const r of rows) {
        const k = String(r.prenotazione_id)
        if (!map.has(k)) {
          map.set(k, {
            id: r.prenotazione_id,
            inizio: r.inizio,
            fine: r.fine,
            campo_nome: r.campo_nome,
            sport: r.sport,
            prenotante_id: r.prenotante_id,
            parti: [],
            allenamento: false,
            allenatore_id: null,
          })
        }
        map.get(k)!.parti.push({ socio_id: r.socio_id, confermato: r.confermato })
      }
      const lista = [...map.values()].sort(
        (a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime(),
      )

      // Segna allenamenti e relativo istruttore.
      const ids = [...map.keys()]
      if (ids.length) {
        const { data: tipi } = await supabase
          .from('prenotazioni')
          .select('id, allenamento, allenatore_id')
          .in('id', ids)
        for (const t of (tipi ?? []) as Array<{
          id: number | string
          allenamento: boolean | null
          allenatore_id: string | null
        }>) {
          const a = map.get(String(t.id))
          if (a) {
            a.allenamento = !!t.allenamento
            a.allenatore_id = t.allenatore_id ?? null
          }
        }
      }
      return lista
    },
  })

  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    if (profilo) m.set(profilo.id, `${profilo.nome} ${profilo.cognome}`)
    return m
  }, [sociQuery.data, profilo])

  if (query.isLoading) return <p className="sub">Caricamento…</p>
  if (query.error) {
    return (
      <p className="sub">
        {mancaRpc(query.error)
          ? 'Esegui lo script partite-in-programma.sql su Supabase per attivare questa sezione.'
          : 'Impossibile caricare le attività: ' + messaggioErrore(query.error)}
      </p>
    )
  }

  const lista = query.data ?? []
  if (lista.length === 0) {
    return (
      <p className="sub">
        Non hai attività in programma. Prenota un campo e indica i giocatori, oppure fatti
        aggiungere da un amico.
      </p>
    )
  }

  const label = (id: string) => etichette.get(id) ?? 'Giocatore'

  // Raggruppa per giorno.
  const gruppi: { giorno: string; etichetta: string; att: Attivita[] }[] = []
  for (const m of lista) {
    const d = new Date(m.inizio)
    const chiave = d.toDateString()
    let g = gruppi.find((x) => x.giorno === chiave)
    if (!g) {
      g = {
        giorno: chiave,
        etichetta: d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
        att: [],
      }
      gruppi.push(g)
    }
    g.att.push(m)
  }

  return (
    <div>
      {gruppi.map((g) => (
        <div key={g.giorno} className="gruppo-giorno">
          <div className="giorno-partite">
            {ICONA_CAL}
            <span>{g.etichetta}</span>
          </div>
          <div className="flex flex-col gap-3">
            {g.att.map((m) => (
              <div key={m.id} className="amichevole-riga">
                <div className="amichevole-cap">
                  <div>
                    <div className="orario">
                      {oraLocale(new Date(m.inizio))}–{oraLocale(new Date(m.fine))}
                    </div>
                    <div className="dove">
                      {(m.campo_nome ?? 'Campo') + ' · ' + (SPORT_LABEL[m.sport] ?? m.sport)}
                    </div>
                    {m.allenamento ? (
                      <div className="allenamento-badge">Allenamento</div>
                    ) : (
                      <div className="partita-badge">Partita</div>
                    )}
                    {m.allenamento && m.allenatore_id && (
                      <div className="dove">Istruttore: {label(m.allenatore_id)}</div>
                    )}
                    {m.prenotante_id && (
                      <div className="dove">Prenotato da {label(m.prenotante_id)}</div>
                    )}
                  </div>
                  {m.sport === 'padel' && <span className="part-conta">{m.parti.length}/4</span>}
                </div>
                <div className="chips">
                  {m.parti.map((r) => (
                    <span key={r.socio_id} className="chip">
                      {label(r.socio_id)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
