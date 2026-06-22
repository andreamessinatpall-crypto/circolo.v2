import { supabase } from '@/lib/supabase'
import { ricalcolaPuntiTorneo } from '@/features/tornei/punti'
import { assegnaPuntiPresenza } from '@/features/prenotazioni/puntiPresenze'
import type { DatiTornei } from '@/features/tornei/datiTornei'
import type { MiaPrenotazione } from '@/features/prenotazioni/datiAmichevoli'
import type { Sport } from '@/features/prenotazioni/tipi'
import type { ValoriPunti } from './datiPunti'
import type { Intervallo } from './datiIntervalli'

// (Fase 8d) Rigenerazione dei saldi ricostruendoli dagli eventi reali con i
// valori ATTUALI. Idempotente: ogni assegnazione azzera prima la propria chiave,
// quindi rieseguire non raddoppia nulla; i valori inseriti a mano restano.
//
// In v2 ogni movimento porta punti e crediti insieme, quindi distinguiamo per
// SCOPO: "Rigenera punti" ricostruisce tutto (tornei + presenze); "Rigenera
// crediti" ricostruisce le presenze applicando intervalli e modalità premi.

export interface EsitoRigenera {
  tornei: number
  presenze: number
}

// Ricostruisce le presenze confermate ad amichevoli/allenamenti (no tornei, solo
// soci reali). Ritorna quante ne ha toccate.
async function rigeneraPresenze(
  valori: ValoriPunti,
  modalitaPremi: boolean,
  sportDiCampo: (campoId: number | string) => Sport | null,
  intervalli: Intervallo[],
): Promise<number> {
  const { data: parts, error } = await supabase
    .from('partecipanti_amichevole')
    .select('prenotazione_id, socio_id, confermato')
    .eq('confermato', true)
    .not('socio_id', 'is', null)
  if (error) throw error
  const righe = (parts ?? []) as { prenotazione_id: number | string; socio_id: string }[]
  if (!righe.length) return 0

  const prenIds = [...new Set(righe.map((r) => String(r.prenotazione_id)))]
  const { data: prens } = await supabase.from('prenotazioni').select('*').in('id', prenIds)
  const prenById = new Map<string, MiaPrenotazione>()
  for (const p of (prens ?? []) as MiaPrenotazione[]) prenById.set(String(p.id), p)

  let n = 0
  for (const r of righe) {
    const pren = prenById.get(String(r.prenotazione_id))
    if (!pren || pren.incontro_id) continue // torneo: gestito altrove
    const sport = sportDiCampo(pren.campo_id)
    if (!sport) continue
    await assegnaPuntiPresenza(pren, r.socio_id, sport, valori, modalitaPremi, intervalli)
    n++
  }
  return n
}

// "Rigenera punti": tornei (solo punti) + presenze.
export async function rigeneraPunti(
  dati: DatiTornei,
  valori: ValoriPunti,
  modalitaPremi: boolean,
  sportDiCampo: (campoId: number | string) => Sport | null,
  intervalli: Intervallo[] = [],
): Promise<EsitoRigenera> {
  let tornei = 0
  for (const t of dati.tornei) {
    const squadreT = dati.perTorneoSquadre[String(t.id)] ?? []
    const incontriT = dati.perTorneoIncontri[String(t.id)] ?? []
    await ricalcolaPuntiTorneo(t, squadreT, incontriT, dati.perSquadraComp)
    tornei++
  }
  const presenze = await rigeneraPresenze(valori, modalitaPremi, sportDiCampo, intervalli)
  return { tornei, presenze }
}

// "Rigenera crediti": solo presenze (i tornei non danno crediti), applicando
// intervalli e modalità premi.
export async function rigeneraCrediti(
  valori: ValoriPunti,
  modalitaPremi: boolean,
  sportDiCampo: (campoId: number | string) => Sport | null,
  intervalli: Intervallo[] = [],
): Promise<{ presenze: number }> {
  const presenze = await rigeneraPresenze(valori, modalitaPremi, sportDiCampo, intervalli)
  return { presenze }
}
