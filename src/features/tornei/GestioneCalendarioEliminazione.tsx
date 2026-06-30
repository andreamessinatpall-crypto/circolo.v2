import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { classiInput } from '@/components/stili'
import { azzeraChiave } from '@/lib/punti'
import {
  generaBracketSeed,
  incontriDaSeed,
  numDbRoundsAR,
  nomeRoundDb,
  numTurniEliminazione,
  prossimaPotenzaDi2,
  turnoCompletoEliminazione,
  turnoCorrenteEliminazione,
} from './eliminazione'
import { unitaTorneo } from './gironi'
import type { Incontro, Squadra, Torneo } from './tipi'

export default function GestioneCalendarioEliminazione({
  torneo,
  squadre,
  incontri,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
}) {
  const qc = useQueryClient()
  const N = squadre.length
  const totBracketRound = N >= 2 ? numTurniEliminazione(N) : 0
  const bracketSize = N >= 2 ? prossimaPotenzaDi2(N) : 0
  const numSlots = bracketSize / 2
  const numBye = bracketSize - N
  const ar = !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno
  const finaleSecca = !!(torneo as { finale_secca?: boolean | null }).finale_secca
  const hasTerzoPosto = !!(torneo as { terzo_posto?: boolean | null }).terzo_posto
  const totDbRounds = ar ? numDbRoundsAR(totBracketRound, finaleSecca) : totBracketRound
  const bracketIncontri = incontri.filter((m) => Number(m.girone || 0) !== 0)
  const turnoAtt = turnoCorrenteEliminazione(bracketIncontri)
  const haIncontri = incontri.length > 0
  const tuttiFiniti = (() => {
    if (!turnoAtt) return false
    const finaleCompleto = turnoCompletoEliminazione(bracketIncontri, totDbRounds)
    if (!finaleCompleto) return false
    if (hasTerzoPosto) {
      const terzoPosMatch = incontri.find((m) => Number(m.girone) === 0)
      return !!terzoPosMatch && turnoCompletoEliminazione(incontri, terzoPosMatch.round)
    }
    return true
  })()

  // ── Editor distribuzione manuale ──────────────────────────────────────────
  // seedManuale: array di bracketSize elementi: id squadra (string) | 'bye' | '' (non assegnato)
  const [modalitaManuale, setModalitaManuale] = useState(false)
  const [seedManuale, setSeedManuale] = useState<string[]>(() => Array(bracketSize).fill(''))
  const [erroreManuale, setErroreManuale] = useState<string | null>(null)

  function apriManuale() {
    const randomSeed = generaBracketSeed(squadre.map((s) => s.id))
    setSeedManuale(randomSeed.map((v) => (v === null ? 'bye' : String(v))))
    setErroreManuale(null)
    setModalitaManuale(true)
  }

  function rimescola() {
    const randomSeed = generaBracketSeed(squadre.map((s) => s.id))
    setSeedManuale(randomSeed.map((v) => (v === null ? 'bye' : String(v))))
    setErroreManuale(null)
  }

  function setSeedPos(idx: number, val: string) {
    setSeedManuale((prev) => {
      const next = [...prev]
      next[idx] = val
      return next
    })
    setErroreManuale(null)
  }

  function validaSeed(): string | null {
    if (seedManuale.some((v) => v === '')) return 'Assegna tutte le posizioni del tabellone.'
    for (let i = 0; i < bracketSize; i += 2) {
      if (seedManuale[i] === 'bye' && seedManuale[i + 1] === 'bye')
        return `Lo slot ${i / 2 + 1} non può avere due BYE.`
    }
    const byes = seedManuale.filter((v) => v === 'bye').length
    if (byes !== numBye)
      return `Posiziona esattamente ${numBye} BYE (al momento: ${byes}).`
    const teams = seedManuale.filter((v) => v !== 'bye')
    if (new Set(teams).size !== N)
      return 'Ogni squadra deve apparire esattamente una volta.'
    return null
  }

  function handleConferma() {
    const err = validaSeed()
    if (err) { setErroreManuale(err); return }
    generaManualeMut.mutate()
  }

  const generaManualeMut = useMutation({
    mutationFn: async () => {
      const newSeed: (number | string | null)[] = seedManuale.map((v) => {
        if (v === 'bye') return null
        const n = Number(v)
        return Number.isNaN(n) ? v : n
      })
      const { error: errSeed } = await supabase
        .from('tornei')
        .update({ bracket_seed: newSeed })
        .eq('id', torneo.id)
      if (errSeed) throw errSeed
      const righe = incontriDaSeed(newSeed).map((m) => ({
        torneo_id: torneo.id,
        round: 1,
        casa_id: m.casa,
        ospite_id: m.ospite,
        girone: m.slot,
      }))
      const { error } = await supabase.from('incontri').insert(righe)
      if (error) throw error
    },
    onSuccess: () => {
      setModalitaManuale(false)
      qc.invalidateQueries({ queryKey: ['tornei'] })
    },
    onError: (e: unknown) => window.alert('Generazione non riuscita: ' + messaggioErrore(e)),
  })

  // ── Sorteggio casuale ─────────────────────────────────────────────────────
  const generaPrimo = useMutation({
    mutationFn: async () => {
      if (N < 2) throw new Error('Servono almeno 2 ' + unitaTorneo(torneo.sport, true))
      const newSeed = generaBracketSeed(squadre.map((s) => s.id))
      const { error: errSeed } = await supabase
        .from('tornei')
        .update({ bracket_seed: newSeed })
        .eq('id', torneo.id)
      if (errSeed) throw errSeed
      const righe = incontriDaSeed(newSeed).map((m) => ({
        torneo_id: torneo.id,
        round: 1,
        casa_id: m.casa,
        ospite_id: m.ospite,
        girone: m.slot,
      }))
      const { error } = await supabase.from('incontri').insert(righe)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei'] }),
    onError: (e: unknown) =>
      window.alert(
        mancaTabella(e, 'incontri')
          ? 'Esegui lo script tappa3b2-girone.sql su Supabase.'
          : 'Generazione non riuscita: ' + messaggioErrore(e),
      ),
  })

  const azzera = useMutation({
    mutationFn: async () => {
      if (!window.confirm('Azzerare tutto il tabellone? I risultati inseriti verranno persi.')) return
      for (const m of incontri) await azzeraChiave(`partita:${m.id}`)
      await azzeraChiave(`torneo:${torneo.id}:vittoria:1`)
      await supabase.from('incontri').delete().eq('torneo_id', torneo.id)
      await supabase.from('tornei').update({ bracket_seed: null }).eq('id', torneo.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei'] }),
    onError: (e: unknown) => window.alert('Errore: ' + messaggioErrore(e)),
  })

  if (N < 2) {
    return (
      <p className="sub">
        Aggiungi almeno 2 {unitaTorneo(torneo.sport, true)} per generare il tabellone.
      </p>
    )
  }

  // ── Editor distribuzione manuale ──────────────────────────────────────────
  if (modalitaManuale) {
    return (
      <div>
        <p className="eyebrow" style={{ marginBottom: 4 }}>Distribuzione manuale — 1° turno</p>
        <p className="sub" style={{ marginBottom: 12 }}>
          Assegna ogni {unitaTorneo(torneo.sport, false)} a uno slot del primo turno.
          {numBye > 0 && (
            <> Inserisci <strong>{numBye} BYE</strong> (le squadre con BYE avanzano automaticamente).</>
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: numSlots }, (_, i) => {
            const idxCasa = i * 2
            const idxOspite = i * 2 + 1
            const valCasa = seedManuale[idxCasa] ?? ''
            const valOspite = seedManuale[idxOspite] ?? ''
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-2)', minWidth: 44, textAlign: 'right' }}>
                  Slot {i + 1}
                </span>
                <select
                  value={valCasa}
                  onChange={(e) => setSeedPos(idxCasa, e.target.value)}
                  className={classiInput}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <option value="">— scegli —</option>
                  {squadre.map((s) => {
                    const id = String(s.id)
                    const usata = seedManuale.some((v, j) => j !== idxCasa && v === id)
                    return (
                      <option key={id} value={id} disabled={usata}>
                        {s.nome}
                      </option>
                    )
                  })}
                  {numBye > 0 && <option value="bye">— BYE —</option>}
                </select>
                <span style={{ color: 'var(--ink-2)', fontSize: '0.82rem', flexShrink: 0 }}>vs</span>
                <select
                  value={valOspite}
                  onChange={(e) => setSeedPos(idxOspite, e.target.value)}
                  className={classiInput}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <option value="">— scegli —</option>
                  {squadre.map((s) => {
                    const id = String(s.id)
                    const usata = seedManuale.some((v, j) => j !== idxOspite && v === id)
                    return (
                      <option key={id} value={id} disabled={usata}>
                        {s.nome}
                      </option>
                    )
                  })}
                  {numBye > 0 && <option value="bye">— BYE —</option>}
                </select>
              </div>
            )
          })}
        </div>

        {erroreManuale && (
          <p style={{ color: 'var(--errore)', fontSize: '0.85rem', marginTop: 8 }}>
            {erroreManuale}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn"
            onClick={handleConferma}
            disabled={generaManualeMut.isPending}
          >
            {generaManualeMut.isPending ? 'Generazione…' : '🏆 Conferma tabellone'}
          </button>
          <button
            type="button"
            className="btn btn-secondario"
            onClick={rimescola}
            disabled={generaManualeMut.isPending}
          >
            🎲 Rimescola
          </button>
          <button
            type="button"
            className="btn btn-secondario"
            onClick={() => { setModalitaManuale(false); setErroreManuale(null) }}
            disabled={generaManualeMut.isPending}
          >
            Annulla
          </button>
        </div>
      </div>
    )
  }

  // ── Vista normale ─────────────────────────────────────────────────────────
  return (
    <div className="aggiungi-part" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
      {!haIncontri ? (
        <>
          <button
            type="button"
            className="btn"
            onClick={() => generaPrimo.mutate()}
            disabled={generaPrimo.isPending}
          >
            {generaPrimo.isPending ? 'Generazione…' : '🎲 Sorteggio casuale'}
          </button>
          <button
            type="button"
            className="btn btn-secondario"
            onClick={apriManuale}
            disabled={generaPrimo.isPending}
          >
            ✏️ Distribuzione manuale
          </button>
          <span className="sub" style={{ alignSelf: 'center', width: '100%' }}>
            Sorteggio tra {N} {unitaTorneo(torneo.sport, true)} —{' '}
            {totBracketRound} {totBracketRound === 1 ? 'turno' : 'turni'}
            {ar ? ' andata e ritorno' : ''} in totale.
          </span>
        </>
      ) : tuttiFiniti ? (
        <>
          <span className="sub" style={{ alignSelf: 'center' }}>
            ✅ Tabellone completato.
          </span>
          <button
            type="button"
            className="btn btn-pericolo"
            style={{ marginTop: 0 }}
            onClick={() => azzera.mutate()}
            disabled={azzera.isPending}
          >
            {azzera.isPending ? 'Azzeramento…' : 'Azzera tabellone'}
          </button>
        </>
      ) : (
        <>
          <span className="sub" style={{ alignSelf: 'center' }}>
            {turnoAtt > 0
              ? nomeRoundDb(turnoAtt, totBracketRound, ar, finaleSecca, totDbRounds) + ' in corso.'
              : 'Tabellone generato.'}
          </span>
          <button
            type="button"
            className="btn btn-pericolo"
            style={{ marginTop: 0, marginLeft: 'auto' }}
            onClick={() => azzera.mutate()}
            disabled={azzera.isPending}
          >
            Azzera tutto
          </button>
        </>
      )}
    </div>
  )
}
