import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import {
  formattaSet,
  incontroDisputato,
  mancaColonnaRisultato,
  perGiornata,
  SCRIPT_RISULTATO,
  setVinti,
} from './calendario'
import {
  incontriDelGirone,
  mappaLoghi,
  nomeGirone,
  numGironi,
  squadreDelGirone,
  unitaTorneo,
} from './gironi'
import { SIMBOLO_ANDATA, SIMBOLO_RITORNO } from './eliminazione'
import { assegnaPuntiPartita, assegnaPuntiVittoriaAuto } from './punti'
import { NomeSquadra } from './NomeSquadra'
import { BottoneAnnullaProgrammazione, BottoneProgramma } from './ProgrammaIncontro'
import type { Componente, Incontro, SetPunteggio, Squadra, Torneo } from './tipi'

// (Fase 6d) Calendario + risultati. Con più gironi mostra una sezione per
// girone; lo staff (gestore) può inserire i punteggi, tutti vedono il calendario.
// (Fase 6e) prenByIncontro = incontro_id -> data/ora prenotazione; miaSquadraId =
// la squadra del socio (per il bottone "Sfida" del padel).
export default function Risultati({
  torneo,
  squadre,
  incontri,
  gestore,
  prenByIncontro,
  miaSquadraId,
  compBySquadra,
  gironeFiltro = null,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  gestore: boolean
  prenByIncontro: Record<string, string>
  miaSquadraId?: number | string
  compBySquadra: Record<string, Componente[]>
  gironeFiltro?: number | null
}) {
  const n = numGironi(torneo)
  // Tutti i useState prima di qualsiasi return condizionale (Hooks rules)
  const [giroSel, setGiroSel] = useState<number | null>(null)
  const [giornataSel, setGiornataSel] = useState<number | null>(null)

  if (!incontri.length) {
    return (
      <p className="part-vuoto">
        {gestore
          ? 'Calendario non ancora generato. Vai in "Gestione torneo" e premi "Genera calendario".'
          : 'Calendario non ancora disponibile.'}
      </p>
    )
  }

  // Girone singolo: filtri per giornata
  if (n <= 1) {
    const giornate = perGiornata(incontri)
    const incFiltrati =
      giornataSel != null ? incontri.filter((m) => m.round === giornataSel) : incontri
    const ar = !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno
    const maxRound = giornate.length ? giornate[giornate.length - 1].round : 0
    const numAndata = ar ? Math.floor(maxRound / 2) : maxRound
    const etGiornata = (round: number) => {
      if (!ar) return 'G. ' + round
      if (round <= numAndata) return 'G. ' + round + ' ' + SIMBOLO_ANDATA
      return 'G. ' + (round - numAndata) + ' ' + SIMBOLO_RITORNO
    }
    return (
      <div>
        {giornate.length > 1 && (
          <div className="round-filtri">
            <button
              type="button"
              className={`round-chip${giornataSel === null ? ' attivo' : ''}`}
              onClick={() => setGiornataSel(null)}
            >
              Tutte
            </button>
            {giornate.map(({ round }) => (
              <button
                key={round}
                type="button"
                className={`round-chip${giornataSel === round ? ' attivo' : ''}`}
                onClick={() => setGiornataSel(giornataSel === round ? null : round)}
              >
                {etGiornata(round)}
              </button>
            ))}
          </div>
        )}
        <GironeRisultati
          torneo={torneo}
          squadre={squadre}
          incontri={incFiltrati}
          gestore={gestore}
          prenByIncontro={prenByIncontro}
          miaSquadraId={miaSquadraId}
          squadreTorneo={squadre}
          incontriTorneo={incontri}
          compBySquadra={compBySquadra}
        />
      </div>
    )
  }

  // Gironi multipli: filtri per girone
  const filtroAttivo = gironeFiltro ?? giroSel
  const gironi = filtroAttivo != null ? [filtroAttivo] : Array.from({ length: n }, (_, i) => i + 1)
  const mostraBottoni = gironeFiltro == null

  return (
    <div>
      {mostraBottoni && (
        <div className="round-filtri">
          <button
            type="button"
            className={`round-chip${giroSel === null ? ' attivo' : ''}`}
            onClick={() => setGiroSel(null)}
          >
            Tutti
          </button>
          {Array.from({ length: n }, (_, i) => i + 1).map((g) => (
            <button
              key={g}
              type="button"
              className={`round-chip${giroSel === g ? ' attivo' : ''}`}
              onClick={() => setGiroSel(giroSel === g ? null : g)}
            >
              {nomeGirone(torneo, g)}
            </button>
          ))}
        </div>
      )}

      {gironi.map((g) => {
        const sg = squadreDelGirone(torneo, squadre, g)
        return (
          <div key={g}>
            {filtroAttivo == null && (
              <div className="eyebrow" style={{ marginTop: 18 }}>
                {nomeGirone(torneo, g)}
              </div>
            )}
            {sg.length ? (
              <GironeRisultati
                torneo={torneo}
                squadre={sg}
                incontri={incontriDelGirone(incontri, g)}
                gestore={gestore}
                prenByIncontro={prenByIncontro}
                miaSquadraId={miaSquadraId}
                squadreTorneo={squadre}
                incontriTorneo={incontri}
                compBySquadra={compBySquadra}
              />
            ) : (
              <p className="sub">Nessuna {unitaTorneo(torneo.sport, false)} in questo girone.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function GironeRisultati({
  torneo,
  squadre,
  incontri,
  gestore,
  prenByIncontro,
  miaSquadraId,
  squadreTorneo,
  incontriTorneo,
  compBySquadra,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  gestore: boolean
  prenByIncontro: Record<string, string>
  miaSquadraId?: number | string
  squadreTorneo: Squadra[]
  incontriTorneo: Incontro[]
  compBySquadra: Record<string, Componente[]>
}) {
  const nomi: Record<string, string> = {}
  for (const s of squadre) nomi[String(s.id)] = s.nome
  const loghi = mappaLoghi(squadre)

  if (!incontri.length) {
    return <p className="sub">Nessun incontro in questo girone.</p>
  }

  const ar = !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno
  const maxRoundG = Math.max(...incontri.map((m) => m.round))
  const numAndataG = ar ? Math.floor(maxRoundG / 2) : maxRoundG

  return (
    <div>
      {perGiornata(incontri).map(({ round, partite }) => {
        const giocate = partite.filter(incontroDisputato).length
        const numGiornata = ar
          ? (round <= numAndataG ? round : round - numAndataG)
          : round
        const simbolo = ar ? ' ' + (round <= numAndataG ? SIMBOLO_ANDATA : SIMBOLO_RITORNO) : ''
        return (
          <div key={round}>
            <div className="giornata-band">
              <span className="g-num">{numGiornata}</span>
              <div className="g-lab">
                <b>{'Giornata' + simbolo}</b>
              </div>
              <span className="g-stato">
                {giocate === partite.length ? 'Completata' : giocate + '/' + partite.length + ' giocate'}
              </span>
            </div>
            {partite.map((m) => (
              <RigaRisultato
                key={m.id}
                torneo={torneo}
                m={m}
                nomi={nomi}
                loghi={loghi}
                gestore={gestore}
                prenByIncontro={prenByIncontro}
                miaSquadraId={miaSquadraId}
                squadreTorneo={squadreTorneo}
                incontriTorneo={incontriTorneo}
                compBySquadra={compBySquadra}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function RigaRisultato({
  torneo,
  m,
  nomi,
  loghi,
  gestore,
  prenByIncontro,
  miaSquadraId,
  squadreTorneo,
  incontriTorneo,
  compBySquadra,
}: {
  torneo: Torneo
  m: Incontro
  nomi: Record<string, string>
  loghi: Record<string, string | null>
  gestore: boolean
  prenByIncontro: Record<string, string>
  miaSquadraId?: number | string
  squadreTorneo: Squadra[]
  incontriTorneo: Incontro[]
  compBySquadra: Record<string, Componente[]>
}) {
  const qc = useQueryClient()
  const disputata = incontroDisputato(m)
  // (Fase 6e) prenotazione collegata: c'è già un campo+orario fissato?
  const iso = prenByIncontro[String(m.id)]
  const dPren = iso ? new Date(iso) : null
  // Il socio può "sfidare" (programmare lui) solo nel padel, a torneo in corso,
  // se gioca questo incontro, non ancora programmato né disputato.
  const sonoNellaPartita =
    miaSquadraId != null &&
    (String(m.casa_id) === String(miaSquadraId) || String(m.ospite_id) === String(miaSquadraId))
  const puoSfidare =
    !gestore &&
    sonoNellaPartita &&
    torneo.sport === 'padel' &&
    torneo.stato === 'in_corso' &&
    !disputata &&
    !dPren

  // Salvataggio del risultato: riceve già il patch pronto da scrivere.
  const salva = useMutation({
    mutationFn: async (patch: Partial<Incontro>) => {
      const { error } = await supabase.from('incontri').update(patch).eq('id', m.id)
      if (error) throw error
      // (Fase 7b) Punti partita ai vincitori, ricalcolati sul risultato attuale.
      // La data evento è quella della prenotazione collegata, altrimenti il
      // giorno indicato (appena salvato o già presente).
      const dataEvento = iso ?? patch.data_disputata ?? m.data_disputata ?? null
      const aggiornato = { ...m, ...patch }
      await assegnaPuntiPartita(torneo, aggiornato, dataEvento)
      // (Fase 7b) Vittoria torneo automatica: con questo risultato il calendario
      // potrebbe essersi completato. Ricalcolo sulla situazione aggiornata.
      const incontriAgg = incontriTorneo.map((x) => (x.id === m.id ? aggiornato : x))
      await assegnaPuntiVittoriaAuto(torneo, squadreTorneo, incontriAgg, compBySquadra)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei'] }),
    onError: (e: unknown) =>
      window.alert(
        mancaColonnaRisultato(e) ? SCRIPT_RISULTATO : 'Salvataggio non riuscito: ' + messaggioErrore(e),
      ),
  })

  return (
    <div className={'match' + (disputata ? ' giocata' : '')}>
      <div className="match-row">
        <div className="match-side">
          <NomeSquadra nome={nomi[String(m.casa_id)] ?? '?'} logoUrl={loghi[String(m.casa_id)]} sport={torneo.sport} />
        </div>
        <div className="match-ris">
          {disputata ? (
            <>
              {m.punti_casa}–{m.punti_ospite}
              {torneo.sport === 'padel' && m.set_punteggi?.length ? (
                <span className="set-line">{formattaSet(m.set_punteggi)}</span>
              ) : null}
            </>
          ) : (
            <span className="vs">vs</span>
          )}
        </div>
        <div className="match-side">
          <NomeSquadra nome={nomi[String(m.ospite_id)] ?? '?'} logoUrl={loghi[String(m.ospite_id)]} sport={torneo.sport} />
        </div>
      </div>

      <div className="match-meta">
        {dPren ? (
          // C'è una prenotazione: mostro data (e l'ora se non ancora disputata).
          <span className={'chip-data' + (disputata ? '' : ' prog')}>
            {(disputata ? '' : '📅 ') +
              dPren.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }) +
              ' · ' +
              dPren.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : m.data_disputata ? (
          <span className="chip-data">
            {new Date(m.data_disputata + 'T00:00:00').toLocaleDateString('it-IT', {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        ) : puoSfidare ? (
          <BottoneProgramma
            torneo={torneo}
            m={m}
            nomi={nomi}
            compCasa={compBySquadra[String(m.casa_id)] ?? []}
            compOspite={compBySquadra[String(m.ospite_id)] ?? []}
            etichetta="Sfida"
            titolo="Organizza la sfida"
            classeCompleta="chip-data sfida"
          />
        ) : (
          <span className="chip-data attesa">Da programmare</span>
        )}
      </div>

      {/* (Fase 6e) organizzatore: fissa/sposta campo e orario dell'incontro. */}
      {gestore && !disputata && (
        <div className="match-prog">
          <BottoneProgramma
            torneo={torneo}
            m={m}
            nomi={nomi}
            compCasa={compBySquadra[String(m.casa_id)] ?? []}
            compOspite={compBySquadra[String(m.ospite_id)] ?? []}
            etichetta={dPren ? 'Riprogramma' : 'Programma'}
          />
          {dPren && <BottoneAnnullaProgrammazione m={m} />}
        </div>
      )}

      {gestore && dPren ? (
        torneo.sport === 'padel' ? (
          <EditorPadel m={m} salva={salva.mutate} inSalvataggio={salva.isPending} />
        ) : (
          <EditorCalcio m={m} salva={salva.mutate} inSalvataggio={salva.isPending} />
        )
      ) : gestore && !dPren ? (
        <p className="match-avviso">Programma l'incontro prima di inserire il risultato.</p>
      ) : null}
    </div>
  )
}

// Calcio: due numeri (gol casa / gol ospite) + data della partita.
function EditorCalcio({
  m,
  salva,
  inSalvataggio,
}: {
  m: Incontro
  salva: (patch: Partial<Incontro>) => void
  inSalvataggio: boolean
}) {
  const [casa, setCasa] = useState(m.punti_casa == null ? '' : String(m.punti_casa))
  const [ospite, setOspite] = useState(m.punti_ospite == null ? '' : String(m.punti_ospite))

  function onSalva() {
    if (casa.trim() === '' && ospite.trim() === '') {
      salva({ punti_casa: null, punti_ospite: null })
      return
    }
    const a = parseInt(casa, 10)
    const b = parseInt(ospite, 10)
    if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) {
      window.alert('Inserisci due punteggi validi (numeri ≥ 0).')
      return
    }
    salva({ punti_casa: a, punti_ospite: b })
  }

  return (
    <div className="match-admin">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={casa}
        onChange={(e) => setCasa(e.target.value)}
      />
      <span>–</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={ospite}
        onChange={(e) => setOspite(e.target.value)}
      />
      <button type="button" className="btn btn-secondario" onClick={onSalva} disabled={inSalvataggio}>
        Salva
      </button>
    </div>
  )
}

// Padel: un editor a set. Ogni set ha i game di casa e ospite; il vincitore è
// chi vince più set. Si salvano i set vinti (punti_casa/ospite) + i game (set_punteggi).
function EditorPadel({
  m,
  salva,
  inSalvataggio,
}: {
  m: Incontro
  salva: (patch: Partial<Incontro>) => void
  inSalvataggio: boolean
}) {
  type RigaSet = { casa: string; ospite: string }
  const iniziali: RigaSet[] =
    m.set_punteggi?.length
      ? m.set_punteggi.map((s) => ({ casa: String(s.casa), ospite: String(s.ospite) }))
      : [{ casa: '', ospite: '' }]
  const [sets, setSets] = useState<RigaSet[]>(iniziali)

  const aggiorna = (i: number, campo: 'casa' | 'ospite', val: string) =>
    setSets((prev) => prev.map((r, j) => (j === i ? { ...r, [campo]: val } : r)))
  const togliSet = (i: number) => setSets((prev) => prev.filter((_, j) => j !== i))
  const aggiungiSet = () => setSets((prev) => [...prev, { casa: '', ospite: '' }])

  function onSalva() {
    const nonVuoti = sets.filter((s) => s.casa.trim() !== '' || s.ospite.trim() !== '')
    if (!nonVuoti.length) {
      salva({ punti_casa: null, punti_ospite: null, set_punteggi: null })
      return
    }
    const validi: SetPunteggio[] = []
    for (let i = 0; i < nonVuoti.length; i++) {
      const c = parseInt(nonVuoti[i].casa, 10)
      const o = parseInt(nonVuoti[i].ospite, 10)
      if (Number.isNaN(c) || Number.isNaN(o) || c < 0 || o < 0) {
        window.alert('Set ' + (i + 1) + ': inserisci i game di entrambe le coppie (numeri ≥ 0).')
        return
      }
      if (c === o) {
        window.alert('Set ' + (i + 1) + ': un set di padel non può finire in parità.')
        return
      }
      validi.push({ casa: c, ospite: o })
    }
    const v = setVinti(validi)
    if (v.casa === v.ospite) {
      window.alert('Risultato in parità di set: nel padel deve esserci una coppia vincitrice.')
      return
    }
    salva({ punti_casa: v.casa, punti_ospite: v.ospite, set_punteggi: validi })
  }

  return (
    <div className="match-admin">
      <div className="set-editor">
        {sets.map((r, i) => (
          <div key={i} className="set-riga">
            <span className="set-et">Set {i + 1}</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="set-game"
              value={r.casa}
              onChange={(e) => aggiorna(i, 'casa', e.target.value)}
            />
            <span>–</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="set-game"
              value={r.ospite}
              onChange={(e) => aggiorna(i, 'ospite', e.target.value)}
            />
            {sets.length > 1 && (
              <button type="button" className="x" title="Togli set" onClick={() => togliSet(i)}>
                ×
              </button>
            )}
            {/* Il "+ Set" sta sulla stessa riga del primo set. */}
            {i === 0 && (
              <button type="button" className="btn btn-secondario set-piu" onClick={aggiungiSet}>
                + Set
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-secondario" onClick={onSalva} disabled={inSalvataggio}>
        Salva
      </button>
    </div>
  )
}
