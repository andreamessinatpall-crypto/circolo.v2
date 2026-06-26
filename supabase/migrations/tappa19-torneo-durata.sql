-- Aggiunge la durata della partita al torneo (default 90 min = 1h30).
-- Usato da ProgrammaIncontro per calcolare gli slot disponibili.
alter table tornei
  add column if not exists durata_minuti integer not null default 90;
