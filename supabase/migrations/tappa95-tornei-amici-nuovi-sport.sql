-- Tappa 95: i tornei tra amici (tornei_amici) restavano bloccati alla vecchia
-- CHECK ('padel','calcio') anche se il frontend (torneiAmici/tipi.ts) usa già
-- il tipo Sport completo a 6 sport (Tappa 94) — un insert con uno sport nuovo
-- avrebbe fallito a livello database. Stessa lista già usata per campi/
-- richieste_partner/richieste_lezione/preferenze_giocatore in Tappa 94.

alter table public.tornei_amici drop constraint if exists tornei_amici_sport_check;
alter table public.tornei_amici add constraint tornei_amici_sport_check
  check (sport in ('padel','calcio','tennis','pickleball','beachvolley','basket'));
