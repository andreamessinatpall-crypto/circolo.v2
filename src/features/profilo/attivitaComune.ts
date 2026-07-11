import { supabase } from '@/lib/supabase'

// Forma condivisa da "in programma" (AttivitaInProgramma.tsx) e "concluse"
// (AttivitaConcluse.tsx): stessa RPC di base (partite_in_programma /
// partite_concluse), stesso arricchimento con tipo/istruttore/nome torneo.
export interface Attivita {
  id: number | string
  inizio: string
  fine: string
  campo_nome: string | null
  sport: string
  prenotante_id: string | null
  parti: { socio_id: string | null; nome_manuale: string | null; confermato: boolean }[]
  allenamento: boolean
  allenatore_id: string | null
  torneo_nome: string | null
}

export interface RigaAttivitaBase {
  prenotazione_id: number | string
  inizio: string
  fine: string
  campo_nome: string | null
  sport: string
  prenotante_id: string | null
  socio_id: string | null
  confermato: boolean | null
  nome_manuale?: string | null
}

export function righeInMappa<T extends RigaAttivitaBase>(rows: T[]): Map<string, Attivita> {
  const map = new Map<string, Attivita>()
  for (const r of rows) {
    const k = String(r.prenotazione_id)
    if (!map.has(k)) {
      map.set(k, {
        id: r.prenotazione_id,
        inizio: r.inizio,
        fine: r.fine,
        campo_nome: r.campo_nome,
        sport: r.sport,
        prenotante_id: r.prenotante_id,
        parti: [],
        allenamento: false,
        allenatore_id: null,
        torneo_nome: null,
      })
    }
    // socio_id e nome_manuale entrambi nulli: artefatto del LEFT JOIN quando
    // la prenotazione non ha ancora partecipanti, niente da aggiungere. Un
    // ospite ha invece socio_id null ma nome_manuale valorizzato.
    if (r.socio_id || r.nome_manuale) {
      map.get(k)!.parti.push({
        socio_id: r.socio_id,
        nome_manuale: r.nome_manuale ?? null,
        confermato: !!r.confermato,
      })
    }
  }
  return map
}

// Segna allenamento/istruttore e risolve il nome del torneo (incontro
// classico o americano) per ogni voce della mappa, mutandola in place.
export async function arricchisciTipoAttivita(map: Map<string, Attivita>): Promise<void> {
  const ids = [...map.keys()]
  if (!ids.length) return

  const { data: tipi } = await supabase
    .from('prenotazioni')
    .select('id, allenamento, allenatore_id, incontro_id, torneo_id')
    .in('id', ids)
  const incontroIds: (number | string)[] = []
  const torneoIds: string[] = []
  const pren2 = (tipi ?? []) as Array<{
    id: number | string
    allenamento: boolean | null
    allenatore_id: string | null
    incontro_id: number | string | null
    torneo_id: string | null
  }>
  for (const t of pren2) {
    const a = map.get(String(t.id))
    if (a) {
      a.allenamento = !!t.allenamento
      a.allenatore_id = t.allenatore_id ?? null
    }
    if (t.incontro_id) incontroIds.push(t.incontro_id)
    else if (t.torneo_id) torneoIds.push(t.torneo_id)
  }

  if (incontroIds.length) {
    const { data: inc } = await supabase
      .from('incontri')
      .select('id, torneo:tornei(nome)')
      .in('id', incontroIds)
    const nomePerIncontro = new Map<string, string>()
    for (const r of (inc ?? []) as unknown as Array<{ id: number | string; torneo: { nome: string } | null }>) {
      if (r.torneo?.nome) nomePerIncontro.set(String(r.id), r.torneo.nome)
    }
    for (const t of pren2) {
      if (t.incontro_id) {
        const a = map.get(String(t.id))
        if (a) a.torneo_nome = nomePerIncontro.get(String(t.incontro_id)) ?? null
      }
    }
  }

  if (torneoIds.length) {
    const { data: torn } = await supabase.from('tornei').select('id, nome').in('id', torneoIds)
    const nomePerTorneo = new Map<string, string>()
    for (const t of (torn ?? []) as Array<{ id: string; nome: string }>) nomePerTorneo.set(String(t.id), t.nome)
    for (const t of pren2) {
      if (t.torneo_id && !t.incontro_id) {
        const a = map.get(String(t.id))
        if (a) a.torneo_nome = nomePerTorneo.get(String(t.torneo_id)) ?? null
      }
    }
  }
}

// "Mario Rossi" → "Rossi M."
export function cognomeIniziale(etichetta: string): string {
  const s = etichetta.trim()
  const i = s.indexOf(' ')
  if (i < 0) return s
  const nome = s.slice(0, i)
  const cognome = s.slice(i + 1)
  return `${cognome} ${nome[0].toUpperCase()}.`
}

// "Mario Rossi" → "MR", per l'avatar tondo nella scheda "wow". Attenzione:
// convenzione locale "Nome Cognome" (come cognomeIniziale sopra), diversa da
// inizialiDaEtichetta in lib/formato.ts che si aspetta "Cognome Nome".
export function inizialiCoppia(etichetta: string): string {
  const parti = etichetta.trim().split(/\s+/).filter(Boolean)
  if (parti.length === 0) return '?'
  if (parti.length === 1) return parti[0].charAt(0).toUpperCase() || '?'
  return (parti[0].charAt(0) + parti[parti.length - 1].charAt(0)).toUpperCase()
}

// Nome completo per una riga di .parti: un socio vero passa da label(),
// un ospite (socio_id null, aggiunto dal menu "+ amico") usa il
// nome_manuale così com'è stato scritto. Serve come base sia per
// l'etichetta "Cognome N." sia per le iniziali dell'avatar.
export function nomeCompletoGiocatore(
  r: { socio_id: string | null; nome_manuale: string | null },
  label: (id: string) => string,
): string {
  return r.socio_id ? label(r.socio_id) : (r.nome_manuale ?? 'Ospite')
}

// Etichetta "Cognome N." da mostrare per una riga di .parti — stesso
// trattamento per soci e ospiti, così le chip sono coerenti tra loro.
export function etichettaGiocatore(
  r: { socio_id: string | null; nome_manuale: string | null },
  label: (id: string) => string,
): string {
  return cognomeIniziale(nomeCompletoGiocatore(r, label))
}
