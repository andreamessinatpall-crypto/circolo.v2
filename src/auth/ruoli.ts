import type { Socio } from './tipi'

// Funzioni che traducono i ruoli del socio in "cosa può vedere/fare".

// Gli sport che il socio vede nell'interfaccia, in base alla sua preferenza.
export function sportConsentiti(p: Socio): Array<'padel' | 'calcio'> {
  if (p.sport_preferito === 'padel') return ['padel']
  if (p.sport_preferito === 'calcio') return ['calcio']
  return ['padel', 'calcio']
}

// NB: chi gestisce prenotazioni/tornei/limiti non si legge più da qui (erano
// flag globali is_admin/is_allenatore/e_allenatore, uguali in ogni circolo).
// Usare `useMioRuolo().puoGestire` dal componente: il ruolo vive per-circolo
// in `soci_circoli`, risolto da <CircoloProvider>.

// Chi gestisce la piattaforma multi-circolo (crea circoli, assegna gestori
// e collaboratori): solo il super-admin.
export function puoGestirePiattaforma(p: Socio): boolean {
  return !!p.is_super_admin
}
