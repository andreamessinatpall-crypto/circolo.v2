import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore, mancaRpc } from '@/lib/errori'
import { useSociEtichette, useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { oraLocale, ymd } from '@/features/prenotazioni/orari'
import { SportIcona } from '@/components/IconeSport'
import { TipoAttivitaIcona } from '@/components/IconeAttivita'
import { IconaMeteo } from '@/components/IconeMeteo'
import { useMeteo } from '@/hooks/useMeteo'
import Avatar from '@/components/Avatar'
import { useAmici } from './amici/useAmici'
import { MenuAmici } from '@/features/prenotazioni/MieAmichevoli'
import { arricchisciTipoAttivita, etichettaGiocatore, inizialiCoppia, nomeCompletoGiocatore, righeInMappa, type RigaAttivitaBase } from './attivitaComune'
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
// indica solo chi le gestisce, in sola lettura. Eccezione: un allenamento
// resta sempre gestito dal suo istruttore (allenatore_id), anche quando è
// nato da una richiesta di lezione accettata e quindi "prenotato" a nome del
// giocatore — vedi `gestisceAllenamento` più sotto, stesse mutation di
// VistaLezioni.tsx (RLS già lo permetteva, tappa37/tappa55). Appena l'orario
// di inizio è passato, la prenotazione sparisce da qui (RPC filtra su
// `inizio`) e compare tra le "concluse" (AttivitaConcluse.tsx), non più
// annullabile.
export default function AttivitaInProgramma({ sport }: { sport?: Sport } = {}) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  // soci_etichette (non soci_pubblici): una prenotazione già registrata deve
  // restare leggibile col vero nome anche se il partecipante è nel frattempo
  // stato sospeso o ha cancellato l'account.
  const sociQuery = useSociEtichette()
  // soci_pubblici invece per le opzioni del menu "+ giocatore" di un
  // allenamento: l'istruttore può aggiungere qualsiasi socio attivo, non
  // solo i suoi amici (a differenza di PartecipantiPropria).
  const sociPubbliciQuery = useSociPubblici()
  const meteoQuery = useMeteo()
  const amiciData = useAmici(profilo?.id ?? '')

  const invalidaAttivita = () => {
    qc.invalidateQueries({ queryKey: ['attivita-programma'] })
    qc.invalidateQueries({ queryKey: ['amichevoli'] })
    // Un allenamento gestito da qui è lo stesso mostrato in "Le tue lezioni"
    // (VistaLezioni.tsx) e nella sua card di anteprima in Area Club: tienili
    // allineati. Nessun effetto per chi non è istruttore (query non montata).
    qc.invalidateQueries({ queryKey: ['lezioni', profilo?.id] })
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

  // Ospite non registrato: chiunque gestisce la propria partita può
  // aggiungerne uno (RLS "aggiungi ospite alla propria prenotazione",
  // tappa85-ospite-attivita.sql) — a differenza di MieAmichevoli.tsx, dove è
  // riservato allo staff.
  const aggiungiOspite = useMutation({
    mutationFn: async ({ prenId, nome }: { prenId: number | string; nome: string }) => {
      const { error } = await supabase.from('partecipanti_amichevole').insert({
        prenotazione_id: prenId,
        socio_id: null,
        nome_manuale: nome,
        confermato: false,
      })
      if (error) throw error
    },
    onSuccess: invalidaAttivita,
    onError: (e: unknown) => window.alert('Aggiunta non riuscita: ' + messaggioErrore(e)),
  })

  // Un ospite non ha un socio_id per identificarlo: qui si toglie per la
  // coppia prenotazione+nome (nessun id di riga disponibile, stesso limite
  // di rimuoviAmico sopra).
  const rimuoviOspite = useMutation({
    mutationFn: async ({ prenId, nome }: { prenId: number | string; nome: string }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .delete()
        .eq('prenotazione_id', prenId)
        .is('socio_id', null)
        .eq('nome_manuale', nome)
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

  // Ogni socio attivo tranne l'istruttore stesso: opzioni del menu "+
  // giocatore" di un allenamento che gestisce (vedi gestisceAllenamento).
  const opzioniGiocatori = useMemo(
    () => (sociPubbliciQuery.data ?? []).filter((s) => s.id !== profilo?.id),
    [sociPubbliciQuery.data, profilo?.id],
  )

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

  // Foto profilo dei partecipanti alle proprie partite: sempre amici (unico
  // modo per finire in una prenotazione propria è il menu "+ amico", che
  // pesca da amiciData.amici) più se stessi.
  const fotoPerId = new Map<string, string | null>()
  for (const a of amiciData.amici) fotoPerId.set(a.id, a.foto_url)
  if (profilo) fotoPerId.set(profilo.id, profilo.foto_url)

  return (
    <div className="flex flex-col gap-3">
      {lista.map((m) => {
        const mia = !!profilo && m.prenotante_id === profilo.id
        const tipo = m.allenamento ? 'allenamento' : m.torneo_nome ? 'torneo' : 'partita'
        // Un allenamento resta sempre gestito dal suo istruttore, non da chi
        // l'ha "prenotato": per una lezione nata da una richiesta accettata
        // prenotante_id è lo studente (mia sarebbe true per lui), ma è
        // l'istruttore (allenatore_id) a doverlo annullare o cambiarne i
        // giocatori — mai lo studente. Per partita/torneo resta invece `mia`.
        const gestisceAllenamento = tipo === 'allenamento' && !!profilo && m.allenatore_id === profilo.id
        const puoGestire = tipo === 'allenamento' ? gestisceAllenamento : mia
        const giornoData = new Date(m.inizio)
        const giornoLabel = giornoData.toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
        const previsione = meteoQuery.data?.get(ymd(giornoData))
        return (
          <div key={m.id} className="amichevole-riga att-wow">
            <div className="att-wow-giorno">
              <span>{giornoLabel}</span>
              <span className="att-wow-meteo">
                {previsione ? (
                  <>
                    <IconaMeteo codice={previsione.weathercode} size={16} />
                    {Math.round(previsione.tempMax)}°
                  </>
                ) : (
                  ICONA_GIORNO_GENERICA
                )}
              </span>
            </div>

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
                {!mia && !gestisceAllenamento && m.prenotante_id && (
                  <div className="dove">Gestita da {label(m.prenotante_id)}</div>
                )}
              </div>
              {tipo !== 'partita' && (
                <TipoAttivitaIcona tipo={tipo} titolo={m.torneo_nome ?? undefined} />
              )}
            </div>

            <div className="att-wow-hr" />

            {mia && tipo === 'partita' ? (
              <PartecipantiPropria
                sport={m.sport}
                parti={m.parti}
                label={label}
                foto={fotoPerId}
                mioId={profilo!.id}
                amiciData={amiciData}
                onAggiungi={(socioId) => aggiungiAmico.mutate({ prenId: m.id, socioId })}
                onRimuovi={(socioId) => rimuoviAmico.mutate({ prenId: m.id, socioId })}
                onAggiungiOspite={(nome) => aggiungiOspite.mutate({ prenId: m.id, nome })}
                onRimuoviOspite={(nome) => rimuoviOspite.mutate({ prenId: m.id, nome })}
              />
            ) : gestisceAllenamento ? (
              <PartecipantiAllenamento
                parti={m.parti}
                label={label}
                opzioniGiocatori={opzioniGiocatori}
                onAggiungi={(socioId) => aggiungiAmico.mutate({ prenId: m.id, socioId })}
                onRimuovi={(socioId) => rimuoviAmico.mutate({ prenId: m.id, socioId })}
                onAggiungiOspite={(nome) => aggiungiOspite.mutate({ prenId: m.id, nome })}
                onRimuoviOspite={(nome) => rimuoviOspite.mutate({ prenId: m.id, nome })}
              />
            ) : (
              m.parti.length > 0 && (
                <div className="att-parti">
                  {m.parti.map((r, i) => (
                    <span key={r.socio_id ?? `ospite-${i}`}>
                      {i > 0 && <span className="att-parti-sep">·</span>}
                      {etichettaGiocatore(r, label)}
                    </span>
                  ))}
                </div>
              )
            )}

            {puoGestire && (
              <div className="mt-auto">
                <div className="att-wow-hr" />
                <button
                  type="button"
                  className="btn btn-pericolo btn-mini w-full"
                  disabled={annulla.isPending}
                  onClick={() => {
                    const quando = giornoLabel + ' alle ' + oraLocale(new Date(m.inizio))
                    const messaggio = tipo === 'allenamento'
                      ? `Annullare l'allenamento (${quando})?`
                      : `Annullare la tua prenotazione (${quando})?`
                    if (window.confirm(messaggio)) annulla.mutate(m.id)
                  }}
                >
                  {tipo === 'allenamento' ? "Annulla l'allenamento" : 'Annulla la prenotazione'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Partecipanti di una partita propria (non allenamento/torneo): a differenza
// della lista di sola lettura usata per le partite altrui, qui si possono
// aggiungere/togliere amici e ospiti non registrati — stesso comportamento
// che aveva MieAmichevoli.tsx, più l'ospite (qui sempre disponibile, non
// solo per lo staff).
function PartecipantiPropria({
  sport,
  parti,
  label,
  foto,
  mioId,
  amiciData,
  onAggiungi,
  onRimuovi,
  onAggiungiOspite,
  onRimuoviOspite,
}: {
  sport: string
  parti: { socio_id: string | null; nome_manuale: string | null; confermato: boolean }[]
  label: (id: string) => string
  foto: Map<string, string | null>
  mioId: string
  amiciData: ReturnType<typeof useAmici>
  onAggiungi: (socioId: string) => void
  onRimuovi: (socioId: string) => void
  onAggiungiOspite: (nome: string) => void
  onRimuoviOspite: (nome: string) => void
}) {
  const giaIds = new Set(parti.map((p) => p.socio_id).filter((id): id is string => !!id))
  const selezionabili = amiciData.amici.filter((a) => !giaIds.has(a.id))
  const cap4 = sport === 'padel' && parti.length >= 4
  const amiciVuoti = amiciData.amici.length === 0

  // L'ospite non richiede amici: il menu resta sempre disponibile (a meno
  // del tetto 4 giocatori nel padel), anche con selezionabili vuoto — mostra
  // in quel caso solo la voce "Ospite".
  const menuAggiungi = !cap4 && (
    <>
      <MenuAmici opzioni={selezionabili} onScegli={onAggiungi} onOspite={onAggiungiOspite} />
      {amiciVuoti && (
        <span className="chips-nessun-amico">
          Non hai ancora amici. <Link to="/profilo/amici">Aggiungi amici</Link>
        </span>
      )}
    </>
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
      {parti.map((r, i) => {
        const nome = etichettaGiocatore(r, label)
        return (
          <span key={r.socio_id ?? `ospite-${i}`} className="chip">
            <Avatar
              foto={r.socio_id ? foto.get(r.socio_id) ?? null : null}
              iniziali={inizialiCoppia(nomeCompletoGiocatore(r, label))}
              size={20}
            />
            {nome}
            {r.socio_id !== mioId && (
              <button
                type="button"
                className="x"
                title="Togli"
                onClick={() => {
                  if (!window.confirm(`Rimuovere ${nome} da questa partita?`)) return
                  if (r.socio_id) onRimuovi(r.socio_id)
                  else onRimuoviOspite(r.nome_manuale!)
                }}
              >
                ×
              </button>
            )}
          </span>
        )
      })}
      {menuAggiungi}
    </div>
  )
}

// Partecipanti di un allenamento gestito dall'istruttore: a differenza di
// PartecipantiPropria non limita le opzioni agli amici (uno studente spesso
// non lo è) — qualsiasi socio attivo può essere aggiunto, oltre all'ospite
// non registrato. Stessa interfaccia della scheda gestita da VistaLezioni.tsx.
function PartecipantiAllenamento({
  parti,
  label,
  opzioniGiocatori,
  onAggiungi,
  onRimuovi,
  onAggiungiOspite,
  onRimuoviOspite,
}: {
  parti: { socio_id: string | null; nome_manuale: string | null; confermato: boolean }[]
  label: (id: string) => string
  opzioniGiocatori: { id: string; etichetta: string }[]
  onAggiungi: (socioId: string) => void
  onRimuovi: (socioId: string) => void
  onAggiungiOspite: (nome: string) => void
  onRimuoviOspite: (nome: string) => void
}) {
  const giaIds = new Set(parti.map((p) => p.socio_id).filter((id): id is string => !!id))
  const selezionabili = opzioniGiocatori.filter((s) => !giaIds.has(s.id))

  const menuAggiungi = (
    <MenuAmici
      opzioni={selezionabili}
      onScegli={onAggiungi}
      onOspite={onAggiungiOspite}
      ariaLabel="Aggiungi un giocatore all'allenamento"
      testoVuoto="Nessun giocatore trovato."
    />
  )

  if (parti.length === 0) {
    return (
      <>
        <div className="part-vuoto">Indica i giocatori di questo allenamento.</div>
        {menuAggiungi}
      </>
    )
  }

  return (
    <div className="chips">
      {parti.map((r, i) => {
        const nome = etichettaGiocatore(r, label)
        return (
          <span key={r.socio_id ?? `ospite-${i}`} className="chip">
            {nome}
            <button
              type="button"
              className="x"
              title="Togli"
              onClick={() => {
                if (!window.confirm(`Rimuovere ${nome} da questo allenamento?`)) return
                if (r.socio_id) onRimuovi(r.socio_id)
                else onRimuoviOspite(r.nome_manuale!)
              }}
            >
              ×
            </button>
          </span>
        )
      })}
      {menuAggiungi}
    </div>
  )
}
