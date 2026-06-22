-- (Tappa 15) Ospiti nelle amichevoli: ristruttura partecipanti_amichevole.
--
-- Problema: la tabella aveva PRIMARY KEY (prenotazione_id, socio_id). Cosi'
-- socio_id NON poteva essere NULL (le colonne della primary key sono sempre
-- obbligatorie), quindi era impossibile inserire un ospite (giocatore non
-- registrato, socio_id NULL). Per lo stesso motivo lo script tappa11 falliva:
-- non si puo' fare "alter column socio_id drop not null" su una colonna della
-- chiave primaria. Inoltre mancava una colonna "id" per identificare le righe,
-- che la v2 usa per aggiungere/rimuovere i partecipanti.
--
-- Soluzione: una chiave primaria surrogata "id", socio_id facoltativo, la
-- colonna nome_manuale e un vincolo UNIQUE (prenotazione_id, socio_id) per
-- continuare a impedire doppioni dello stesso socio. Gli ospiti (socio_id NULL)
-- restano ammessi piu' volte: in SQL i valori NULL sono considerati distinti.
--
-- Sicuro: non cancella dati. Idempotente: si puo' rieseguire. Eseguire una
-- volta nello SQL editor di Supabase.

-- 1) Chiave primaria surrogata "id" (popola in automatico le righe esistenti).
alter table public.partecipanti_amichevole
  add column if not exists id bigint generated always as identity;

-- 2) Sostituisce la vecchia primary key composita con quella sulla nuova "id".
alter table public.partecipanti_amichevole
  drop constraint if exists partecipanti_amichevole_pkey;
alter table public.partecipanti_amichevole
  add primary key (id);

-- 3) socio_id diventa facoltativo (gli ospiti non ne hanno uno).
alter table public.partecipanti_amichevole
  alter column socio_id drop not null;

-- 4) Nome del giocatore non registrato (usato solo quando socio_id e' NULL).
alter table public.partecipanti_amichevole
  add column if not exists nome_manuale text;

-- 5) Niente doppioni dello stesso socio nella stessa prenotazione. Serve anche
--    all'upsert dell'app, che usa onConflict (prenotazione_id, socio_id).
create unique index if not exists partecipanti_amichevole_pren_socio_key
  on public.partecipanti_amichevole (prenotazione_id, socio_id);
