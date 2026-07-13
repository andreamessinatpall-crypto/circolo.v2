-- Scadenza annunci: se non impostata, l'annuncio resta visibile per sempre
-- (vedi annuncioAttivo() in src/features/profilo/datiAnnunci.ts).

alter table public.annunci
  add column if not exists scadenza timestamptz null;
