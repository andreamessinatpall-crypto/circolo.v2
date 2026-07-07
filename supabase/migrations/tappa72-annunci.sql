-- Fase 10 — Bacheca annunci del circolo.
--
-- Tabella semplice: titolo + testo, scritta solo dall'admin/segreteria,
-- letta da tutti i soci. Riusa la funzione public.e_admin() già creata in
-- tappa13-campi-rls.sql per le policy di scrittura.

create table if not exists public.annunci (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  testo text not null,
  autore_id uuid not null references public.soci(id),
  creato_il timestamptz not null default now()
);

alter table public.annunci enable row level security;

drop policy if exists "tutti leggono annunci" on public.annunci;
create policy "tutti leggono annunci"
  on public.annunci
  for select
  to authenticated
  using (true);

drop policy if exists "admin crea annunci" on public.annunci;
create policy "admin crea annunci"
  on public.annunci
  for insert
  to authenticated
  with check (public.e_admin());

drop policy if exists "admin modifica annunci" on public.annunci;
create policy "admin modifica annunci"
  on public.annunci
  for update
  to authenticated
  using (public.e_admin())
  with check (public.e_admin());

drop policy if exists "admin elimina annunci" on public.annunci;
create policy "admin elimina annunci"
  on public.annunci
  for delete
  to authenticated
  using (public.e_admin());

alter publication supabase_realtime add table public.annunci;
