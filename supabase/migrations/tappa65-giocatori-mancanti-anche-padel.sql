-- Tappa 65 · "Cerco giocatori": anche per il padel ora si indica quanti
-- giocatori mancano (prima solo il calcio lo prevedeva, il padel mostrava
-- solo il livello). livello resta comunque esclusivo del padel.

alter table public.richieste_partner
  drop constraint if exists richieste_partner_check;

update public.richieste_partner
set giocatori_mancanti = 1
where sport = 'padel' and giocatori_mancanti is null;

alter table public.richieste_partner
  add constraint richieste_partner_check check (
    giocatori_mancanti is not null
    and (
      (sport = 'padel') or
      (sport = 'calcio' and livello is null)
    )
  );
