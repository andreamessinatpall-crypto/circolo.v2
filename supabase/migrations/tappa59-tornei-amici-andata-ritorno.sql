-- Fase 6 (estensione): modalità andata/ritorno per i tornei tra amici
-- (entrambi i formati), più finale secca e 3°/4° posto per l'eliminazione
-- diretta — stessi concetti dei tornei ufficiali (tappa31), qui replicati
-- sul namespace separato tornei_amici_*.

alter table public.tornei_amici
  add column if not exists andata_ritorno boolean not null default false,
  add column if not exists finale_secca boolean not null default false,
  add column if not exists terzo_posto boolean not null default false;
