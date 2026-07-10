import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { dataEstesa } from '@/lib/formato'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import { useSociEtichette } from '@/features/prenotazioni/datiAmichevoli'
import { oraLocale } from '@/features/prenotazioni/orari'
import { SportIcona } from '@/components/IconeSport'
import { TipoAttivitaIcona } from '@/components/IconeAttivita'
import { formattaSet, setVinti } from '@/features/tornei/calendario'
import type { SetPunteggio } from '@/features/tornei/tipi'
import { useImpostaRisultato, type DettaglioRisultato } from './datiRisultato'
import { arricchisciTipoAttivita, cognomeIniziale, righeInMappa, type Attivita, type RigaAttivitaBase } from './attivitaComune'
import type { Sport } from '@/features/prenotazioni/tipi'

const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }
const GIORNI_FINESTRA = 7

interface AttivitaConclusa extends Attivita {
  risultato: string | null
  risultato_dettaglio: DettaglioRisultato | null
}

interface RigaConclusa extends RigaAttivitaBase {
  risultato: string | null
  risultato_dettaglio: DettaglioRisultato | null
}

function IcoFreccia() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
// Attività già iniziate negli ultimi 7 giorni (la RPC filtra su `inizio`,
// vedi tappa80-risultato-partite.sql): non più annullabili — al posto del
// bottone "Annulla", chi ha giocato una partita semplice (non allenamento/
// torneo, che hanno il proprio punteggio altrove) può inserire il
// risultato. Oltre i 7 giorni le stesse partite restano visibili solo nello
// Storico attività (con il risultato, se inserito).
export default function AttivitaConcluse({ sport }: { sport?: Sport } = {}) {
  const { profilo } = useAuth()
  const sociQuery = useSociEtichette()
  const [espansa, setEspansa] = useState(false)

  const query = useQuery({
    queryKey: ['partite-concluse', profilo?.id],
    enabled: !!profilo,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('partite_concluse', { p_giorni: GIORNI_FINESTRA })
      if (error) throw error
      const righe = (data ?? []) as RigaConclusa[]
      const map = righeInMappa(righe) as Map<string, AttivitaConclusa>
      for (const r of righe) {
        const a = map.get(String(r.prenotazione_id))
        if (a) {
          a.risultato = r.risultato
          a.risultato_dettaglio = r.risultato_dettaglio
        }
      }
      const lista = [...map.values()].sort(
        (a, b) => new Date(b.inizio).getTime() - new Date(a.inizio).getTime(),
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
          ? 'Esegui lo script tappa80-risultato-partite.sql su Supabase per attivare questa sezione.'
          : 'Impossibile caricare le attività concluse: ' + messaggioErrore(query.error)}
      </p>
    )
  }

  const lista = (query.data ?? []).filter((m) => !sport || m.sport === sport)
  if (lista.length === 0) {
    return <p className="sub">Nessuna attività conclusa questa settimana.</p>
  }

  const label = (id: string) => etichette.get(id) ?? 'Giocatore'
  const visibili = espansa ? lista : lista.slice(0, 1)

  return (
    <div>
      <div className="flex flex-col gap-3">
        {visibili.map((m) => {
          const mia = !!profilo && m.prenotante_id === profilo.id
          const gioco = m.parti.some((p) => p.socio_id === profilo?.id)
          const tipo = m.allenamento ? 'allenamento' : m.torneo_nome ? 'torneo' : 'partita'
          const puoInserire = tipo === 'partita' && (mia || gioco)

          // Risultato già salvato: un unico cartellino "da sito sportivo"
          // (RisultatoPartita lo costruisce per intero, orario/campo inclusi)
          // — niente scheda esterna che lo contenga.
          if (tipo === 'partita' && m.risultato && m.risultato_dettaglio) {
            return (
              <RisultatoPartita
                key={m.id}
                prenotazioneId={String(m.id)}
                sport={m.sport}
                inizio={m.inizio}
                fine={m.fine}
                campoNome={m.campo_nome}
                risultato={m.risultato}
                dettaglio={m.risultato_dettaglio}
                puoInserire={puoInserire}
                partecipanti={m.parti.map((p) => ({ socioId: p.socio_id, nome: cognomeIniziale(label(p.socio_id)) }))}
              />
            )
          }

          return (
            <div key={m.id} className="amichevole-riga conclusa">
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
                </div>
                {tipo !== 'partita' && (
                  <TipoAttivitaIcona tipo={tipo} titolo={m.torneo_nome ?? undefined} />
                )}
              </div>
              {!(tipo === 'partita' && (puoInserire || m.risultato)) && m.parti.length > 0 && (
                <div className="att-parti">
                  {m.parti.map((r, i) => (
                    <span key={r.socio_id}>
                      {i > 0 && <span className="att-parti-sep">·</span>}
                      {cognomeIniziale(label(r.socio_id))}
                    </span>
                  ))}
                </div>
              )}
              {tipo === 'partita' && (
                <RisultatoPartita
                  prenotazioneId={String(m.id)}
                  sport={m.sport}
                  inizio={m.inizio}
                  fine={m.fine}
                  campoNome={m.campo_nome}
                  risultato={m.risultato}
                  dettaglio={m.risultato_dettaglio}
                  puoInserire={puoInserire}
                  partecipanti={m.parti.map((p) => ({ socioId: p.socio_id, nome: cognomeIniziale(label(p.socio_id)) }))}
                />
              )}
            </div>
          )
        })}
      </div>

      {lista.length > 1 && (
        <button
          type="button"
          className="btn btn-secondario btn-mini mt-3"
          onClick={() => setEspansa((v) => !v)}
        >
          {espansa ? 'Mostra solo la più recente' : `Mostra tutte (${lista.length})`}
          <span className={'freccia-espandi' + (espansa ? ' aperta' : '')}><IcoFreccia /></span>
        </button>
      )}
    </div>
  )
}

