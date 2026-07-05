-- Fase 5: prenotazione lezioni private.
-- Il socio manda una richiesta di lezione all'istruttore (data/ora scelta tra
-- le sue disponibilità, Fase 4, durata fissa 1h). L'istruttore accetta
-- (scegliendo il campo libero) o rifiuta. Solo all'accettazione nasce la
-- prenotazione vera (prenotazioni, allenamento=true) — fino ad allora questa
-- tabella è solo una richiesta, non blocca nessuno slot.

create table if not exists public.richieste_lezione (
  id              bigint generated always as identity primary key,
  socio_id        uuid not null references public.soci(id) on delete cascade,
  istruttore_id   uuid not null references public.soci(id) on delete cascade,
  sport           text not null check (sport in ('padel', 'calcio')),
  inizio          timestamptz not null,
  fine            timestamptz not null,
  stato           text not null default 'in_attesa' check (stato in ('in_attesa', 'accettata', 'rifiutata')),
  prenotazione_id uuid references public.prenotazioni(id) on delete set null,
  creato_il       timestamptz not null default now(),
  check (fine > inizio),
  check (socio_id <> istruttore_id)
);

create index if not exists richieste_lezione_istruttore_idx
  on public.richieste_lezione (istruttore_id, stato);
create index if not exists richieste_lezione_socio_idx
  on public.richieste_lezione (socio_id);

alter table public.richieste_lezione enable row level security;

drop policy if exists "richieste_lezione select" on public.richieste_lezione;
drop policy if exists "richieste_lezione insert" on public.richieste_lezione;
drop policy if exists "richieste_lezione update" on public.richieste_lezione;

create policy "richieste_lezione select"
  on public.richieste_lezione for select to authenticated
  using (socio_id = auth.uid() or istruttore_id = auth.uid());

create policy "richieste_lezione insert"
  on public.richieste_lezione for insert to authenticated
  with check (socio_id = auth.uid());

-- Solo l'istruttore destinatario accetta/rifiuta (e collega la prenotazione creata).
create policy "richieste_lezione update"
  on public.richieste_lezione for update to authenticated
  using (istruttore_id = auth.uid())
  with check (istruttore_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'richieste_lezione'
  ) then
    alter publication supabase_realtime add table public.richieste_lezione;
  end if;
end $$;
