-- Fase 3: "Cerco compagno di gioco".
--
-- Due meccaniche diverse per sport (deciso in conversazione, non nel prompt
-- originale):
-- - Padel: richiesta con il proprio livello (da livelli_gioco, Fase 3bis),
--   giorno e fascia oraria. Rispondere apre direttamente una chat 1-a-1 con
--   chi ha pubblicato — nessuna riga di "risposta" da tracciare.
-- - Calcio: l'organizzatore indica quanti giocatori mancano, indistintamente
--   dal livello. Chi è interessato si candida (candidature_partner);
--   l'organizzatore vede la lista e accetta/rifiuta ciascuno (solo notifica,
--   nessuna aggiunta automatica a una prenotazione: qui non ce n'è ancora una).
--
-- Scadenza automatica a 48h: scade_il calcolato alla creazione, le query
-- filtrano scade_il > now() (nessun cancellazione fisica immediata).

create table if not exists public.richieste_partner (
  id                 bigint generated always as identity primary key,
  socio_id           uuid not null references public.soci(id) on delete cascade,
  sport              text not null check (sport in ('padel', 'calcio')),
  livello            text check (livello in ('principiante', 'intermedio', 'avanzato')),
  giocatori_mancanti smallint check (giocatori_mancanti > 0),
  giorno             date not null,
  fascia_oraria      text not null check (fascia_oraria in ('mattina', 'pomeriggio', 'sera')),
  creato_il          timestamptz not null default now(),
  scade_il           timestamptz not null default (now() + interval '48 hours'),
  check (
    (sport = 'padel'  and giocatori_mancanti is null) or
    (sport = 'calcio' and livello is null and giocatori_mancanti is not null)
  )
);

create index if not exists richieste_partner_attive_idx
  on public.richieste_partner (sport, scade_il);

alter table public.richieste_partner enable row level security;

drop policy if exists "richieste_partner select" on public.richieste_partner;
drop policy if exists "richieste_partner insert" on public.richieste_partner;
drop policy if exists "richieste_partner delete" on public.richieste_partner;

-- Bacheca visibile a tutto il circolo (come un annuncio pubblico interno).
create policy "richieste_partner select"
  on public.richieste_partner for select to authenticated
  using (true);

create policy "richieste_partner insert"
  on public.richieste_partner for insert to authenticated
  with check (socio_id = auth.uid());

create policy "richieste_partner delete"
  on public.richieste_partner for delete to authenticated
  using (socio_id = auth.uid());

create table if not exists public.candidature_partner (
  id           bigint generated always as identity primary key,
  richiesta_id bigint not null references public.richieste_partner(id) on delete cascade,
  socio_id     uuid not null references public.soci(id) on delete cascade,
  stato        text not null default 'in_attesa' check (stato in ('in_attesa', 'accettato', 'rifiutato')),
  creato_il    timestamptz not null default now(),
  unique (richiesta_id, socio_id)
);

alter table public.candidature_partner enable row level security;

drop policy if exists "candidature select" on public.candidature_partner;
drop policy if exists "candidature insert" on public.candidature_partner;
drop policy if exists "candidature update" on public.candidature_partner;

-- Il candidato vede le proprie candidature; l'organizzatore vede quelle sulla propria richiesta.
create policy "candidature select"
  on public.candidature_partner for select to authenticated
  using (
    socio_id = auth.uid()
    or exists (
      select 1 from public.richieste_partner r
      where r.id = richiesta_id and r.socio_id = auth.uid()
    )
  );

create policy "candidature insert"
  on public.candidature_partner for insert to authenticated
  with check (
    socio_id = auth.uid()
    and exists (
      select 1 from public.richieste_partner r
      where r.id = richiesta_id and r.socio_id <> auth.uid()
    )
  );

-- Solo l'organizzatore della richiesta collegata può accettare/rifiutare.
create policy "candidature update"
  on public.candidature_partner for update to authenticated
  using (
    exists (select 1 from public.richieste_partner r where r.id = richiesta_id and r.socio_id = auth.uid())
  )
  with check (
    exists (select 1 from public.richieste_partner r where r.id = richiesta_id and r.socio_id = auth.uid())
  );

-- La chat (Fase 2) finora richiedeva un'amicizia accettata (sono_amici). Per
-- "Cerco compagno" bisogna poter scrivere anche a chi non è ancora amico, se
-- l'altro ha un annuncio attivo in bacheca (o viceversa) — è proprio lo scopo
-- del matchmaking. sono_amici resta comunque valido come canale sempre aperto.
create or replace function public.puo_contattare(mittente uuid, destinatario uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select public.sono_amici(mittente, destinatario)
    or exists (
      select 1 from public.richieste_partner r
      where r.socio_id = destinatario and r.scade_il > now()
    )
    or exists (
      select 1 from public.richieste_partner r
      where r.socio_id = mittente and r.scade_il > now()
    );
$$;

drop policy if exists "chat insert" on public.messaggi_chat;
create policy "chat insert"
  on public.messaggi_chat for insert to authenticated
  with check (mittente_id = auth.uid() and public.puo_contattare(mittente_id, destinatario_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'richieste_partner'
  ) then
    alter publication supabase_realtime add table public.richieste_partner;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'candidature_partner'
  ) then
    alter publication supabase_realtime add table public.candidature_partner;
  end if;
end $$;
