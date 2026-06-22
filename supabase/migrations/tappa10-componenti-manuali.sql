-- (Tappa 10) Componenti manuali nelle squadre dei tornei.
--
-- L'organizzatore puo' inserire in una squadra anche un giocatore NON
-- registrato, indicandone solo il nome. Questi componenti non hanno un account
-- (socio_id resta NULL) e quindi non guadagnano punti ne crediti.
--
-- Eseguire una sola volta nello SQL editor di Supabase.

-- socio_id diventa facoltativo (i componenti manuali non ne hanno uno).
alter table public.squadra_componenti alter column socio_id drop not null;

-- Nome del giocatore non registrato (usato solo quando socio_id e' NULL).
alter table public.squadra_componenti add column if not exists nome_manuale text;
