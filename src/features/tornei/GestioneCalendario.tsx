import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { generaTurni, incontroDisputato, SCRIPT_INCONTRI } from './calendario'
import { gironeSquadra, mancaColonnaGironi, nomeGirone, numGironi, SCRIPT_GIRONI, unitaTorneo } from './gironi'
import { azzeraChiave } from '@/lib/punti'
import { ricalcolaPuntiTorneo } from './punti'
import type { Componente, Incontro, SetPunteggio, Squadra, Torneo } from './tipi'

// Chiave che identifica una coppia di squadre, indipendente da chi gioca in casa.
function chiaveCoppia(a: number | string, b: number | string) {
  return [String(a), String(b)].sort().join('|')
}
// Inverte casa/ospite nei set del padel (quando il vecchio risultato era ribaltato).
function ribaltaSet(sp: SetPunteggio[] | null | undefined): SetPunteggio[] | null {
  return sp ? sp.map((s) => ({ casa: s.ospite, ospite: s.casa })) : null
}

// (Fase 6d) Pannello staff: genera (o rigenera) il calendario all'italiana.
// Per ogni girone "pieno" (≥2 squadre) crea gli incontri di andata col metodo
// del girone.
// (Fase 7c) Rigenerando, l'organizzatore sceglie se MANTENERE i risultati delle
// partite già giocate (riassociandoli alle stesse sfide) o azzerarli tutti.
export default function GestioneCalendario({
  torneo,
  squadre,
  incontri,
  compBySquadra,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  compBySquadra: Record<string, Componente[]>
}) {
  const qc = useQueryClient()
  const esistono = incontri.length > 0
  const n = numGironi(torneo)
  // Modale di scelta mantieni/azzera (solo in rigenerazione).
  const [chiediScelta, setChiediScelta] = useState(false)
  const giocate = incontri.filter(incontroDisputato).length

  const genera = useMutation({
    mutationFn: async (mantieni: boolean) => {
      // Raggruppo le squadre per girone (in girone unico: tutte nel Girone 1).
      const perGirone: Record<number, (number | string)[]> = {}
      for (const s of squadre) {
        const g = gironeSquadra(torneo, s)
        if (!g) continue // non assegnata: esclusa
        ;(perGirone[g] ??= []).push(s.id)
      }
      const gironiPieni = Object.keys(perGirone)
        .map(Number)
        .filter((g) => perGirone[g].length >= 2)
        .sort((a, b) => a - b)

      // I risultati già giocati, indicizzati per coppia di squadre (se mantieni).
      const perCoppia = new Map<string, Incontro>()
      if (mantieni) {
        for (const o of incontri) {
          if (incontroDisputato(o)) perCoppia.set(chiaveCoppia(o.casa_id, o.ospite_id), o)
        }
      }

      // Rigenerando: azzero i punti delle vecchie partite e cancello gli incontri.
      if (esistono) {
        for (const o of incontri) await azzeraChiave(`partita:${o.id}`)
        const { error: errDel } = await supabase.from('incontri').delete().eq('torneo_id', torneo.id)
        if (errDel) throw errDel
      }

      // Costruisco le righe: per ogni girone, ogni turno è una "giornata" (round).
      const andataRitorno = !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno
      const righe: Partial<Incontro>[] = []
      for (const g of gironiPieni) {
        const turni = generaTurni(perGirone[g])
        const numAndata = turni.length
        turni.forEach((round, idx) =>
          round.forEach(([casa, ospite]) => {
            const riga: Partial<Incontro> = {
              torneo_id: torneo.id,
              round: idx + 1,
              casa_id: casa,
              ospite_id: ospite,
              girone: g,
            }
            // Riporto il risultato della stessa sfida, se va mantenuto.
            const vecchio = mantieni ? perCoppia.get(chiaveCoppia(casa, ospite)) : undefined
            if (vecchio) {
              const stessoVerso = String(vecchio.casa_id) === String(casa)
              riga.punti_casa = stessoVerso ? vecchio.punti_casa : vecchio.punti_ospite
              riga.punti_ospite = stessoVerso ? vecchio.punti_ospite : vecchio.punti_casa
              if (vecchio.set_punteggi !== undefined)
                riga.set_punteggi = stessoVerso
                  ? vecchio.set_punteggi
                  : ribaltaSet(vecchio.set_punteggi)
              if (vecchio.data_disputata !== undefined) riga.data_disputata = vecchio.data_disputata
            }
            righe.push(riga)
            // In andata e ritorno aggiungo subito il ritorno (home/away invertiti).
            if (andataRitorno) {
              const rigaR: Partial<Incontro> = {
                torneo_id: torneo.id,
                round: numAndata + idx + 1,
                casa_id: ospite,
                ospite_id: casa,
                girone: g,
              }
              // Mantieni anche il risultato del ritorno (chiave con teams swappati).
              const vecchioR = mantieni ? perCoppia.get(chiaveCoppia(ospite, casa)) : undefined
              if (vecchioR) {
                const stessoVerso = String(vecchioR.casa_id) === String(ospite)
                rigaR.punti_casa = stessoVerso ? vecchioR.punti_casa : vecchioR.punti_ospite
                rigaR.punti_ospite = stessoVerso ? vecchioR.punti_ospite : vecchioR.punti_casa
                if (vecchioR.set_punteggi !== undefined)
                  rigaR.set_punteggi = stessoVerso
                    ? vecchioR.set_punteggi
                    : ribaltaSet(vecchioR.set_punteggi)
                if (vecchioR.data_disputata !== undefined) rigaR.data_disputata = vecchioR.data_disputata
              }
              righe.push(rigaR)
            }
          }),
        )
      }
      const { data: nuovi, error } = await supabase.from('incontri').insert(righe).select()
      if (error) throw error

      // Riassegno i punti sui nuovi incontri (partite mantenute + vittorie di girone).
      await ricalcolaPuntiTorneo(torneo, squadre, (nuovi ?? []) as Incontro[], compBySquadra)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei'] }),
    onError: (e: unknown) =>
      window.alert(
        mancaTabella(e, 'incontri')
          ? SCRIPT_INCONTRI
          : mancaColonnaGironi(e)
            ? SCRIPT_GIRONI
            : 'Generazione non riuscita: ' + messaggioErrore(e),
      ),
  })

  function avviaGenerazione() {
    // Controllo che almeno un girone abbia 2+ squadre.
    const perGirone: Record<number, number> = {}
    for (const s of squadre) {
      const g = gironeSquadra(torneo, s)
      if (g) perGirone[g] = (perGirone[g] ?? 0) + 1
    }
    const gironiPieni = Object.values(perGirone).filter((c) => c >= 2).length
    if (!gironiPieni) {
      window.alert(
        n > 1
          ? 'Ogni girone deve avere almeno 2 ' +
              unitaTorneo(torneo.sport, true) +
              '. Assegna le ' +
              unitaTorneo(torneo.sport, true) +
              ' ai gironi (a mano o con il sorteggio).'
          : 'Servono almeno 2 ' + unitaTorneo(torneo.sport, true) + '.',
      )
      return
    }

    // Con più gironi, avviso se qualche squadra resta fuori o un girone è piccolo.
    if (n > 1) {
      const assegnate = Object.values(perGirone).reduce((a, c) => a + c, 0)
      const nonAssegnate = squadre.length - assegnate
      const gironiSaltati: string[] = []
      for (let g = 1; g <= n; g++) {
        if (!perGirone[g] || perGirone[g] < 2) gironiSaltati.push(nomeGirone(torneo, g))
      }
      let avviso = ''
      if (nonAssegnate > 0)
        avviso += nonAssegnate + ' ' + unitaTorneo(torneo.sport, true) + ' non assegnate verranno escluse.\n'
      if (gironiSaltati.length)
        avviso +=
          'Gironi con meno di 2 ' +
          unitaTorneo(torneo.sport, true) +
          ' (saltati): ' +
          gironiSaltati.join(', ') +
          '.\n'
      if (avviso && !window.confirm(avviso + '\nProcedo con la generazione del calendario?')) return
    }

    // Primo calendario: nessun risultato da salvare, genero subito.
    if (!esistono) {
      genera.mutate(false)
      return
    }
    // Rigenerazione: se ci sono risultati chiedo cosa farne, altrimenti procedo.
    if (giocate > 0) setChiediScelta(true)
    else genera.mutate(false)
  }

  return (
    <div className="aggiungi-part" style={{ marginBottom: 4 }}>
      <button type="button" className="btn" onClick={avviaGenerazione} disabled={genera.isPending}>
        {genera.isPending ? 'Generazione…' : esistono ? '🔄 Rigenera calendario' : '📅 Genera calendario'}
      </button>
      <span className="sub" style={{ alignSelf: 'center' }}>
        {esistono
          ? 'Il calendario è già stato generato.'
          : 'Crea gli incontri all’italiana (tutte contro tutte) di ogni girone.'}
      </span>

      {chiediScelta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setChiediScelta(false)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="m-0 text-xl">Rigenera calendario</h2>
            <p className="sub mt-2">
              Ci sono <strong>{giocate}</strong>{' '}
              {giocate === 1 ? 'partita già giocata' : 'partite già giocate'}. Cosa vuoi fare dei
              risultati? Gli incontri vengono comunque ricreati; i risultati mantenuti vengono
              riassociati alle stesse sfide.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setChiediScelta(false)
                  genera.mutate(true)
                }}
              >
                Mantieni i risultati già inseriti
              </button>
              <button
                type="button"
                className="btn btn-pericolo"
                onClick={() => {
                  if (!window.confirm('Azzerare TUTTI i risultati già inseriti?')) return
                  setChiediScelta(false)
                  genera.mutate(false)
                }}
              >
                Azzera tutti i risultati
              </button>
              <button
                type="button"
                className="btn btn-secondario"
                onClick={() => setChiediScelta(false)}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
