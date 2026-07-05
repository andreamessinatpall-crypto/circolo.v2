-- Fase 4: calendario personale maestri.
-- Ogni istruttore gestisce le proprie fasce di disponibilità per lezioni
-- private, usate poi dalla prenotazione lezioni (Fase 5). Una fascia è o
-- ricorrente (giorno_settimana, 0=domenica..6=sabato) o su una data specifica
-- — mai entrambi. Nessuna modifica diretta: solo aggiungere/rimuovere.

create table if not exists public.disponibilita_maestri (
  id               bigint generated always as identity primary key,
  istruttore_id    uuid not null references public.soci(id) on delete cascade,
  giorno_settimana smallint check (giorno_settimana between 0 and 6),
  data             date,
  ora_inizio       time not null,
  ora_fine         time not null,
  creato_il        timestamptz not null default now(),
  check (
    (giorno_settimana is not null and data is null) or
    (giorno_settimana is null and data is not null)
  ),
  check (ora_fine > ora_inizio)
);

create index if not exists disponibilita_maestri_istruttore_idx
  on public.disponibilita_maestri (istruttore_id);

alter table public.disponibilita_maestri enable row level security;

drop policy if exists "disponibilita select" on public.disponibilita_maestri;
drop policy if exists "disponibilita insert" on public.disponibilita_maestri;
drop policy if exists "disponibilita delete" on public.disponibilita_maestri;

-- Tutti i soci leggono (serve per prenotare una lezione, Fase 5).
create policy "disponibilita select"
  on public.disponibilita_maestri for select to authenticated
  using (true);

-- Solo un istruttore (e_allenatore) può aggiungere le proprie fasce.
create policy "disponibilita insert"
  on public.disponibilita_maestri for insert to authenticated
  with check (
    istruttore_id = auth.uid()
    and exists (select 1 from public.soci s where s.id = auth.uid() and s.e_allenatore = true)
  );

create policy "disponibilita delete"
  on public.disponibilita_maestri for delete to authenticated
  using (istruttore_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'disponibilita_maestri'
  ) then
    alter publication supabase_realtime add table public.disponibilita_maestri;
  end if;
end $$;
