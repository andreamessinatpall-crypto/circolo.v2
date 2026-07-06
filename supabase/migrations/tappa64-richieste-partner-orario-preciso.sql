-- Tappa 64 · "Cerco giocatori": la fascia oraria generica (mattina/
-- pomeriggio/sera) non bastava a capire davvero quando si vuole giocare.
-- Sostituita con uno slot orario preciso: ora di inizio e fine proposte.

alter table public.richieste_partner
  add column if not exists ora_inizio time,
  add column if not exists ora_fine time;

update public.richieste_partner
set ora_inizio = case fascia_oraria
    when 'mattina' then time '09:00'
    when 'pomeriggio' then time '14:00'
    else time '19:00'
  end,
  ora_fine = case fascia_oraria
    when 'mattina' then time '12:00'
    when 'pomeriggio' then time '18:00'
    else time '22:00'
  end
where ora_inizio is null;

alter table public.richieste_partner
  alter column ora_inizio set not null,
  alter column ora_fine set not null;

alter table public.richieste_partner
  drop constraint if exists richieste_partner_orario_valido;
alter table public.richieste_partner
  add constraint richieste_partner_orario_valido check (ora_fine > ora_inizio);

alter table public.richieste_partner drop column if exists fascia_oraria;
