// Gestione dei round e dei risultati di un torneo Americano.
// Genera i turni (round-robin con rotazione partner), mostra le partite
// per round con editor punteggi e mantiene la classifica aggiornata.

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { americanoDisputata, formatNomeAmericano, generaRoundsAmericano, perRoundAmericano } from './americano'
import type { AmericanoPartita, Squadra, Torneo } from './tipi'

export default function GestioneAmericano({
  torneo,
  giocatori,
  partite,
  gestore,
  puoModificare,
  soloControlli = false,
}: {
  torneo: Torneo
  giocatori: Squadra[]
  partite: AmericanoPartita[]
  gestore: boolean
  puoModificare?: boolean
  soloControlli?: boolean
}) {
  const qc = useQueryClient()
  const [roundSel, setRoundSel] = useState<number | null>(null)

  const esistono = partite.length > 0
  const rounds = perRoundAmericano(partite)
  const giocate = partite.filter(americanoDisputata).length

  const nomi: Record<string, string> = {}
  for (const g of giocatori) nomi[String(g.id)] = g.nome

  const genera = useMutation({
    mutationFn: async () => {
      const nValido = Math.floor(giocatori.length / 4) * 4
      if (nValido < 4) throw new Error('Servono almeno 4 giocatori (multiplo di 4).')

      // Cancella i turni precedenti
      if (esistono) {
        const { error: errDel } = await supabase
          .from('americano_partite')
          .delete()
          .eq('torneo_id', torneo.id)
        if (errDel) throw errDel
      }

      const ar = !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno
      const schedule = generaRoundsAmericano(giocatori.map((g) => g.id), ar)
      const righe = schedule.flat().map((c) => ({
        torneo_id: torneo.id,
        round: c.round,
        campo: c.campo,
        p1_id: c.p1,
        p2_id: c.p2,
        p3_id: c.p3,
        p4_id: c.p4,
      }))

      const { error } = await supabase.from('americano_partite').insert(righe)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tornei'] })
      setRoundSel(null)
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : messaggioErrore(e)
      const mancaTabella =
        typeof e === 'object' && e !== null &&
        ('code' in e) && (e as { code?: string }).code === '42P01'
      window.alert(
        mancaTabella
          ? 'Tabella non trovata: esegui lo script tappa25-americano.sql su Supabase.'
          : 'Generazione non riuscita: ' + msg,
      )
    },
  })

  function avviaGenerazione() {
    const nValido = Math.floor(giocatori.length / 4) * 4
    if (nValido < 4) {
      window.alert('Servono almeno 4 giocatori (multiplo di 4) per generare i turni.')
      return
    }
    if (giocatori.length % 4 !== 0) {
      const esclusi = giocatori.length - nValido
      if (!window.confirm(
        `${giocatori.length} giocatori: ${esclusi} ${esclusi === 1 ? 'verrà escluso' : 'verranno esclusi'} ` +
        `(solo multipli di 4 partecipano all'Americano).\n\nProcedo con ${nValido} giocatori?`
      )) return
    }
    if (esistono && giocate > 0) {
      if (!window.confirm(
        `Ci sono ${giocate} ${giocate === 1 ? 'partita già inserita' : 'partite già inserite'}. ` +
        `Rigenerare azzera tutti i risultati.\n\nProcedere?`
      )) return
    }
    genera.mutate()
  }

  // Filtra round da mostrare
  const roundsVisibili = roundSel != null ? rounds.filter((r) => r.round === roundSel) : rounds

  return (
    <div>
      {gestore && (
        <div className="aggiungi-part mb-4" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-bianco btn-sm"
            onClick={avviaGenerazione}
            disabled={genera.isPending}
          >
            {genera.isPending
              ? 'Generazione…'
              : esistono
                ? '🔄 Rigenera turni'
                : '📅 Genera turni'}
          </button>
          <span className="sub" style={{ alignSelf: 'center' }}>
            {esistono
              ? `${rounds.length} round · ${partite.length} partite`
              : ((torneo as { andata_ritorno?: boolean | null }).andata_ritorno
                  ? 'Genera il calendario andata e ritorno con rotazione automatica delle coppie.'
                  : 'Crea il calendario dei round con rotazione automatica delle coppie.')}
          </span>
        </div>
      )}

      {!esistono && !soloControlli && (
        <p className="part-vuoto">
          {gestore
            ? 'Turni non ancora generati. Aggiungi i giocatori e premi "Genera turni".'
            : 'Calendario non ancora disponibile.'}
        </p>
      )}

      {esistono && !soloControlli && (
        <>
          {rounds.length > 1 && (
            <div className="round-filtri mb-3">
              <button
                type="button"
                className={`round-chip${roundSel === null ? ' attivo' : ''}`}
                onClick={() => setRoundSel(null)}
              >
                Tutti
              </button>
              {(() => {
                const ar = !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno
                const numAndata = ar ? Math.floor(rounds.length / 2) : rounds.length
                return rounds.map(({ round }) => {
                  const label = ar
                    ? (round <= numAndata ? `Round ${round} · A` : `Round ${round - numAndata} · R`)
                    : `Round ${round}`
                  return (
                    <button
                      key={round}
                      type="button"
                      className={`round-chip${roundSel === round ? ' attivo' : ''}`}
                      onClick={() => setRoundSel(roundSel === round ? null : round)}
                    >
                      {label}
                    </button>
                  )
                })
              })()}
            </div>
          )}

          {roundsVisibili.map(({ round, partite: pp }) => {
            const giocateR = pp.filter(americanoDisputata).length
            return (
              <div key={round}>
                <div className="giornata-band">
                  <span className="g-num">{round}</span>
                  <div className="g-lab"><b>Round</b></div>
                  <span className="g-stato">
                    {giocateR === pp.length
                      ? 'Completato'
                      : `${giocateR}/${pp.length} ${pp.length === 1 ? 'giocata' : 'giocate'}`}
                  </span>
                </div>
                {pp.map((m) => (
                  <RigaPartitaAmericano
                    key={m.id}
                    m={m}
                    nomi={nomi}
                    gestore={puoModificare ?? gestore}
                  />
                ))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function RigaPartitaAmericano({
  m,
  nomi,
  gestore,
}: {
  m: AmericanoPartita
  nomi: Record<string, string>
  gestore: boolean
}) {
  const qc = useQueryClient()
  const disputata = americanoDisputata(m)

  const salva = useMutation({
    mutationFn: async (patch: { punti_casa: number | null; punti_ospite: number | null }) => {
      const { error } = await supabase
        .from('americano_partite')
        .update(patch)
        .eq('id', m.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei'] }),
    onError: (e: unknown) => window.alert('Salvataggio non riuscito: ' + messaggioErrore(e)),
  })

  const n = (id: number | string) => formatNomeAmericano(nomi[String(id)] ?? '?')

  return (
    <div className={'match' + (disputata ? ' giocata' : '')}>
      <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)', marginBottom: 2, paddingLeft: 4 }}>
        Campo {m.campo}
      </div>
      <div className="match-row">
        <div className="match-side">
          <span>{n(m.p1_id)} · {n(m.p2_id)}</span>
        </div>
        <div className="match-ris">
          {disputata ? (
            <>{m.punti_casa}–{m.punti_ospite}</>
          ) : (
            <span className="vs">vs</span>
          )}
        </div>
        <div className="match-side">
          <span>{n(m.p3_id)} · {n(m.p4_id)}</span>
        </div>
      </div>

      {gestore && (
        <EditorAmericano m={m} salva={salva.mutate} inSalvataggio={salva.isPending} />
      )}
    </div>
  )
}

function EditorAmericano({
  m,
  salva,
  inSalvataggio,
}: {
  m: AmericanoPartita
  salva: (patch: { punti_casa: number | null; punti_ospite: number | null }) => void
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
        placeholder="0"
      />
      <span>–</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={ospite}
        onChange={(e) => setOspite(e.target.value)}
        placeholder="0"
      />
      <button
        type="button"
        className="btn btn-secondario"
        onClick={onSalva}
        disabled={inSalvataggio}
      >
        Salva
      </button>
    </div>
  )
}
