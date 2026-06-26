-- Fase 9b · Partecipanti amichevoli/allenamenti: gestione "da admin" anche per
-- il collaboratore.
--
-- Problema: dalla pagina Prenotazioni il collaboratore non vede gli iscritti,
-- non li può aggiungere/togliere e non può confermare le presenze, perché la
-- RLS di `partecipanti_amichevole` concede questi poteri solo all'admin
-- (errore: new row violates row-level security policy ...).
--
-- Soluzione: come per le prenotazioni, AGGIUNGIAMO policy permissive per lo
-- staff (admin o collaboratore). Si sommano in OR a quelle esistenti dei soci,
-- che restano invariate. Sicuro da rieseguire.

-- Helper (ricreato qui così lo script funziona anche da solo): l'utente loggato
-- è admin oppure collaboratore?
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

-- SELECT: lo staff vede tutti i partecipanti di ogni prenotazione.
drop policy if exists "staff vede partecipanti" on public.partecipanti_amichevole;
create policy "staff vede partecipanti"
  on public.partecipanti_amichevole
  for select
  to authenticated
  using ( public.puo_gestire_prenotazioni() );

-- INSERT: lo staff aggiunge giocatori (e ospiti) a qualsiasi prenotazione.
drop policy if exists "staff aggiunge partecipanti" on public.partecipanti_amichevole;
create policy "staff aggiunge partecipanti"
  on public.partecipanti_amichevole
  for insert
  to authenticated
  with check ( public.puo_gestire_prenotazioni() );

-- UPDATE: lo staff conferma/annulla la presenza (campo `confermato`).
drop policy if exists "staff aggiorna partecipanti" on public.partecipanti_amichevole;
create policy "staff aggiorna partecipanti"
  on public.partecipanti_amichevole
  for update
  to authenticated
  using ( public.puo_gestire_prenotazioni() )
  with check ( public.puo_gestire_prenotazioni() );

-- DELETE: lo staff rimuove un partecipante da qualsiasi prenotazione.
drop policy if exists "staff rimuove partecipanti" on public.partecipanti_amichevole;
create policy "staff rimuove partecipanti"
  on public.partecipanti_amichevole
  for delete
  to authenticated
  using ( public.puo_gestire_prenotazioni() );
