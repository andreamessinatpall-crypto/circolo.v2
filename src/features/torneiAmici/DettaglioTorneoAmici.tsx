import { useState } from 'react'
import ModalConferma from '@/components/ModalConferma'
import Sezione from '@/components/Sezione'
import { messaggioErrore } from '@/lib/errori'
import { titleCase, dataEstesa, inizialiDaEtichetta } from '@/lib/formato'
import { oraLocale } from '@/features/prenotazioni/orari'
import { formattaSet, incontroDisputato, setVinti } from '@/features/tornei/calendario'
import { formatNomeAmericano } from '@/features/tornei/americano'
import { useAmici } from '@/features/profilo/amici/useAmici'
import Avatar from '@/components/Avatar'
import { MedagliaPodio } from '@/components/MedagliaPodio'
import { calcolaClassificaAmici } from './classificaAmici'
import InvitaAltriAmiciModal from './InvitaAltriAmiciModal'
import { BottoneProgrammaAmici } from './ProgrammaIncontroAmici'
import {
  useAnnullaPrenotazioneAmici,
  useAvviaTorneoAmici,
  useCambiaStatoTorneoAmici,
  useDettaglioTorneoAmici,
  useEliminaTorneoAmici,
  useFormaSquadra,
  useInserisciRisultatoAmici,
  useInvitaAltriAmiciTorneo,
  useScioglieSquadra,
} from './useTorneiAmici'
import type { IncontroAmici, PartecipanteTorneoAmici, SetPunteggioAmici, SquadraAmici } from './tipi'

const ETICHETTE_SPORT: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }
const ETICHETTE_FORMATO: Record<string, string> = { girone: "Girone all'italiana", eliminazione: 'Eliminazione diretta' }
const ETICHETTE_STATO: Record<string, string> = { creazione: 'In formazione', in_corso: 'In corso', concluso: 'Concluso' }

function IcoPartecipanti() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

// abbreviato: "Cognome Iniziale." invece del nome completo — usato in
// classifica e partite, come i tornei ufficiali (formatNomeAmericano).
function nomeSquadra(
  s: SquadraAmici | undefined,
  partecipanti: PartecipanteTorneoAmici[],
  nomiSoci: Map<string, string>,
  abbreviato = false,
): string {
  if (!s) return '?'
  if (s.nome) return s.nome
  const membri = partecipanti
    .filter((p) => p.squadra_id === s.id)
    .map((p) => {
      const nome = titleCase(nomiSoci.get(p.socio_id) ?? '?')
      return abbreviato ? formatNomeAmericano(nome) : nome
    })
  return membri.join(' · ') || 'Coppia'
}

