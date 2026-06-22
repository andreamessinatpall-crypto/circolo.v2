// (Fase 8d) Punti e crediti per le PRESENZE confermate ad amichevoli/allenamenti.
//
// Quando lo staff conferma la presenza di un socio a una partita normale o a un
// allenamento, il socio guadagna i punti dell'azione (e, a modalità premi
// accesa, i crediti). Annullare la conferma li ritoglie. Tutto idempotente
// grazie alla chiave "amich:<prenotazione>:<socio>" (vedi src/lib/punti.ts).
//
// Differenza dalla v1: i CREDITI hanno un valore proprio (non più uguale ai
// punti). Vengono accreditati solo a modalità premi accesa E se la data
// dell'evento ricade in uno degli intervalli crediti (vedi datiIntervalli).
//
// Le partite di torneo (prenotazione con incontro_id) NON passano di qui: i loro
// punti sono gestiti da features/tornei/punti.ts.

import { assegnaMovimento, azzeraChiave, type EsitoPunti } from '@/lib/punti'
import type { ValoriPunti } from '@/features/segreteria/datiPunti'
import { dataInIntervalli, type Intervallo } from '@/features/segreteria/datiIntervalli'
import type { MiaPrenotazione } from './datiAmichevoli'
import type { Sport } from './tipi'

function valorePunti(v: ValoriPunti, sport: Sport, allenamento: boolean): number {
  if (sport === 'padel') return allenamento ? v.allenamentoPadel : v.partitaPadel
  return allenamento ? v.allenamentoCalcio : v.partitaCalcio
}

function valoreCrediti(v: ValoriPunti, sport: Sport, allenamento: boolean): number {
  if (sport === 'padel') return allenamento ? v.creditiAllenamentoPadel : v.creditiPartitaPadel
  return allenamento ? v.creditiAllenamentoCalcio : v.creditiPartitaCalcio
}

function chiavePresenza(prenId: number | string, socioId: string): string {
  return `amich:${prenId}:${socioId}`
}

// Assegna punti (+ eventuali crediti) per una presenza confermata.
// `intervalli` vuoto = nessun limite di date sui crediti (default).
export async function assegnaPuntiPresenza(
  pren: MiaPrenotazione,
  socioId: string,
  sport: Sport,
  valori: ValoriPunti,
  modalitaPremi: boolean,
  intervalli: Intervallo[] = [],
): Promise<EsitoPunti> {
  if (pren.incontro_id) return { ok: true } // partita di torneo: gestita altrove
  const allenamento = !!pren.allenamento
  const punti = valorePunti(valori, sport, allenamento)
  // Crediti solo a modalità premi accesa E se la data dell'evento è in un
  // intervallo (nessun intervallo = nessun limite). I punti non si filtrano mai.
  const dentroIntervallo = dataInIntervalli(pren.inizio, intervalli)
  const crediti = modalitaPremi && dentroIntervallo ? valoreCrediti(valori, sport, allenamento) : 0

  const chiave = chiavePresenza(pren.id, socioId)
  await azzeraChiave(chiave) // evito doppi conteggi
  if (!punti && !crediti) return { ok: true }

  return assegnaMovimento({
    socioId,
    punti,
    crediti,
    motivo: allenamento ? 'Presenza allenamento' : 'Partita giocata',
    chiave,
    dataEvento: pren.inizio,
    sport,
    tipo: allenamento ? 'allenamento' : 'partita',
  })
}

// Toglie i punti/crediti di una presenza (quando si annulla la conferma).
export async function annullaPuntiPresenza(
  prenId: number | string,
  socioId: string,
): Promise<void> {
  await azzeraChiave(chiavePresenza(prenId, socioId))
}
