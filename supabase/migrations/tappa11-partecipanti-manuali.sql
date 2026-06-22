-- (Tappa 11) Ospiti nelle partite normali (amichevoli).
--
-- Solo l'admin puo' aggiungere a una prenotazione un giocatore NON registrato,
-- indicandone il nome. L'ospite compare tra i partecipanti e puo' essere
-- confermato come gli altri, ma non avendo un account non guadagna punti/crediti.
--
-- Eseguire una sola volta nello SQL editor di Supabase.

-- socio_id diventa facoltativo (gli ospiti non ne hanno uno).
alter table public.partecipanti_amichevole alter column socio_id drop not null;

-- Nome del giocatore non registrato (usato solo quando socio_id e' NULL).
alter table public.partecipanti_amichevole add column if not exists nome_manuale text;
