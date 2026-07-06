-- Tappa 69 · "Classifica del club": di default tutti visibili, sia i soci
-- già iscritti (aggiornamento una tantum) sia i nuovi (cambio del default).

update public.soci set mostra_in_classifica = true where mostra_in_classifica is not true;

alter table public.soci alter column mostra_in_classifica set default true;
