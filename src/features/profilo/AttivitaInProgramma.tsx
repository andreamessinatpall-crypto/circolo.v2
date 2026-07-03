import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import { useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { oraLocale } from '@/features/prenotazioni/orari'
import { SportIcona } from '@/components/IconeSport'

const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

const ICONA_GIORNO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
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
  torneo_nome: string | null
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
            torneo_nome: null,
          })
        }
        map.get(k)!.parti.push({ socio_id: r.socio_id, confermato: r.confermato })
      }
      const lista = [...map.values()].sort(
        (a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime(),
      )

      // Segna allenamenti, istruttore e incontro_id.
      const ids = [...map.keys()]
      if (ids.length) {
        const { data: tipi } = await supabase
          .from('prenotazioni')
          .select('id, allenamento, allenatore_id, incontro_id, torneo_id')
          .in('id', ids)
        const incontroIds: (number | string)[] = []
        const torneoIds: string[] = []
        const pren2 = (tipi ?? []) as Array<{
          id: number | string
          allenamento: boolean | null
          allenatore_id: string | null
          incontro_id: number | string | null
          torneo_id: string | null
        }>
        for (const t of pren2) {
          const a = map.get(String(t.id))
          if (a) {
            a.allenamento = !!t.allenamento
            a.allenatore_id = t.allenatore_id ?? null
          }
          if (t.incontro_id) incontroIds.push(t.incontro_id)
          else if (t.torneo_id) torneoIds.push(t.torneo_id)
        }

        // Risolve il nome del torneo per le prenotazioni di incontri.
        if (incontroIds.length) {
          const { data: inc } = await supabase
            .from('incontri')
            .select('id, torneo:tornei(nome)')
            .in('id', incontroIds)
          const nomePerIncontro = new Map<string, string>()
          for (const r of (inc ?? []) as unknown as Array<{ id: number | string; torneo: { nome: string } | null }>) {
            if (r.torneo?.nome) nomePerIncontro.set(String(r.id), r.torneo.nome)
          }
          for (const t of pren2) {
            if (t.incontro_id) {
              const a = map.get(String(t.id))
              if (a) a.torneo_nome = nomePerIncontro.get(String(t.incontro_id)) ?? null
            }
          }
        }

        // Risolve il nome per le prenotazioni americano (torneo_id diretto).
        if (torneoIds.length) {
          const { data: torn } = await supabase.from('tornei').select('id, nome').in('id', torneoIds)
          const nomePerTorneo = new Map<string, string>()
          for (const t of (torn ?? []) as Array<{ id: string; nome: string }>) nomePerTorneo.set(String(t.id), t.nome)
          for (const t of pren2) {
            if (t.torneo_id && !t.incontro_id) {
              const a = map.get(String(t.id))
              if (a) a.torneo_nome = nomePerTorneo.get(String(t.torneo_id)) ?? null
            }
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
      <p className="sub">Non hai attività in programma. Prenota un campo.</p>
    )
  }

  const label = (id: string) => etichette.get(id) ?? 'Giocatore'

  // "Mario Rossi" → "Rossi M."
  function fmtP(id: string): string {
    const s = label(id).trim()
    const i = s.indexOf(' ')
    if (i < 0) return s
    const nome = s.slice(0, i)
    const cognome = s.slice(i + 1)
    return `${cognome} ${nome[0].toUpperCase()}.`
  }

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
            {ICONA_GIORNO}
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
                    <div className="att-sport">
                      <span className="att-sport-ic"><SportIcona sport={m.sport} /></span>
                      {SPORT_LABEL[m.sport] ?? m.sport}
                      <span className="att-parti-sep">·</span>
                      <span className="att-campo">{m.campo_nome ?? 'Campo'}</span>
                    </div>
                    {m.allenamento && m.allenatore_id && (
                      <div className="dove">Istruttore: {label(m.allenatore_id)}</div>
                    )}
                    {m.prenotante_id && (
                      <div className="dove">Prenotato da {label(m.prenotante_id)}</div>
                    )}
                  </div>
                  {m.allenamento ? (
                    <div className="allenamento-badge" style={{ marginTop: 0 }}>Allenamento</div>
                  ) : m.torneo_nome ? (
                    <div className="torneo-badge" style={{ marginTop: 0 }}>{m.torneo_nome}</div>
                  ) : (
                    <div className="partita-badge" style={{ marginTop: 0 }}>Partita</div>
                  )}
                </div>
                <div className="att-parti">
                  {m.parti.map((r, i) => (
                    <span key={r.socio_id}>
                      {i > 0 && <span className="att-parti-sep">·</span>}
                      {fmtP(r.socio_id)}
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
