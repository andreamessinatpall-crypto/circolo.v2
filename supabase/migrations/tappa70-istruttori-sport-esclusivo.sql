-- Tappa 70 · Istruttori esclusivi per un solo sport (padel o calcio), e
-- ogni fascia di disponibilità indica esplicitamente per quale sport vale.
--
-- 1. Un istruttore (e_allenatore = true) non può avere sport_preferito =
--    'entrambi': deve essere specifico. Verificato che nessun istruttore
--    attuale ha già 'entrambi' impostato, quindi il vincolo si applica senza
--    dover correggere dati esistenti.
-- 2. disponibilita_maestri guadagna la colonna sport, valorizzata dal
--    sport_preferito dell'istruttore (ora sempre univoco).

alter table public.soci
  drop constraint if exists soci_istruttore_sport_esclusivo;
alter table public.soci
  add constraint soci_istruttore_sport_esclusivo
  check (not (e_allenatore is true and sport_preferito = 'entrambi'));

alter table public.disponibilita_maestri
  add column if not exists sport text;

update public.disponibilita_maestri d
set sport = coalesce(
  (select s.sport_preferito from public.soci s
   where s.id = d.istruttore_id and s.sport_preferito in ('padel', 'calcio')),
  'padel'
)
where sport is null;

alter table public.disponibilita_maestri
  alter column sport set not null;

alter table public.disponibilita_maestri
  drop constraint if exists disponibilita_maestri_sport_check;
alter table public.disponibilita_maestri
  add constraint disponibilita_maestri_sport_check check (sport in ('padel', 'calcio'));
