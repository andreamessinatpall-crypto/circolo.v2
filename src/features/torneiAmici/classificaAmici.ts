import { calcolaClassifica } from '@/features/tornei/gironi'
import type { Incontro, RigaClassifica, Squadra } from '@/features/tornei/tipi'
import type { IncontroAmici, SquadraAmici } from './tipi'

// Adatta le righe del torneo tra amici alla forma attesa da calcolaClassifica
// (funzione pura già usata e testata dai tornei ufficiali) per riusarla senza
// duplicarne la logica di punteggio/ordinamento.
export function calcolaClassificaAmici(
  sport: string,
  squadre: SquadraAmici[],
  incontri: IncontroAmici[],
): RigaClassifica[] {
  const squadreAdatt: Squadra[] = squadre.map((s) => ({
    id: s.id,
    torneo_id: s.torneo_amici_id,
    nome: s.nome ?? '',
    logo_url: null,
    girone: null,
  }))
  const incontriAdatt: Incontro[] = incontri.map((m) => ({
    id: m.id,
    torneo_id: m.torneo_amici_id,
    round: m.round,
    casa_id: m.casa_id,
    ospite_id: m.ospite_id,
    girone: m.girone,
    punti_casa: m.punti_casa,
    punti_ospite: m.punti_ospite,
    set_punteggi: m.set_punteggi,
    data_disputata: m.data_disputata,
  }))
  return calcolaClassifica(sport, squadreAdatt, incontriAdatt)
}
