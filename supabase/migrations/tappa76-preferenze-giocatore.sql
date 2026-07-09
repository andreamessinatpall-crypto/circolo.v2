-- Fase C (Modifica profilo): "Preferenze del giocatore", domande divise per
-- sport (padel/calcio indipendenti, come livelli_gioco). Un socio ha al
-- massimo una riga per sport: si sovrascrive rifacendo il questionario
-- (upsert lato client su socio_id+sport).

create table if not exists public.preferenze_giocatore (
  id                  bigint generated always as identity primary key,
  socio_id            uuid not null references public.soci(id) on delete cascade,
  sport               text not null check (sport in ('padel', 'calcio')),
  mano_piede_preferito text check (mano_piede_preferito in ('destra', 'sinistra')),
  posizione           text,
  orario_preferito    text check (orario_preferito in ('mattina', 'pomeriggio', 'sera', 'qualsiasi')),
  giorni_preferiti    text[] not null default '{}',
  aggiornato_il       timestamptz not null default now(),
  unique (socio_id, sport)
);

alter table public.preferenze_giocatore enable row level security;

drop policy if exists "preferenze_giocatore select" on public.preferenze_giocatore;
drop policy if exists "preferenze_giocatore insert" on public.preferenze_giocatore;
drop policy if exists "preferenze_giocatore update" on public.preferenze_giocatore;

create policy "preferenze_giocatore select"
  on public.preferenze_giocatore for select to authenticated
  using (socio_id = auth.uid());

create policy "preferenze_giocatore insert"
  on public.preferenze_giocatore for insert to authenticated
  with check (socio_id = auth.uid());

create policy "preferenze_giocatore update"
  on public.preferenze_giocatore for update to authenticated
  using (socio_id = auth.uid())
  with check (socio_id = auth.uid());