interface PartecipantePartita {
  socioId: string
  nome: string
}

// Una persona nella tabella "chi ha giocato contro chi": può essere un
// partecipante registrato (id = socio_id) o un ospite scritto a mano (id
// generato lato client, mai un socio — non viene mai conteggiato).
interface Slot {
  id: string
  nome: string
  squadra: 'A' | 'B'
}

type RigaSet = { casa: string; ospite: string }

function slotIniziali(partecipanti: PartecipantePartita[]): Slot[] {
  const presi = partecipanti.slice(0, 4)
  return presi.map((p, i) => ({ id: p.socioId, nome: p.nome, squadra: i % 2 === 0 ? 'A' : 'B' }))
}

// Riga "Home – punteggio/vs – Away" con le icone casa/trasferta: usata sia
// mentre si inserisce il punteggio (con "vs") sia nel cartellino finale
// salvato (con il risultato), stesso stile in entrambi i casi.
export function RigaSquadre({
  nomiCasa,
  nomiOspite,
  risultato,
}: {
  nomiCasa: string[]
  nomiOspite: string[]
  risultato?: { punti: [number, number]; set?: SetPunteggio[] }
}) {
  return (
    <div className="match-row">
      <div className="match-side">
        <span className="match-side-tag">HOME</span>
        <span className="match-side-nomi">{nomiCasa.join(' / ') || '—'}</span>
      </div>
      <div className="match-ris">
        {risultato ? (
          <>
            {risultato.punti[0]}–{risultato.punti[1]}
            {risultato.set?.length ? <span className="set-line">{formattaSet(risultato.set)}</span> : null}
          </>
        ) : (
          <span className="vs">vs</span>
        )}
      </div>
      <div className="match-side">
        <span className="match-side-tag">AWAY</span>
        <span className="match-side-nomi">{nomiOspite.join(' / ') || '—'}</span>
      </div>
    </div>
  )
}

