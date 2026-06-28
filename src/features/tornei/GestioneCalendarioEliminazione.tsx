import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { azzeraChiave } from '@/lib/punti'
import {
  generaBracketSeed,
  incontriDaSeed,
  numDbRoundsAR,
  nomeRoundDb,
  numTurniEliminazione,
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
  const ar = !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno
  const finaleSecca = !!(torneo as { finale_secca?: boolean | null }).finale_secca
  const hasTerzoPosto = !!(torneo as { terzo_posto?: boolean | null }).terzo_posto
  const totDbRounds = ar ? numDbRoundsAR(totBracketRound, finaleSecca) : totBracketRound
  // Escludi il terzo posto (girone=0) dal calcolo del turno corrente del bracket.
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
            {generaPrimo.isPending ? 'Generazione…' : '🏆 Genera tabellone'}
          </button>
          <span className="sub" style={{ alignSelf: 'center' }}>
            Sorteggio casuale tra {N} {unitaTorneo(torneo.sport, true)} —{' '}
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
