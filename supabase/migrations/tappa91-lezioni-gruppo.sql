-- Tappa 91 · Lezioni di gruppo: l'istruttore fissa data/ora (stessa
-- prenotazione di un allenamento privato, ma aperta), i giocatori si
-- iscrivono da soli da Area Club invece di passare da una richiesta 1:1.
--
-- La prenotazione in sé non richiede nuove policy: un istruttore può già
-- prenotare per sé (policy "I soci attivi prenotano per sé", socio_id =
-- auth.uid()) e nulla vieta di valorizzare allenamento/allenatore_id nella
-- stessa riga (vedi tappa37/tappa55, stesso principio). Serve solo:
--   1. una colonna per distinguerla da un allenamento privato già esistente
--      (nato da una richiesta di lezione accettata, chiuso alle iscrizioni);
--   2. policy dedicate su partecipanti_amichevole perché un socio possa
--      iscriversi/disiscriversi da solo e vedere chi è già iscritto — oggi
--      concesso solo a chi ha prenotato lui stesso lo slot.

alter table public.prenotazioni
  add column if not exists lezione_gruppo boolean not null default false;

-- SELECT: un socio attivo vede i partecipanti di QUALSIASI lezione di
-- gruppo (per mostrare "3 iscritti" e chi c'è già prima di iscriversi),
-- non solo delle prenotazioni che ha fatto lui.
drop policy if exists "vedi partecipanti lezione di gruppo" on public.partecipanti_amichevole;
create policy "vedi partecipanti lezione di gruppo"
  on public.partecipanti_amichevole
  for select
  to authenticated
  using (
    socio_attivo()
    and exists (
      select 1 from public.prenotazioni p
      where p.id = partecipanti_amichevole.prenotazione_id
        and p.lezione_gruppo = true
    )
  );

-- INSERT: un socio attivo si iscrive da solo a una lezione di gruppo futura.
drop policy if exists "iscriviti a lezione di gruppo" on public.partecipanti_amichevole;
create policy "iscriviti a lezione di gruppo"
  on public.partecipanti_amichevole
  for insert
  to authenticated
  with check (
    socio_attivo()
    and confermato = false
    and socio_id = auth.uid()
    and exists (
      select 1 from public.prenotazioni p
      where p.id = partecipanti_amichevole.prenotazione_id
        and p.lezione_gruppo = true
        and p.inizio > now()
    )
  );

-- DELETE: un socio ritira la propria iscrizione (non quella di altri: per
-- quello resta solo l'istruttore, vedi "istruttore rimuove propri
-- partecipanti" già esistente).
drop policy if exists "annulla iscrizione lezione di gruppo" on public.partecipanti_amichevole;
create policy "annulla iscrizione lezione di gruppo"
  on public.partecipanti_amichevole
  for delete
  to authenticated
  using (
    socio_id = auth.uid()
    and exists (
      select 1 from public.prenotazioni p
      where p.id = partecipanti_amichevole.prenotazione_id
        and p.lezione_gruppo = true
    )
  );