// Stesso criterio dei tornei tra amici (RisultatoForm in
// DettaglioTorneoAmici.tsx): prima si formano le due squadre (tabella
// indicativa), poi si inserisce il punteggio — set per set nel padel (con
// setVinti/formattaSet), un unico punteggio nel calcio. Una volta salvato,
// il cartellino finale (RigaSquadre + orario/campo) è l'unica scheda: niente
// scheda dentro la scheda.
function RisultatoPartita({
  prenotazioneId,
  sport,
  inizio,
  fine,
  campoNome,
  risultato,
  dettaglio,
  puoInserire,
  partecipanti,
}: {
  prenotazioneId: string
  sport: string
  inizio: string
  fine: string
  campoNome: string | null
  risultato: string | null
  dettaglio: DettaglioRisultato | null
  puoInserire: boolean
  partecipanti: PartecipantePartita[]
}) {
  const isPadel = sport === 'padel'
  const imposta = useImpostaRisultato()
  const [modifica, setModifica] = useState(false)
  const [fase, setFase] = useState<'squadre' | 'punteggio'>('squadre')
  const [slots, setSlots] = useState<Slot[]>(() => slotIniziali(partecipanti))
  const [selezionato, setSelezionato] = useState<string | null>(null)
  const [nomeOspite, setNomeOspite] = useState('')
  const [sets, setSets] = useState<RigaSet[]>([{ casa: '', ospite: '' }])
  const [golCasa, setGolCasa] = useState('')
  const [golOspite, setGolOspite] = useState('')

  if (!puoInserire && !risultato) return null

  const metaOrarioCampo = (
    <div className="match-meta">
      <span className="chip-data">
        {dataEstesa(inizio.slice(0, 10))}, {oraLocale(new Date(inizio))}–{oraLocale(new Date(fine))}, {campoNome ?? 'Campo'}
      </span>
    </div>
  )

  // Risultato già salvato: cartellino unico "da sito sportivo" — squadre,
  // punteggio, orario/sport/campo, tutto in una sola scheda.
  if (risultato && dettaglio && !modifica) {
    return (
      <div className="match giocata">
        <RigaSquadre
          nomiCasa={dettaglio.squadraCasa}
          nomiOspite={dettaglio.squadraOspite}
          risultato={{ punti: [dettaglio.puntiCasa, dettaglio.puntiOspite], set: dettaglio.set ?? undefined }}
        />
        {metaOrarioCampo}
        {puoInserire && (
          <div className="flex justify-center mt-2">
            <button
              type="button"
              className="btn btn-secondario btn-mini"
              onClick={() => {
                const nuoviSlot: Slot[] = [
                  ...dettaglio.squadraCasa.map((nome, i) => ({ id: `salvato-a-${i}`, nome, squadra: 'A' as const })),
                  ...dettaglio.squadraOspite.map((nome, i) => ({ id: `salvato-b-${i}`, nome, squadra: 'B' as const })),
                ]
                setSlots(nuoviSlot)
                if (dettaglio.set?.length) setSets(dettaglio.set.map((s) => ({ casa: String(s.casa), ospite: String(s.ospite) })))
                else { setGolCasa(String(dettaglio.puntiCasa)); setGolOspite(String(dettaglio.puntiOspite)) }
                setFase('punteggio')
                setModifica(true)
              }}
            >
              Modifica risultato
            </button>
          </div>
        )}
      </div>
    )
  }
  // Risultato legacy (solo testo, senza dettaglio strutturato) o fallback.
  if (risultato && !modifica) {
    return (
      <div className="mt-auto pt-3 risultato-riga">
        <span className="risultato-etichetta">Risultato</span>
        <span className="risultato-valore">{risultato}</span>
        {puoInserire && (
          <button type="button" className="icon-btn" onClick={() => setModifica(true)} title="Modifica risultato">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  if (!puoInserire) return null

  const idsRegistrati = new Set(partecipanti.map((p) => p.socioId))
  const squadraA = slots.filter((s) => s.squadra === 'A')
  const squadraB = slots.filter((s) => s.squadra === 'B')
  const mostraAggiungiOspite = isPadel && slots.length < 4
  const completo = isPadel ? slots.length === 4 : squadraA.length > 0 && squadraB.length > 0
  const righeTabella = Math.max(squadraA.length, squadraB.length, isPadel ? 2 : 1)
  const nomiCasa = squadraA.map((p) => p.nome)
  const nomiOspite = squadraB.map((p) => p.nome)

  function clicNome(id: string) {
    if (selezionato === null) { setSelezionato(id); return }
    if (selezionato === id) { setSelezionato(null); return }
    setSlots((prev) => {
      const a = prev.find((s) => s.id === selezionato)
      const b = prev.find((s) => s.id === id)
      if (!a || !b) return prev
      return prev.map((s) => {
        if (s.id === a.id) return { ...s, squadra: b.squadra }
        if (s.id === b.id) return { ...s, squadra: a.squadra }
        return s
      })
    })
    setSelezionato(null)
  }

  function aggiungiOspite() {
    const nome = nomeOspite.trim()
    if (!nome || slots.length >= 4) return
    const squadra: 'A' | 'B' = squadraA.length <= squadraB.length ? 'A' : 'B'
    setSlots((prev) => [...prev, { id: `ospite-${Date.now()}`, nome, squadra }])
    setNomeOspite('')
  }

  function rimuoviOspite(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id))
    if (selezionato === id) setSelezionato(null)
  }

  if (fase === 'squadre') {
    return (
      <div className="mt-auto pt-3 flex flex-col gap-2">
        <table className="tabella-squadre">
          <thead>
            <tr>
              <th>Home</th>
              <th>Away</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: righeTabella }).map((_, riga) => {
              const pa = squadraA[riga]
              const pb = squadraB[riga]
              return (
                <tr key={riga}>
                  {[pa, pb].map((p, col) => (
                    <td key={col}>
                      {p ? (
                        <button
                          type="button"
                          className={'slot-giocatore' + (selezionato === p.id ? ' selezionato' : '')}
                          onClick={() => clicNome(p.id)}
                        >
                          {p.nome}
                          {!idsRegistrati.has(p.id) && (
                            <span
                              className="slot-giocatore-x"
                              title="Togli"
                              onClick={(e) => { e.stopPropagation(); rimuoviOspite(p.id) }}
                            >
                              ×
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="slot-vuoto">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="sub" style={{ fontSize: '0.76rem', margin: 0 }}>
          Tocca due nomi per scambiarli di squadra.
        </p>

        {mostraAggiungiOspite && (
          <div className="flex gap-2">
            <input
              type="text"
              className="!mt-0 flex-1"
              placeholder="Nome di chi manca (non registrato)"
              maxLength={40}
              value={nomeOspite}
              onChange={(e) => setNomeOspite(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aggiungiOspite() } }}
            />
            <button type="button" className="btn btn-secondario btn-mini !mt-0" onClick={aggiungiOspite} disabled={!nomeOspite.trim()}>
              + Aggiungi
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" className="btn btn-mini" disabled={!completo} onClick={() => setFase('punteggio')}>
            Continua
          </button>
          <button type="button" className="btn btn-secondario btn-mini" onClick={() => setModifica(false)}>
            Annulla
          </button>
        </div>
      </div>
    )
  }

  function aggiornaSet(i: number, campo: 'casa' | 'ospite', val: string) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [campo]: val } : s)))
  }
  function aggiungiSet() {
    setSets((prev) => (prev.length < 5 ? [...prev, { casa: '', ospite: '' }] : prev))
  }
  function rimuoviSet(i: number) {
    setSets((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  const setsValidi = sets.every((s) => s.casa !== '' && s.ospite !== '' && Number(s.casa) !== Number(s.ospite))
  const valido = isPadel ? setsValidi : golCasa !== '' && golOspite !== ''

  function salva() {
    if (!valido) return
    let testo: string
    let dett: DettaglioRisultato
    if (isPadel) {
      const setPunteggi: SetPunteggio[] = sets.map((s) => ({ casa: Number(s.casa), ospite: Number(s.ospite) }))
      const { casa, ospite } = setVinti(setPunteggi)
      testo = `${nomiCasa.join('/')} ${casa}-${ospite} ${nomiOspite.join('/')} (${formattaSet(setPunteggi)})`
      dett = { squadraCasa: nomiCasa, squadraOspite: nomiOspite, puntiCasa: casa, puntiOspite: ospite, set: setPunteggi }
    } else {
      const cCasa = Number(golCasa)
      const cOspite = Number(golOspite)
      testo = `${nomiCasa.join('/')} ${cCasa}-${cOspite} ${nomiOspite.join('/')}`
      dett = { squadraCasa: nomiCasa, squadraOspite: nomiOspite, puntiCasa: cCasa, puntiOspite: cOspite }
    }
    imposta.mutate({ prenotazioneId, risultato: testo, dettaglio: dett }, { onSuccess: () => setModifica(false) })
  }

  // Fase "punteggio": le squadre restano visibili in cima (non spariscono),
  // stesso stile del cartellino finale ma con "vs" al posto del punteggio.
  return (
    <div className="mt-auto pt-3 flex flex-col gap-2">
      <RigaSquadre nomiCasa={nomiCasa} nomiOspite={nomiOspite} />
      {isPadel ? (
        <div className="flex flex-col gap-1.5">
          {sets.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="sub" style={{ width: 44 }}>Set {i + 1}</span>
              <input type="number" min={0} className="torneo-amici-punteggio-input" value={s.casa} onChange={(e) => aggiornaSet(i, 'casa', e.target.value)} placeholder="0" />
              <span>–</span>
              <input type="number" min={0} className="torneo-amici-punteggio-input" value={s.ospite} onChange={(e) => aggiornaSet(i, 'ospite', e.target.value)} placeholder="0" />
              {sets.length > 1 && (
                <button type="button" className="icon-btn icon-btn-pericolo" title="Rimuovi set" onClick={() => rimuoviSet(i)}>✕</button>
              )}
            </div>
          ))}
          {sets.length < 5 && (
            <button type="button" className="btn btn-secondario btn-mini" style={{ alignSelf: 'flex-start' }} onClick={aggiungiSet}>
              + Aggiungi set
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <input type="number" min={0} className="torneo-amici-punteggio-input" value={golCasa} onChange={(e) => setGolCasa(e.target.value)} placeholder="0" />
          <span>–</span>
          <input type="number" min={0} className="torneo-amici-punteggio-input" value={golOspite} onChange={(e) => setGolOspite(e.target.value)} placeholder="0" />
          <span className="sub">gol segnati da ciascuna squadra</span>
        </div>
      )}
      {imposta.error && <p className="msg-errore">{messaggioErrore(imposta.error)}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-mini" onClick={salva} disabled={!valido || imposta.isPending}>
          {imposta.isPending ? 'Salvo…' : 'Salva risultato'}
        </button>
        <button type="button" className="btn btn-secondario btn-mini" onClick={() => setFase('squadre')}>
          ‹ Squadre
        </button>
      </div>
    </div>
  )
}