function FormaSquadre({
  torneoId,
  liberi,
  squadre,
  partecipanti,
  nomiSoci,
}: {
  torneoId: string
  liberi: PartecipanteTorneoAmici[]
  squadre: SquadraAmici[]
  partecipanti: PartecipanteTorneoAmici[]
  nomiSoci: Map<string, string>
}) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const forma = useFormaSquadra(torneoId)
  const scioglie = useScioglieSquadra(torneoId)

  function handleForma() {
    if (!a || !b || a === b) return
    forma.mutate({ coppia: [Number(a), Number(b)] }, { onSuccess: () => { setA(''); setB('') } })
  }

  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <div className="club-sez-header" style={{ marginBottom: 12 }}>
        <span className="club-sez-icona"><IcoPartecipanti /></span>
        <h3 className="club-sez-titolo">Forma le coppie</h3>
      </div>

      {squadre.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {squadre.map((s) => (
            <div key={s.id} className="torneo-amici-squadra-riga">
              <span>{nomeSquadra(s, partecipanti, nomiSoci)}</span>
              <button type="button" className="icon-btn icon-btn-pericolo" title="Sciogli coppia" onClick={() => scioglie.mutate(s.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {liberi.length >= 2 ? (
        <div className="dati-coppia" style={{ marginTop: 0 }}>
          <div>
            <span className="etichetta">Giocatore 1</span>
            <select value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Scegli…</option>
              {liberi.map((p) => (
                <option key={p.id} value={p.id} disabled={String(p.id) === b}>
                  {titleCase(nomiSoci.get(p.socio_id) ?? '?')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="etichetta">Giocatore 2</span>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">Scegli…</option>
              {liberi.map((p) => (
                <option key={p.id} value={p.id} disabled={String(p.id) === a}>
                  {titleCase(nomiSoci.get(p.socio_id) ?? '?')}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <p className="sub">
          {liberi.length === 0 ? 'Tutti i partecipanti sono già in coppia.' : 'Serve almeno un altro giocatore libero per formare una coppia.'}
        </p>
      )}

      {liberi.length >= 2 && (
        <button type="button" className="btn btn-sm mt-2" onClick={handleForma} disabled={!a || !b || a === b || forma.isPending}>
          {forma.isPending ? 'Formo…' : '+ Forma coppia'}
        </button>
      )}
      {forma.error && <p className="msg-errore mt-2">{messaggioErrore(forma.error)}</p>}
    </div>
  )
}

type RigaSet = { casa: string; ospite: string }

// Padel: risultato inserito set per set (es. 6-4, 4-6, 10-7 al terzo), con i
// set vinti calcolati con la stessa logica dei tornei ufficiali (setVinti).
// Calcio: un unico punteggio (gol), niente set.
function RisultatoForm({
  incontro,
  giocatori,
  torneo,
  incontri,
  onFatto,
}: {
  incontro: IncontroAmici
  giocatori: string[]
  torneo: Parameters<typeof useInserisciRisultatoAmici>[0]
  incontri: IncontroAmici[]
  onFatto: () => void
}) {
  const isPadel = torneo.sport === 'padel'
  const [sets, setSets] = useState<RigaSet[]>(
    incontro.set_punteggi?.length
      ? incontro.set_punteggi.map((s) => ({ casa: String(s.casa), ospite: String(s.ospite) }))
      : [{ casa: '', ospite: '' }],
  )
  const [casa, setCasa] = useState(!isPadel && incontro.punti_casa != null ? String(incontro.punti_casa) : '')
  const [ospite, setOspite] = useState(!isPadel && incontro.punti_ospite != null ? String(incontro.punti_ospite) : '')
  const inserisci = useInserisciRisultatoAmici(torneo, incontri)

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
  const valido = isPadel ? setsValidi : casa !== '' && ospite !== '' && Number(casa) !== Number(ospite)

  function handleConferma() {
    if (!valido) return
    if (isPadel) {
      const setPunteggi: SetPunteggioAmici[] = sets.map((s) => ({ casa: Number(s.casa), ospite: Number(s.ospite) }))
      const { casa: setCasaVinti, ospite: setOspiteVinti } = setVinti(setPunteggi)
      inserisci.mutate(
        { incontro, puntiCasa: setCasaVinti, puntiOspite: setOspiteVinti, setPunteggi, giocatori },
        { onSuccess: onFatto },
      )
    } else {
      inserisci.mutate(
        { incontro, puntiCasa: Number(casa), puntiOspite: Number(ospite), giocatori },
        { onSuccess: onFatto },
      )
    }
  }

  return (
    <div className="flex flex-col gap-2" style={{ width: '100%' }}>
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
          <input type="number" min={0} className="torneo-amici-punteggio-input" value={casa} onChange={(e) => setCasa(e.target.value)} placeholder="0" />
          <span>–</span>
          <input type="number" min={0} className="torneo-amici-punteggio-input" value={ospite} onChange={(e) => setOspite(e.target.value)} placeholder="0" />
          <span className="sub">gol segnati da ciascuna squadra</span>
        </div>
      )}
      {inserisci.error && <p className="msg-errore">{messaggioErrore(inserisci.error)}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-mini" onClick={handleConferma} disabled={!valido || inserisci.isPending}>
          {inserisci.isPending ? 'Salvo…' : 'Salva risultato'}
        </button>
        <button type="button" className="btn btn-secondario btn-mini" onClick={onFatto}>Annulla</button>
      </div>
    </div>
  )
}

export default function DettaglioTorneoAmici({
  torneoId,
  profiloId,
  onChiuso,
}: {
  torneoId: string
  profiloId: string
  onChiuso: () => void
}) {
  const d = useDettaglioTorneoAmici(torneoId)
  const amici = useAmici(profiloId)
  const avvia = useAvviaTorneoAmici(torneoId)
  const cambiaStato = useCambiaStatoTorneoAmici(torneoId, profiloId)
  const elimina = useEliminaTorneoAmici(profiloId)
  const annullaPren = useAnnullaPrenotazioneAmici(torneoId)
  const invitaAltri = useInvitaAltriAmiciTorneo(torneoId, d.torneo?.nome ?? '', titleCase(d.nomiSoci?.get(profiloId) ?? ''))
  const [inserendoIn, setInserendoIn] = useState<string | null>(null)
  const [confermaElimina, setConfermaElimina] = useState(false)
  const [invitando, setInvitando] = useState(false)

  if (d.caricamento || !d.torneo) return <p className="sub">Caricamento…</p>

  const torneo = d.torneo
  const partecipanti = d.partecipanti ?? []
  const squadre = d.squadre ?? []
  const incontri = d.incontri ?? []
  const prenotazioni = d.prenotazioni ?? []
  const nomiSoci = d.nomiSoci ?? new Map<string, string>()
  const fotoSoci = d.fotoSoci ?? new Map<string, string | null>()

  const sonoCreatore = torneo.creatore_id === profiloId

  const idPartecipanti = new Set(partecipanti.map((p) => p.socio_id))
  const amiciInvitabili = amici.amici.filter((a) => !idPartecipanti.has(a.id))

  const accettati = partecipanti.filter((p) => p.stato_invito === 'accettata')
  const liberi = accettati.filter((p) => !p.squadra_id)
  const squadreComplete = squadre.length >= 2 && liberi.length === 0 && accettati.length === squadre.length * 2
  const prenotazioniByIncontro = new Map(prenotazioni.map((p) => [p.torneo_amici_incontro_id, p]))

  const classifica = calcolaClassificaAmici(torneo.sport, squadre, incontri)
  const tutteDisputate = incontri.length > 0 && incontri.every((m) => incontroDisputato(m))

  function giocatoriIncontro(m: IncontroAmici): string[] {
    return partecipanti.filter((p) => p.squadra_id === m.casa_id || p.squadra_id === m.ospite_id).map((p) => p.socio_id)
  }

  function possoInserire(m: IncontroAmici): boolean {
    return sonoCreatore || giocatoriIncontro(m).includes(profiloId)
  }

  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <button type="button" className="btn btn-secondario btn-mini mb-2" onClick={onChiuso}>← Tornei</button>

      {/* Stato: riga distinta sopra al blocco nome, come nei tornei del club */}
      <div className="torneo-stato-row">
        {torneo.stato === 'creazione' ? (
          <span className="pill torneo-hero-pill off">{ETICHETTE_STATO.creazione}</span>
        ) : sonoCreatore ? (
          <select
            className="torneo-hero-stato"
            value={torneo.stato}
            onChange={(e) => cambiaStato.mutate(e.target.value as 'in_corso' | 'concluso')}
          >
            <option value="in_corso">In corso</option>
            <option value="concluso">Concluso</option>
          </select>
        ) : (
          <span className={'pill torneo-hero-pill' + (torneo.stato !== 'in_corso' ? ' off' : '')}>
            {ETICHETTE_STATO[torneo.stato]}
          </span>
        )}
      </div>

      {/* Blocco nome: intestazione colorata, coerente con i tornei del club */}
      <div className={'torneo-hero torneo-hero-' + torneo.sport}>
        <div className="torneo-hero-nome">
          <span className="torneo-hero-puntino" aria-hidden>•</span>
          {torneo.nome}
          <span className="torneo-hero-puntino" aria-hidden>•</span>
        </div>
      </div>
      <div className="torneo-hero-sub">
        {ETICHETTE_SPORT[torneo.sport]} · {ETICHETTE_FORMATO[torneo.formato]}
        {torneo.andata_ritorno && ' · Andata e ritorno'}
        {torneo.formato === 'eliminazione' && torneo.finale_secca && ' · Finale secca'}
        {torneo.formato === 'eliminazione' && torneo.terzo_posto && ' · 3°/4° posto'}
      </div>

      {/* ── Partecipanti ── */}
      <Sezione titolo={`Partecipanti (${partecipanti.length})`}>
        <div className="mb-3">
          {partecipanti.map((p) => {
            const nome = titleCase(nomiSoci.get(p.socio_id) ?? '?')
            return (
              <div key={p.id} className="comp-riga">
                <span className="torneo-amici-persona nome">
                  <Avatar foto={fotoSoci.get(p.socio_id) ?? null} iniziali={inizialiDaEtichetta(nome)} titolo={nome} size={26} />
                  {nome}
                </span>
              </div>
            )
          })}
        </div>
      </Sezione>

      {sonoCreatore && torneo.stato === 'creazione' && (
        <button type="button" className="btn btn-secondario btn-sm mb-3" onClick={() => setInvitando(true)}>
          + Invita altri amici
        </button>
      )}

      {/* ── Formazione coppie (solo creatore, solo in fase di creazione) ── */}
      {sonoCreatore && torneo.stato === 'creazione' && (
        <FormaSquadre torneoId={torneoId} liberi={liberi} squadre={squadre} partecipanti={partecipanti} nomiSoci={nomiSoci} />
      )}

      {sonoCreatore && torneo.stato === 'creazione' && (
        <button
          type="button"
          className="btn btn-block mt-3"
          disabled={!squadreComplete || avvia.isPending}
          onClick={() => avvia.mutate({ formato: torneo.formato, squadraIds: squadre.map((s) => s.id), andataRitorno: torneo.andata_ritorno })}
        >
          {avvia.isPending ? 'Avvio…' : squadreComplete ? '🏆 Avvia il torneo' : 'Servono almeno 2 coppie, tutti in coppia'}
        </button>
      )}

      {/* ── Calendario/classifica (torneo avviato) ── */}
      {torneo.stato !== 'creazione' && (
        <>
          {tutteDisputate && classifica[0] && (
            <div className="podio mb-3">
              <div className="podio-corona">🏆</div>
              <div className="podio-eyebrow">Vincitore del torneo</div>
              <div className="podio-vincitore">
                {nomeSquadra(squadre.find((s) => s.id === classifica[0].id), partecipanti, nomiSoci, true)}
              </div>
              {classifica.length > 1 && (
                <div className="podio-lista">
                  {classifica.slice(0, 3).map((r, i) => (
                    <div key={r.id} className="podio-riga">
                      <span className="podio-medaglia">{['🥇', '🥈', '🥉'][i]}</span>
                      <span className="podio-nome">{nomeSquadra(squadre.find((s) => s.id === r.id), partecipanti, nomiSoci, true)}</span>
                      <span className="podio-pti">{r.pti} pti</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Sezione titolo="Classifica">
            <div className="classifica-wow mb-3">
              <table className="classifica">
                <thead>
                  <tr>
                    {(torneo.sport === 'calcio'
                      ? ['#', 'Coppia', 'G', 'V', 'N', 'P', 'DR', 'Pti']
                      : ['#', 'Coppia', 'G', 'V', 'P', 'DS', 'Pti']
                    ).map((c) => <th key={c}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {classifica.map((r, i) => {
                    const dd = (r.diff > 0 ? '+' : '') + r.diff
                    const celle =
                      torneo.sport === 'calcio'
                        ? [r.g, r.v, r.n, r.p, dd, r.pti]
                        : [r.g, r.v, r.p, dd, r.pti]
                    return (
                      <tr key={r.id}>
                        <td>{i < 3 ? <MedagliaPodio pos={(i + 1) as 1 | 2 | 3} /> : <span className="cl-rank">{i + 1}</span>}</td>
                        <td className="nome-cl">{nomeSquadra(squadre.find((s) => s.id === r.id), partecipanti, nomiSoci, true)}</td>
                        {celle.map((val, idx) => (
                          <td key={idx} className={idx === celle.length - 1 ? 'pti' : undefined}>{val}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Sezione>

          <Sezione titolo="Partite">
          <div className="mb-3">
            {incontri.map((m) => {
              const pren = prenotazioniByIncontro.get(m.id)
              const disputata = incontroDisputato(m)
              return (
                <div key={m.id} className={'match' + (disputata ? ' giocata' : '')}>
                  <div className="match-row">
                    <div className="match-side">{nomeSquadra(squadre.find((s) => s.id === m.casa_id), partecipanti, nomiSoci, true)}</div>
                    <div className="match-ris">
                      {disputata ? (
                        <>
                          {m.punti_casa}–{m.punti_ospite}
                          {m.set_punteggi?.length ? <span className="set-line">{formattaSet(m.set_punteggi)}</span> : null}
                        </>
                      ) : (
                        <span className="vs">vs</span>
                      )}
                    </div>
                    <div className="match-side">{nomeSquadra(squadre.find((s) => s.id === m.ospite_id), partecipanti, nomiSoci, true)}</div>
                  </div>

                  <div className="match-meta">
                    {pren ? (
                      <span className={'chip-data' + (disputata ? '' : ' prog')}>
                        {(disputata ? '' : '📅 ') + dataEstesa(pren.inizio.slice(0, 10)) + ' · ' + oraLocale(new Date(pren.inizio))}
                      </span>
                    ) : (
                      <span className="chip-data attesa">Da prenotare</span>
                    )}
                  </div>

                  {inserendoIn === m.id ? (
                    <RisultatoForm incontro={m} giocatori={giocatoriIncontro(m)} torneo={torneo} incontri={incontri} onFatto={() => setInserendoIn(null)} />
                  ) : (
                    <div className="flex gap-2 flex-wrap" style={{ justifyContent: 'center', marginTop: 9 }}>
                      {!pren && !disputata && possoInserire(m) && (
                        <BottoneProgrammaAmici sport={torneo.sport} incontroId={m.id} etichetta="Prenota" />
                      )}
                      {pren && !disputata && possoInserire(m) && (
                        <button type="button" className="btn btn-pericolo btn-mini" onClick={() => annullaPren.mutate(pren.id)}>
                          Annulla prenotazione
                        </button>
                      )}
                      {possoInserire(m) && (
                        <button type="button" className="btn btn-secondario btn-mini" onClick={() => setInserendoIn(m.id)}>
                          {disputata ? 'Modifica risultato' : 'Inserisci risultato'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </Sezione>
        </>
      )}

      {/* ── Gestione torneo (solo creatore; lo stato si cambia dal menu in alto) ── */}
      {sonoCreatore && (
        <div className="flex justify-end mt-2">
          <button type="button" className="btn btn-pericolo btn-mini" onClick={() => setConfermaElimina(true)}>
            Elimina torneo
          </button>
        </div>
      )}

      {confermaElimina && (
        <ModalConferma
          titolo="Eliminare questo torneo?"
          messaggio={<>Verranno eliminati definitivamente squadre, partite e risultati di <strong>{torneo.nome}</strong>. Questa azione non è reversibile.</>}
          labelConferma="Sì, elimina"
          pericolo
          onConferma={() => { setConfermaElimina(false); elimina.mutate(torneoId, { onSuccess: onChiuso }) }}
          onAnnulla={() => setConfermaElimina(false)}
        />
      )}

      {invitando && (
        <InvitaAltriAmiciModal amici={amiciInvitabili} invita={invitaAltri} onChiudi={() => setInvitando(false)} />
      )}
    </div>
  )
}
