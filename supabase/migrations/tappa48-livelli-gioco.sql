-- Fase 3bis: livello di gioco per sport (padel/calcio indipendenti).
-- Impostato solo tramite questionario (nessuna correzione manuale diretta,
-- né da parte del socio né della segreteria in questa fase). Un socio ha al
-- massimo una riga per sport: rifare il questionario sovrascrive la
-- precedente (upsert lato client su socio_id+sport).

create table if not exists public.livelli_gioco (
  id            bigint generated always as identity primary key,
  socio_id      uuid not null references public.soci(id) on delete cascade,
  sport         text not null check (sport in ('padel', 'calcio')),
  livello       text not null check (livello in ('principiante', 'intermedio', 'avanzato', 'esperto')),
  aggiornato_il timestamptz not null default now(),
  unique (socio_id, sport)
);

alter table public.livelli_gioco enable row level security;

drop policy if exists "livelli_gioco select" on public.livelli_gioco;
drop policy if exists "livelli_gioco insert" on public.livelli_gioco;
drop policy if exists "livelli_gioco update" on public.livelli_gioco;

create policy "livelli_gioco select"
  on public.livelli_gioco for select to authenticated
  using (socio_id = auth.uid());

create policy "livelli_gioco insert"
  on public.livelli_gioco for insert to authenticated
  with check (socio_id = auth.uid());

create policy "livelli_gioco update"
  on public.livelli_gioco for update to authenticated
  using (socio_id = auth.uid())
  with check (socio_id = auth.uid());
