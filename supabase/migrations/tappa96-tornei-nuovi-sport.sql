-- Tappa 96: la tabella tornei (ufficiali, non tornei_amici) ha anche lei una
-- CHECK ('padel','calcio') mai allargata alla Tappa 94/95 — trovata solo in
-- fase di test: creare un torneo Basket falliva con
-- "violates check constraint tornei_sport_check". Stessa lista sport delle
-- altre tabelle.

alter table public.tornei drop constraint if exists tornei_sport_check;
alter table public.tornei add constraint tornei_sport_check
  check (sport in ('padel','calcio','tennis','pickleball','beachvolley','basket'));
