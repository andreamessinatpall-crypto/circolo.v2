-- Durata dello slot di prenotazione configurabile per campo (Impostazioni > Campi e regole).
-- Prima era una costante fissa (90 min) nel codice; ora ogni campo ha la sua durata.
alter table public.campi add column if not exists durata_minuti integer not null default 90;
alter table public.campi add constraint campi_durata_minuti_check check (durata_minuti > 0 and durata_minuti <= 480);
