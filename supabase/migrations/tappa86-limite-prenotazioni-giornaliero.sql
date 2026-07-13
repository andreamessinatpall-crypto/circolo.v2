-- Limite di prenotazioni giornaliere per sport (in aggiunta al limite di
-- prenotazioni attive già esistente): quante prenotazioni può avere un
-- socio nello stesso giorno solare, per padel/calcio. 0 = nessun limite.
alter table impostazioni
  add column if not exists max_pren_padel_giorno smallint not null default 0,
  add column if not exists max_pren_calcio_giorno smallint not null default 0;
