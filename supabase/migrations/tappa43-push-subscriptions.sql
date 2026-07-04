-- Fase 1: infrastruttura notifiche push (Web Push).
-- Ogni socio salva qui la propria subscription del browser quando accetta il
-- permesso di notifica. Un socio gestisce solo le proprie righe.

create table if not exists public.push_subscriptions (
  id           bigint generated always as identity primary key,
  socio_id     uuid not null references public.soci(id) on delete cascade,
  endpoint     text not null unique,
  chiave_p256dh text not null,
  chiave_auth   text not null,
  creato_il    timestamptz not null default now()
);

create index if not exists push_subscriptions_socio_id_idx
  on public.push_subscriptions (socio_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push select"  on public.push_subscriptions;
drop policy if exists "push insert"  on public.push_subscriptions;
drop policy if exists "push update"  on public.push_subscriptions;
drop policy if exists "push delete"  on public.push_subscriptions;

create policy "push select"
  on public.push_subscriptions for select to authenticated
  using (socio_id = auth.uid());

create policy "push insert"
  on public.push_subscriptions for insert to authenticated
  with check (socio_id = auth.uid());

create policy "push update"
  on public.push_subscriptions for update to authenticated
  using (socio_id = auth.uid())
  with check (socio_id = auth.uid());

create policy "push delete"
  on public.push_subscriptions for delete to authenticated
  using (socio_id = auth.uid());
