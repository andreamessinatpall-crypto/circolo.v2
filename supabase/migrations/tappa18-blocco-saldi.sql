-- Aggiunge la possibilità di bloccare manualmente i saldi (punti / crediti)
-- per un singolo giocatore. Quando bloccati, il flusso automatico
-- (partite, premi, ecc.) non modifica quel saldo.

alter table soci
  add column if not exists punti_bloccati   boolean not null default false,
  add column if not exists crediti_bloccati boolean not null default false;
