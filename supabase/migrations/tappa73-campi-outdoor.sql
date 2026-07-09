-- Fase 11 — Integrazione meteo.
--
-- Colonna per marcare i campi scoperti (outdoor): solo per questi la griglia
-- prenotazioni mostrerà il badge con la previsione meteo del giorno.

alter table public.campi
  add column if not exists outdoor boolean not null default false;
