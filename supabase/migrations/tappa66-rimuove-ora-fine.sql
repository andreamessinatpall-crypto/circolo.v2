-- Tappa 66 · "Cerco giocatori": rimossa l'ora di fine, resta solo l'orario
-- di inizio proposto (più semplice da compilare).

alter table public.richieste_partner
  drop constraint if exists richieste_partner_orario_valido;

alter table public.richieste_partner
  drop column if exists ora_fine;
