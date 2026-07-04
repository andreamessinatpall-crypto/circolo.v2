-- Fase 1 (estensione): cronologia in-app delle notifiche push.
-- Anche se il socio non apre la notifica di sistema (o non ha ancora dato il
-- permesso push), può rivederla qui. Scritta solo dalla Edge Function
-- invia-push (service role, bypassa RLS); il socio la legge/segna come
-- letta/elimina.

create table if not exists public.notifiche (
  id        bigint generated always as identity primary key,
  socio_id  uuid not null references public.soci(id) on delete cascade,
  titolo    text not null,
  corpo     text,
  url       text,
  letta     boolean not null default false,
  creato_il timestamptz not null default now()
);

create index if not exists notifiche_socio_id_idx on public.notifiche (socio_id, creato_il desc);

alter table public.notifiche enable row level security;

drop policy if exists "notifiche select" on public.notifiche;
drop policy if exists "notifiche update" on public.notifiche;
drop policy if exists "notifiche delete" on public.notifiche;

create policy "notifiche select"
  on public.notifiche for select to authenticated
  using (socio_id = auth.uid());

create policy "notifiche update"
  on public.notifiche for update to authenticated
  using (socio_id = auth.uid())
  with check (socio_id = auth.uid());

create policy "notifiche delete"
  on public.notifiche for delete to authenticated
  using (socio_id = auth.uid());
