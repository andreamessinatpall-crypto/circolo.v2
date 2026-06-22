import { supabase } from '@/lib/supabase'
import { ricalcolaPuntiTorneo } from '@/features/tornei/punti'
import { assegnaPuntiPresenza } from '@/features/prenotazioni/puntiPresenze'
import type { DatiTornei } from '@/features/tornei/datiTornei'
import type { MiaPrenotazione } from '@/features/prenotazioni/datiAmichevoli'
import type { Sport } from '@/features/prenotazioni/tipi'
import type { ValoriPunti } from './datiPunti'

// (Fase 8d · blocco 2) Rigenera i PUNTI di tutti i soci ricostruendoli dagli
// eventi reali con i valori ATTUALI. In v2 ogni evento registra punti e crediti
// insieme, quindi:
//  - tornei  → solo punti (i movimenti dei tornei hanno 0 crediti);
//  - presenze→ punti + crediti (i crediti solo a modalità premi accesa).
// Tutto idempotente: ogni assegnazione azzera prima la propria chiave, perciò
// rieseguire non raddoppia nulla. I valori manuali (aggiustamenti) restano.

export interface EsitoRigenera {
  tornei: number
  presenze: number
}

export async function rigeneraTuttiIPunti(
  dati: DatiTornei,
  valori: ValoriPunti,
  modalitaPremi: boolean,
  sportDiCampo: (campoId: number | string) => Sport | null,
): Promise<EsitoRigenera> {
  // 1) Tornei: ricalcolo completo (iscrizioni, partite, vittorie di girone).
  let tornei = 0
  for (const t of dati.tornei) {
    const squadreT = dati.perTorneoSquadre[String(t.id)] ?? []
    const incontriT = dati.perTorneoIncontri[String(t.id)] ?? []
    await ricalcolaPuntiTorneo(t, squadreT, incontriT, dati.perSquadraComp)
    tornei++
  }

  // 2) Presenze confermate ad amichevoli/allenamenti (no tornei, solo soci reali).
  const { data: parts, error } = await supabase
    .from('partecipanti_amichevole')
    .select('prenotazione_id, socio_id, confermato')
    .eq('confermato', true)
    .not('socio_id', 'is', null)
  if (error) throw error
  const righe = (parts ?? []) as { prenotazione_id: number | string; socio_id: string }[]

  let presenze = 0
  if (righe.length) {
    const prenIds = [...new Set(righe.map((r) => String(r.prenotazione_id)))]
    const { data: prens } = await supabase.from('prenotazioni').select('*').in('id', prenIds)
    const prenById = new Map<string, MiaPrenotazione>()
    for (const p of (prens ?? []) as MiaPrenotazione[]) prenById.set(String(p.id), p)

    for (const r of righe) {
      const pren = prenById.get(String(r.prenotazione_id))
      if (!pren || pren.incontro_id) continue // torneo: gestito sopra
      const sport = sportDiCampo(pren.campo_id)
      if (!sport) continue
      await assegnaPuntiPresenza(pren, r.socio_id, sport, valori, modalitaPremi)
      presenze++
    }
  }

  return { tornei, presenze }
}
