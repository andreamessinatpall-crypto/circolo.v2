import { generaTurni } from '@/features/tornei/calendario'
import { generaBracketSeed, incontriDaSeed } from '@/features/tornei/eliminazione'
import type { FormatoTorneoAmici } from './tipi'

export interface NuovoIncontroAmici {
  round: number
  girone: number | null
  casa_id: string
  ospite_id: string
}

export interface CalendarioIniziale {
  incontri: NuovoIncontroAmici[]
  bracketSeed: (string | null)[] | null
}

// Genera il calendario iniziale delle partite di un torneo tra amici in base
// al formato scelto alla creazione, riusando la stessa logica pura (testata)
// dei tornei ufficiali del club: girone all'italiana (generaTurni) oppure
// eliminazione diretta a coppie fisse (generaBracketSeed + incontriDaSeed).
// Per l'eliminazione il seed va salvato su tornei_amici.bracket_seed: serve
// per generare i turni successivi mano a mano che si completano.
//
// Andata e ritorno (girone): stesso pattern di GestioneCalendario.tsx per i
// tornei ufficiali — generaTurni si chiama una volta sola, e per ogni
// accoppiamento si aggiunge subito anche il ritorno (casa/ospite invertiti,
// round = numAndata + round andata). Per l'eliminazione, invece, il ritorno
// di ogni turno del tabellone si genera più avanti, mano a mano che i
// risultati arrivano (vedi eliminazioneAmici.ts) — qui si genera solo il
// primo turno (che è sempre "andata" anche in modalità A/R).
export function generaCalendarioIniziale(
  formato: FormatoTorneoAmici,
  squadraIds: string[],
  andataRitorno: boolean,
): CalendarioIniziale {
  if (formato === 'girone') {
    const turni = generaTurni(squadraIds)
    const numAndata = turni.length
    const incontri: NuovoIncontroAmici[] = []
    turni.forEach((round, i) => {
      for (const [casa, ospite] of round) {
        incontri.push({ round: i + 1, girone: null, casa_id: casa, ospite_id: ospite })
        if (andataRitorno) {
          incontri.push({ round: numAndata + i + 1, girone: null, casa_id: ospite, ospite_id: casa })
        }
      }
    })
    return { incontri, bracketSeed: null }
  }

  const seed = generaBracketSeed(squadraIds) as (string | null)[]
  const incontri: NuovoIncontroAmici[] = incontriDaSeed(seed).map((m) => ({
    round: 1,
    girone: m.slot,
    casa_id: m.casa as string,
    ospite_id: m.ospite as string,
  }))
  return { incontri, bracketSeed: seed }
}
