-- Tabella richieste di iscrizione ai tornei in programma.
-- Il richiedente invia la propria richiesta con i compagni (array di uuid).
-- Lo staff vede tutte le richieste; ogni socio vede solo le proprie.

create table if not exists public.richieste_iscrizione (
  id          bigint generated always as identity primary key,
  torneo_id   uuid    not null references public.tornei(id) on delete cascade,
  richiedente_id uuid not null references public.soci(id) on delete cascade,
  componenti  uuid[]  not null default '{}',
  creata_il   timestamptz not null default now(),
  unique (torneo_id, richiedente_id)
);

alter table public.richieste_iscrizione enable row level security;

drop policy if exists "richiesta insert"  on public.richieste_iscrizione;
drop policy if exists "richiesta select"  on public.richieste_iscrizione;
drop policy if exists "richiesta delete"  on public.richieste_iscrizione;

create policy "richiesta insert"
  on public.richieste_iscrizione for insert to authenticated
  with check (richiedente_id = auth.uid());

create policy "richiesta select"
  on public.richieste_iscrizione for select to authenticated
  using (richiedente_id = auth.uid() or public.puo_gestire_prenotazioni());

create policy "richiesta delete"
  on public.richieste_iscrizione for delete to authenticated
  using (richiedente_id = auth.uid() or public.puo_gestire_prenotazioni());
