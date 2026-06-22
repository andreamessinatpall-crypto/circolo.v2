-- (Fase 8c) Gestione campi dalla segreteria.
--
-- Problema: la segreteria ora permette all'admin di CREARE, MODIFICARE ed
-- ELIMINARE i campi. La tabella public.campi finora aveva (presumibilmente)
-- solo una policy di lettura per tutti, quindi qualsiasi insert/update/delete
-- viene rifiutato dalla Row Level Security:
--   "new row violates row-level security policy for table campi".
--
-- Soluzione: tre policy di SCRITTURA riservate agli amministratori. Un utente
-- è admin se la SUA riga in public.soci ha is_admin = true. soci.id coincide
-- con auth.uid() (l'AuthProvider inserisce id = user.id), quindi la sotto-query
-- legge solo la propria riga ed è consentita dalla policy di lettura di soci.
--
-- Sicuro e ripetibile: non tocca la lettura dei campi (resta com'è) e concede
-- la scrittura ai soli admin. Eseguire una sola volta nell'SQL editor di Supabase.

alter table public.campi enable row level security;

-- Funzione helper: true se l'utente corrente è un amministratore.
create or replace function public.e_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.soci
    where id = auth.uid() and is_admin = true
  );
$$;

-- INSERT: solo admin.
drop policy if exists "admin crea campi" on public.campi;
create policy "admin crea campi"
  on public.campi
  for insert
  to authenticated
  with check (public.e_admin());

-- UPDATE: solo admin (nome, orari, stato di servizio).
drop policy if exists "admin modifica campi" on public.campi;
create policy "admin modifica campi"
  on public.campi
  for update
  to authenticated
  using (public.e_admin())
  with check (public.e_admin());

-- DELETE: solo admin.
drop policy if exists "admin elimina campi" on public.campi;
create policy "admin elimina campi"
  on public.campi
  for delete
  to authenticated
  using (public.e_admin());
