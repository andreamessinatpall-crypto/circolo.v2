import type { Socio } from './tipi'

// Funzioni che traducono i ruoli del socio in "cosa può vedere/fare".
// `sportConsentiti` si è spostata in features/prenotazioni/datiPrenotazioni.ts
// (serve anche la lista degli sport realmente disponibili nel circolo, che
// vive lì insieme a useCampi()).

// NB: chi gestisce prenotazioni/tornei/limiti non si legge più da qui (erano
// flag globali is_admin/is_allenatore/e_allenatore, uguali in ogni circolo).
// Usare `useMioRuolo().puoGestire` dal componente: il ruolo vive per-circolo
// in `soci_circoli`, risolto da <CircoloProvider>.

// Chi gestisce la piattaforma multi-circolo (crea circoli, assegna gestori
// e collaboratori): solo il super-admin.
export function puoGestirePiattaforma(p: Socio): boolean {
  return !!p.is_super_admin
}
