// (Fase 6c) Logica dei gironi e della classifica all'italiana.
// Funzioni pure portate dalla v1 (numGironi, nomeGirone, gironeSquadra,
// calcolaClassifica, ...) per poterle riusare e testare facilmente.

import type { Incontro, RigaClassifica, Squadra, Torneo } from './tipi'

// Massimo 12 gironi: una lettera per ciascuno.
export const LETTERE_GIRONE = 'ABCDEFGHIJKL'

// Quanti gironi ha il torneo (1 = girone unico). Limitato fra 1 e 12.
export function numGironi(t: Pick<Torneo, 'numero_gironi'>): number {
  return Math.min(12, Math.max(1, Number(t.numero_gironi) || 1))
}

// Nome di un girone: quello personalizzato se presente, altrimenti "Girone A/B/…".
export function nomeGirone(t: Pick<Torneo, 'nomi_gironi'>, g: number): string {
  const nomi = t && t.nomi_gironi ? t.nomi_gironi : null
  if (nomi && nomi[g] != null && String(nomi[g]).trim()) return String(nomi[g]).trim()
  return 'Girone ' + (LETTERE_GIRONE[g - 1] || g)
}

// In un torneo a girone unico la colonna "girone" è irrilevante: è tutto Girone 1.
export function gironeSquadra(
  t: Pick<Torneo, 'numero_gironi'>,
  s: Pick<Squadra, 'girone'>,
): number | null {
  return numGironi(t) <= 1 ? 1 : Number(s.girone) || null
}

export function squadreDelGirone(
  t: Pick<Torneo, 'numero_gironi'>,
  squadre: Squadra[],
  g: number,
): Squadra[] {
  return squadre.filter((s) => gironeSquadra(t, s) === g)
}

export function incontriDelGirone(incontri: Incontro[], g: number): Incontro[] {
  return incontri.filter((m) => (Number(m.girone) || 1) === g)
}

// Etichetta dell'unità del torneo: "coppia/coppie" nel padel, "squadra/squadre" nel calcio.
export function unitaTorneo(sport: string, plurale: boolean): string {
  if (sport === 'padel') return plurale ? 'coppie' : 'coppia'
  return plurale ? 'squadre' : 'squadra'
}

// Messaggio chiaro se mancano le colonne dei gironi (script SQL non ancora eseguito).
export function mancaColonnaGironi(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  const msg = (e.message ?? '').toLowerCase()
  return e.code === 'PGRST204' || msg.includes('numero_gironi') || msg.includes('girone')
}

export const SCRIPT_GIRONI =
  'Mancano le colonne dei gironi: esegui su Supabase gli script tappa3c-gironi-multipli.sql e tappa3c2-nomi-gironi.sql.'

// Classifica all'italiana: dalle partite con risultato calcola punti, vittorie, ecc.
// Padel: 1 punto a vittoria, nessun pareggio. Calcio: 3 a vittoria, 1 a pareggio.
export function calcolaClassifica(
  sport: string,
  squadre: Squadra[],
  incontri: Incontro[],
): RigaClassifica[] {
  const tab: Record<string, RigaClassifica> = {}
  for (const s of squadre) {
    tab[String(s.id)] = {
      id: s.id,
      nome: s.nome,
      g: 0,
      v: 0,
      n: 0,
      p: 0,
      gf: 0,
      gs: 0,
      diff: 0,
      pti: 0,
    }
  }
  for (const m of incontri) {
    if (m.punti_casa == null || m.punti_ospite == null) continue
    const c = tab[String(m.casa_id)]
    const o = tab[String(m.ospite_id)]
    if (!c || !o) continue
    c.g++
    o.g++
    c.gf += m.punti_casa
    c.gs += m.punti_ospite
    o.gf += m.punti_ospite
    o.gs += m.punti_casa
    if (m.punti_casa > m.punti_ospite) {
      c.v++
      o.p++
      c.pti += sport === 'calcio' ? 3 : 1
    } else if (m.punti_casa < m.punti_ospite) {
      o.v++
      c.p++
      o.pti += sport === 'calcio' ? 3 : 1
    } else {
      // Pareggio: previsto solo nel calcio.
      c.n++
      o.n++
      c.pti += 1
      o.pti += 1
    }
  }
  const arr = Object.values(tab)
  for (const r of arr) r.diff = r.gf - r.gs
  // Ordine: punti, poi differenza reti, poi reti fatte, poi nome.
  arr.sort(
    (a, b) => b.pti - a.pti || b.diff - a.diff || b.gf - a.gf || a.nome.localeCompare(b.nome, 'it'),
  )
  return arr
}
