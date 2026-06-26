-- Fase 9 · Prenotazioni: poteri "da admin" anche per il collaboratore.
--
-- Problema: il collaboratore prenota/gestisce dalla pagina Prenotazioni come
-- l'admin, ma le regole RLS della tabella `prenotazioni` permettevano insert
-- nel passato (e update/delete altrui) solo all'admin -> errore 42501.
--
-- Soluzione: NON tocchiamo le policy esistenti dei soci. Le policy permissive
-- in Postgres si sommano in OR, quindi basta AGGIUNGERE policy per lo staff
-- (admin o collaboratore) che concedano insert/update/delete senza vincoli.
--
-- Sicuro da rieseguire: ogni policy viene prima eliminata se esiste.

-- Helper: l'utente loggato è admin oppure collaboratore?
-- SECURITY DEFINER così può leggere i flag in `soci` ignorando la RLS di soci.
create or replace function public.puo_gestire_prenotazioni()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.soci
    where id = auth.uid()
      and (is_admin = true or is_allenatore = true)
  );
$$;

-- INSERT: lo staff può creare prenotazioni anche nel passato.
drop policy if exists "staff inserisce prenotazioni" on public.prenotazioni;
create policy "staff inserisce prenotazioni"
  on public.prenotazioni
  for insert
  to authenticated
  with check ( public.puo_gestire_prenotazioni() );

-- UPDATE: lo staff può modificare qualsiasi prenotazione (es. spostare gli orari).
drop policy if exists "staff modifica prenotazioni" on public.prenotazioni;
create policy "staff modifica prenotazioni"
  on public.prenotazioni
  for update
  to authenticated
  using ( public.puo_gestire_prenotazioni() )
  with check ( public.puo_gestire_prenotazioni() );

-- DELETE: lo staff può annullare la prenotazione di chiunque.
drop policy if exists "staff cancella prenotazioni" on public.prenotazioni;
create policy "staff cancella prenotazioni"
  on public.prenotazioni
  for delete
  to authenticated
  using ( public.puo_gestire_prenotazioni() );
