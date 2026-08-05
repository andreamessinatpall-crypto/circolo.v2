// Helper puri sulle squadre/orari dei tornei tra amici, condivisi tra la
// schermata del torneo (DettaglioTorneoAmici.tsx) e Attività > Partite
// concluse (AttivitaConcluse.tsx) — in un file a parte (invece che dentro
// DettaglioTorneoAmici.tsx) perché mescolare componenti ed export non-componente
// nello stesso file rompe il Fast Refresh (react-refresh/only-export-components).

import { titleCase } from '@/lib/formato'
import { formatNomeAmericano } from '@/features/tornei/americano'
import { unitaTorneo } from '@/features/tornei/gironi'
import type { PartecipanteTorneoAmici, SquadraAmici } from './tipi'

// Il risultato si può inserire solo a partire dalla fine dell'orario
// prenotato per l'incontro — prima l'incontro non è ancora stato giocato.
export function partitaConclusa(pren: { fine: string } | undefined): boolean {
  return !!pren && new Date(pren.fine) <= new Date()
}

// abbreviato: "Cognome Iniziale." invece del nome completo — usato in
// classifica e partite, come i tornei ufficiali (formatNomeAmericano).
export function nomeSquadra(
  s: SquadraAmici | undefined,
  partecipanti: PartecipanteTorneoAmici[],
  nomiSoci: Map<string, string>,
  sport: string,
  abbreviato = false,
): string {
  if (!s) return '?'
  if (s.nome) return s.nome
  const membri = partecipanti
    .filter((p) => p.squadra_id === s.id)
    .map((p) => {
      const nome = titleCase((p.socio_id ? nomiSoci.get(p.socio_id) : p.nome_manuale) ?? '?')
      return abbreviato ? formatNomeAmericano(nome) : nome
    })
  return membri.join(' · ') || titleCase(unitaTorneo(sport, false))
}

// Nomi dei singoli giocatori di una squadra (non il nome-squadra collettivo):
// serve per lo specchio del risultato su prenotazioni.risultato_dettaglio,
// che vuole un array di nomi come squadraCasa/squadraOspite (stessa forma di
// RisultatoPartita in AttivitaConcluse.tsx), non un'unica etichetta.
// Abbreviato "Cognome I." come il resto della vista del torneo (classifica,
// podio, calendario), così il risultato salvato non cambia formato rispetto
// a come si vedeva la partita mentre era in corso.
export function nomiGiocatoriSquadra(
  squadraId: string,
  partecipanti: PartecipanteTorneoAmici[],
  nomiSoci: Map<string, string>,
): string[] {
  return partecipanti
    .filter((p) => p.squadra_id === squadraId)
    .map((p) => formatNomeAmericano(titleCase((p.socio_id ? nomiSoci.get(p.socio_id) : p.nome_manuale) ?? '?')))
}
