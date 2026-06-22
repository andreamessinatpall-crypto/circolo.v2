// (Fase 7b) Punti dei tornei: accredito reale sul saldo dei soci.
//
// Sono i tre eventi che danno punti, secondo le regole del torneo:
//  - iscrizione  → punti iscrizione, quando un socio entra in una squadra
//  - partita     → punti partita vinta ai membri della squadra che vince
//  - vittoria    → punti vittoria ai membri della squadra prima in ogni girone
//
// Con più gironi ogni girone ha la sua terna di punti (vedi puntiDelGirone):
// l'iscrizione usa i punti del girone della squadra, la partita quelli del
// girone dell'incontro, e ogni girone premia il proprio vincitore.
//
// Tutto è idempotente grazie alle chiavi (vedi src/lib/punti.ts): prima di
// riassegnare si azzera la chiave, così rieseguire non raddoppia i punti.
// In v2 i CREDITI restano 0 (dipendono dalla modalità premi, Fase 8).

import { supabase } from '@/lib/supabase'
import { assegnaMovimento, azzeraChiave, type EsitoPunti } from '@/lib/punti'
import { incontroDisputato } from './calendario'
import {
  calcolaClassifica,
  gironeSquadra,
  incontriDelGirone,
  numGironi,
  puntiDelGirone,
  squadreDelGirone,
} from './gironi'
import type { Componente, Incontro, Squadra, Torneo } from './tipi'

// Iscrizione: punti al socio in base al girone della sua squadra.
// Azzera + riassegna, così è sicuro richiamarla anche dopo un cambio di girone.
export async function assegnaPuntiIscrizione(
  torneo: Torneo,
  squadra: Squadra,
  socioId: string,
): Promise<EsitoPunti> {
  const chiave = `iscr:${squadra.id}:${socioId}`
  await azzeraChiave(chiave)
  const p = puntiDelGirone(torneo, gironeSquadra(torneo, squadra)).iscrizione
  if (!p) return { ok: true }
  return assegnaMovimento({
    socioId,
    punti: p,
    motivo: 'Iscrizione a torneo',
    chiave,
    dataEvento: torneo.data_inizio,
    sport: torneo.sport,
    tipo: 'torneo',
  })
}

// Annulla i punti iscrizione (quando il socio viene tolto dalla squadra).
export async function annullaPuntiIscrizione(
  squadraId: number | string,
  socioId: string,
): Promise<void> {
  await azzeraChiave(`iscr:${squadraId}:${socioId}`)
}

// Partita: ricalcola i punti dell'incontro in base al risultato attuale.
// Usa i punti "partita vinta" del girone dell'incontro. Prima azzera (toglie
// un'eventuale assegnazione precedente), poi premia i soli vincitori.
export async function assegnaPuntiPartita(
  torneo: Torneo,
  incontro: Incontro,
  dataEvento?: string | null,
): Promise<EsitoPunti> {
  const chiave = `partita:${incontro.id}`
  await azzeraChiave(chiave)
  if (incontro.punti_casa == null || incontro.punti_ospite == null) return { ok: true }
  const pVin = puntiDelGirone(torneo, incontro.girone).vittoria
  if (!pVin) return { ok: true }
  const vincitore =
    incontro.punti_casa > incontro.punti_ospite
      ? incontro.casa_id
      : incontro.punti_ospite > incontro.punti_casa
        ? incontro.ospite_id
        : null
  if (vincitore == null) return { ok: true }

  const { data: comp } = await supabase
    .from('squadra_componenti')
    .select('squadra_id, socio_id')
    .in('squadra_id', [incontro.casa_id, incontro.ospite_id])

  let esito: EsitoPunti = { ok: true }
  for (const c of (comp ?? []) as { squadra_id: number | string; socio_id: string | null }[]) {
    if (!c.socio_id) continue // componente manuale: niente punti
    if (String(c.squadra_id) !== String(vincitore)) continue
    const r = await assegnaMovimento({
      socioId: c.socio_id,
      punti: pVin,
      motivo: 'Partita di torneo',
      chiave,
      dataEvento,
      sport: torneo.sport,
      tipo: 'torneo',
    })
    if (!r.ok) esito = r
  }
  return esito
}

// Vittoria torneo AUTOMATICA, un vincitore per ogni girone: quando il
// calendario di un girone è completo, accredita i punti vittoria di quel girone
// ai membri della squadra prima nella sua classifica. Se non è (più) completo,
// azzera l'assegnazione di quel girone. Da richiamare dopo ogni salvataggio.
export async function assegnaPuntiVittoriaAuto(
  torneo: Torneo,
  squadre: Squadra[],
  incontri: Incontro[],
  compBySquadra: Record<string, Componente[]>,
): Promise<EsitoPunti> {
  const n = numGironi(torneo)
  let esito: EsitoPunti = { ok: true }
  for (let g = 1; g <= n; g++) {
    const chiave = `torneo:${torneo.id}:vittoria:${g}`
    const sg = squadreDelGirone(torneo, squadre, g)
    const ig = incontriDelGirone(incontri, g)
    const completo = ig.length > 0 && ig.every(incontroDisputato)
    if (!completo) {
      await azzeraChiave(chiave)
      continue
    }
    const classifica = calcolaClassifica(torneo.sport, sg, ig)
    if (!classifica.length) {
      await azzeraChiave(chiave)
      continue
    }
    const membri = (compBySquadra[String(classifica[0].id)] ?? [])
      .map((c) => c.socio_id)
      .filter((x): x is string => !!x) // esclude i componenti manuali
    const p = puntiDelGirone(torneo, g).torneo
    const r = await assegnaPuntiVittoriaGirone(chiave, torneo, p, membri)
    if (!r.ok) esito = r
  }
  return esito
}

async function assegnaPuntiVittoriaGirone(
  chiave: string,
  torneo: Torneo,
  punti: number,
  membri: string[],
): Promise<EsitoPunti> {
  await azzeraChiave(chiave)
  if (!punti || !membri.length) return { ok: true }
  let esito: EsitoPunti = { ok: true }
  for (const sid of membri) {
    const r = await assegnaMovimento({
      socioId: sid,
      punti,
      motivo: 'Vittoria torneo',
      chiave,
      dataEvento: torneo.data_inizio,
      sport: torneo.sport,
      tipo: 'torneo',
    })
    if (!r.ok) esito = r
  }
  return esito
}

// Ricalcola TUTTI i punti del torneo (iscrizioni, partite, vittorie di girone)
// in base allo stato passato. Serve quando cambiano cose che spostano i punti
// di molti giocatori in una volta: numero/assegnazione dei gironi o le regole
// (punti per girone). È idempotente perché ogni passo azzera la propria chiave.
export async function ricalcolaPuntiTorneo(
  torneo: Torneo,
  squadre: Squadra[],
  incontri: Incontro[],
  compBySquadra: Record<string, Componente[]>,
): Promise<void> {
  for (const s of squadre) {
    for (const c of compBySquadra[String(s.id)] ?? []) {
      if (c.socio_id) await assegnaPuntiIscrizione(torneo, s, c.socio_id)
    }
  }
  for (const m of incontri) {
    await assegnaPuntiPartita(torneo, m, m.data_disputata ?? null)
  }
  await assegnaPuntiVittoriaAuto(torneo, squadre, incontri, compBySquadra)
}
