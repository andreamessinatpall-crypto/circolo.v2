import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore, mancaRpc } from '@/lib/errori'
import { useSociEtichette } from '@/features/prenotazioni/datiAmichevoli'
import { oraLocale, ymd } from '@/features/prenotazioni/orari'
import { SportIcona } from '@/components/IconeSport'
import { TipoAttivitaIcona } from '@/components/IconeAttivita'
import { IconaMeteo } from '@/components/IconeMeteo'
import { useMeteo } from '@/hooks/useMeteo'
import { useAmici } from './amici/useAmici'
import { MenuAmici } from '@/features/prenotazioni/MieAmichevoli'
import { arricchisciTipoAttivita, cognomeIniziale, righeInMappa, type Attivita, type RigaAttivitaBase } from './attivitaComune'
import type { Sport } from '@/features/prenotazioni/tipi'

const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }

// Ripiego quando non c'è previsione per quel giorno (oltre i 16 giorni coperti
// da Open-Meteo, vedi useMeteo.ts): un fiore/asterisco generico, non un'icona
// meteo specifica.
const ICONA_GIORNO_GENERICA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
  </svg>
)

// Passando `sport` filtra la lista (usata da GestioneAttivitaPagina, che ha
// lo switch padel/calcio in cima e un'unica lista sotto — niente doppia
// sezione con "Le mie prenotazioni" che ripeteva le stesse partite). Le
// attività prenotate dal giocatore stesso si annullano direttamente da qui
// (unico posto dove si possono gestire) — per quelle prenotate da altri si
// indica solo chi le gestisce, in sola lettura. Appena l'orario di inizio è
// passato, la prenotazione sparisce da qui (RPC filtra su `inizio`) e
// compare tra le "concluse" (AttivitaConcluse.tsx), non più annullabile.
export default function AttivitaInProgramma({ sport }: { sport?: Sport } = {}) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  // soci_etichette (non soci_pubblici): una prenotazione già registrata deve
  // restare leggibile col vero nome anche se il partecipante è nel frattempo
  // stato sospeso o ha cancellato l'account.
  const sociQuery = useSociEtichette()
  const meteoQuery = useMeteo()
  const amiciData = useAmici(profilo?.id ?? '')

  const invalidaAttivita = () => {
    qc.invalidateQueries({ queryKey: ['attivita-programma'] })
    qc.invalidateQueries({ queryKey: ['amichevoli'] })
  }

  const annulla = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidaAttivita()
      qc.invalidateQueries({ queryKey: ['prossima-attivita'] })
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
    },
    onError: (e: unknown) => window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })

  // Aggiungere/togliere un amico dalla propria partita: era in MieAmichevoli.tsx
  // (ora rimpiazzato da questa lista unica), mutations identiche.
  const aggiungiAmico = useMutation({
    mutationFn: async ({ prenId, socioId }: { prenId: number | string; socioId: string }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .upsert(
          [{ prenotazione_id: prenId, socio_id: socioId, confermato: false }],
          { onConflict: 'prenotazione_id,socio_id', ignoreDuplicates: true },
        )
      if (error) throw error
    },
    onSuccess: invalidaAttivita,
    onError: (e: unknown) => {
      const err = e as { code?: string }
      if (err.code === '42501') {
        window.alert('Puoi aggiungere solo i tuoi amici (e te stesso) alle tue prenotazioni.')
      } else if (mancaTabella(e, 'partecipanti_amichevole')) {
        window.alert('Funzione non ancora attiva: esegui lo script tappa3a-amichevoli.sql su Supabase.')
      } else {
        window.alert('Aggiunta non riuscita: ' + messaggioErrore(e))
      }
    },
  })

  // Nessun id di riga disponibile dalla RPC (restituisce solo socio_id): la
  // coppia prenotazione+socio identifica comunque in modo univoco la riga.
  const rimuoviAmico = useMutation({
    mutationFn: async ({ prenId, socioId }: { prenId: number | string; socioId: string }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .delete()
        .eq('prenotazione_id', prenId)
        .eq('socio_id', socioId)
      if (error) throw error
    },
    onSuccess: invalidaAttivita,
    onError: (e: unknown) => window.alert('Rimozione non riuscita: ' + messaggioErrore(e)),
  })

  const query = useQuery({
    queryKey: ['attivita-programma', profilo?.id],
    enabled: !!profilo,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('partite_in_programma')
      if (error) throw error
      const map = righeInMappa((data ?? []) as RigaAttivitaBase[])
      const lista = [...map.values()].sort(
        (a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime(),
      )
      await arricchisciTipoAttivita(map)
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

  const lista = (query.data ?? []).filter((m) => !sport || m.sport === sport)
  if (lista.length === 0) {
    return (
      <p className="sub">Non hai attività in programma. Prenota un campo.</p>
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
      {gruppi.map((g) => {
        const previsione = meteoQuery.data?.get(ymd(new Date(g.att[0].inizio)))
        return (
        <div key={g.giorno} className="gruppo-giorno">
          <div className="giorno-partite">
            {previsione ? <IconaMeteo codice={previsione.weathercode} size={18} /> : ICONA_GIORNO_GENERICA}
            <span>{g.etichetta}</span>
          </div>
          <div className="flex flex-col gap-3">
            {g.att.map((m) => {
              const mia = !!profilo && m.prenotante_id === profilo.id
              const tipo = m.allenamento ? 'allenamento' : m.torneo_nome ? 'torneo' : 'partita'
              return (
              <div key={m.id} className="amichevole-riga">
                <div className="amichevole-cap">
                  <div>
                    <div className="orario orario-blu">
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
                    {!mia && m.prenotante_id && (
                      <div className="dove">Gestita da {label(m.prenotante_id)}</div>
                    )}
                  </div>
                  {tipo !== 'partita' && (
                    <TipoAttivitaIcona tipo={tipo} titolo={m.torneo_nome ?? undefined} />
                  )}
                </div>
                {mia && tipo === 'partita' ? (
                  <PartecipantiPropria
                    sport={m.sport}
                    parti={m.parti}
                    label={label}
                    mioId={profilo!.id}
                    amiciData={amiciData}
                    onAggiungi={(socioId) => aggiungiAmico.mutate({ prenId: m.id, socioId })}
                    onRimuovi={(socioId) => rimuoviAmico.mutate({ prenId: m.id, socioId })}
                  />
                ) : (
                  m.parti.length > 0 && (
                    <div className="att-parti">
                      {m.parti.map((r, i) => (
                        <span key={r.socio_id}>
                          {i > 0 && <span className="att-parti-sep">·</span>}
                          {cognomeIniziale(label(r.socio_id))}
                        </span>
                      ))}
                    </div>
                  )
                )}
                {mia && (
                  <div className="mt-auto pt-3">
                    <button
                      type="button"
                      className="btn btn-pericolo btn-mini w-full"
                      disabled={annulla.isPending}
                      onClick={() => {
                        const quando =
                          new Date(m.inizio).toLocaleDateString('it-IT', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          }) +
                          ' alle ' +
                          oraLocale(new Date(m.inizio))
                        if (window.confirm(`Annullare la tua prenotazione (${quando})?`)) annulla.mutate(m.id)
                      }}
                    >
                      Annulla la prenotazione
                    </button>
                  </div>
                )}
              </div>
              )
            })}
          </div>
        </div>
        )
      })}
    </div>
  )
}

// Partecipanti di una partita propria (non allenamento/torneo): a differenza
// della lista di sola lettura usata per le partite altrui, qui si possono
// aggiungere/togliere amici — stesso comportamento che aveva MieAmichevoli.tsx.
function PartecipantiPropria({
  sport,
  parti,
  label,
  mioId,
  amiciData,
  onAggiungi,
  onRimuovi,
}: {
  sport: string
  parti: { socio_id: string; confermato: boolean }[]
  label: (id: string) => string
  mioId: string
  amiciData: ReturnType<typeof useAmici>
  onAggiungi: (socioId: string) => void
  onRimuovi: (socioId: string) => void
}) {
  const giaIds = new Set(parti.map((p) => p.socio_id))
  const selezionabili = amiciData.amici.filter((a) => !giaIds.has(a.id))
  const cap4 = sport === 'padel' && parti.length >= 4
  const amiciVuoti = amiciData.amici.length === 0
  const nienteDaAggiungere = !amiciVuoti && selezionabili.length === 0

  const menuAggiungi = !cap4 && (
    amiciVuoti ? (
      <span className="chips-nessun-amico">
        Non hai ancora amici. <Link to="/profilo/amici">Aggiungi amici</Link>
      </span>
    ) : !nienteDaAggiungere ? (
      <MenuAmici opzioni={selezionabili} onScegli={onAggiungi} />
    ) : null
  )

  if (parti.length === 0) {
    return (
      <>
        <div className="part-vuoto">Indica gli altri giocatori di questa partita.</div>
        {menuAggiungi}
      </>
    )
  }

  return (
    <div className="chips">
      {parti.map((r) => (
        <span key={r.socio_id} className="chip">
          {cognomeIniziale(label(r.socio_id))}
          {r.socio_id !== mioId && (
            <button
              type="button"
              className="x"
              title="Togli"
              onClick={() => {
                if (window.confirm(`Rimuovere ${cognomeIniziale(label(r.socio_id))} da questa partita?`)) {
                  onRimuovi(r.socio_id)
                }
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {menuAggiungi}
    </div>
  )
}
