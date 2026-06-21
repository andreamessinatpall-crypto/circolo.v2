import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { generaTurni, SCRIPT_INCONTRI } from './calendario'
import { gironeSquadra, mancaColonnaGironi, nomeGirone, numGironi, SCRIPT_GIRONI, unitaTorneo } from './gironi'
import type { Incontro, Squadra, Torneo } from './tipi'

// (Fase 6d) Pannello staff: genera (o rigenera) il calendario all'italiana.
// Per ogni girone "pieno" (≥2 squadre) crea gli incontri di andata col metodo
// del girone. Rigenerare cancella TUTTI gli incontri e i risultati esistenti.
export default function GestioneCalendario({
  torneo,
  squadre,
  incontri,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
}) {
  const qc = useQueryClient()
  const esistono = incontri.length > 0
  const n = numGironi(torneo)

  const genera = useMutation({
    mutationFn: async () => {
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

      // Se sto rigenerando, prima cancello tutti gli incontri esistenti.
      if (esistono) {
        const { error: errDel } = await supabase.from('incontri').delete().eq('torneo_id', torneo.id)
        if (errDel) throw errDel
      }

      // Costruisco le righe: per ogni girone, ogni turno è una "giornata" (round).
      const righe: Partial<Incontro>[] = []
      for (const g of gironiPieni) {
        const turni = generaTurni(perGirone[g])
        turni.forEach((round, idx) =>
          round.forEach(([casa, ospite]) =>
            righe.push({ torneo_id: torneo.id, round: idx + 1, casa_id: casa, ospite_id: ospite, girone: g }),
          ),
        )
      }
      const { error } = await supabase.from('incontri').insert(righe)
      if (error) throw error
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

    if (
      esistono &&
      !window.confirm(
        'Rigenerare il calendario? Verranno CANCELLATI tutti gli incontri e i risultati già inseriti.',
      )
    )
      return

    genera.mutate()
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
    </div>
  )
}
