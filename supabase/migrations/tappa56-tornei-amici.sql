-- Fase 6: Torneo tra amici — mini-tornei privati tra gruppi di amici, sempre
-- a coppie FISSE (2 contro 2, come si gioca davvero il padel tra amici; le
-- coppie non ruotano round dopo round, quella modalità è solo dell'Americano
-- ufficiale). Namespace separato dal sistema tornei ufficiale (tornei/
-- squadre/incontri): qui i risultati non toccano MAI punti/classifica del
-- club, solo una classifica locale calcolata al volo (stessa logica pura del
-- sistema ufficiale: generaTurni/generaBracketSeed/incontriDaSeed/
-- calcolaClassifica, riusate direttamente dal frontend).

create table public.tornei_amici (
  id uuid primary key default gen_random_uuid(),
  creatore_id uuid not null references public.soci(id),
  nome text not null,
  sport text not null check (sport in ('padel','calcio')),
  formato text not null check (formato in ('girone','eliminazione')),
  stato text not null default 'creazione' check (stato in ('creazione','in_corso','concluso')),
  bracket_seed jsonb,
  creato_il timestamptz not null default now()
);

create table public.tornei_amici_squadre (
  id uuid primary key default gen_random_uuid(),
  torneo_amici_id uuid not null references public.tornei_amici(id) on delete cascade,
  nome text
);

create table public.tornei_amici_partecipanti (
  id bigint generated always as identity primary key,
  torneo_amici_id uuid not null references public.tornei_amici(id) on delete cascade,
  socio_id uuid not null references public.soci(id),
  stato_invito text not null default 'in_attesa' check (stato_invito in ('in_attesa','accettata','rifiutata')),
  squadra_id uuid references public.tornei_amici_squadre(id) on delete set null,
  invitato_il timestamptz not null default now(),
  unique (torneo_amici_id, socio_id)
);

create table public.tornei_amici_incontri (
  id uuid primary key default gen_random_uuid(),
  torneo_amici_id uuid not null references public.tornei_amici(id) on delete cascade,
  round int not null,
  girone int, -- riusato come "slot" del bracket per l'eliminazione; null nel girone all'italiana
  casa_id uuid not null references public.tornei_amici_squadre(id),
  ospite_id uuid not null references public.tornei_amici_squadre(id),
  punti_casa int,
  punti_ospite int,
  set_punteggi jsonb,
  data_disputata date,
  inserito_da uuid references public.soci(id),
  creato_il timestamptz not null default now()
);

-- Collega una partita del torneo tra amici a una vera prenotazione campo,
-- esattamente come "prenotazioni.incontro_id" fa per i tornei ufficiali.
alter table public.prenotazioni
  add column if not exists torneo_amici_incontro_id uuid references public.tornei_amici_incontri(id) on delete set null;

-- ── Helper RLS (security definer: leggono le tabelle ignorando la RLS) ──────

create or replace function public.e_creatore_torneo_amici(p_torneo_amici_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tornei_amici
    where id = p_torneo_amici_id and creatore_id = auth.uid()
  );
$$;

create or replace function public.e_partecipante_torneo_amici(p_torneo_amici_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tornei_amici_partecipanti
    where torneo_amici_id = p_torneo_amici_id and socio_id = auth.uid()
  ) or public.e_creatore_torneo_amici(p_torneo_amici_id);
$$;

create or replace function public.e_giocatore_incontro_amici(p_incontro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tornei_amici_incontri i
    join public.tornei_amici_partecipanti p
      on p.torneo_amici_id = i.torneo_amici_id
     and p.squadra_id in (i.casa_id, i.ospite_id)
    where i.id = p_incontro_id and p.socio_id = auth.uid()
  ) or exists (
    select 1 from public.tornei_amici_incontri i
    where i.id = p_incontro_id and public.e_creatore_torneo_amici(i.torneo_amici_id)
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.tornei_amici enable row level security;
alter table public.tornei_amici_squadre enable row level security;
alter table public.tornei_amici_partecipanti enable row level security;
alter table public.tornei_amici_incontri enable row level security;

create policy "partecipanti leggono il torneo amici" on public.tornei_amici
  for select to authenticated using (public.e_partecipante_torneo_amici(id));
create policy "un socio crea il proprio torneo amici" on public.tornei_amici
  for insert to authenticated with check (creatore_id = auth.uid());
create policy "creatore modifica il torneo amici" on public.tornei_amici
  for update to authenticated using (creatore_id = auth.uid()) with check (creatore_id = auth.uid());
create policy "creatore elimina il torneo amici" on public.tornei_amici
  for delete to authenticated using (creatore_id = auth.uid());

create policy "partecipanti leggono i partecipanti amici" on public.tornei_amici_partecipanti
  for select to authenticated using (public.e_partecipante_torneo_amici(torneo_amici_id));
create policy "creatore invita amici al torneo" on public.tornei_amici_partecipanti
  for insert to authenticated with check (public.e_creatore_torneo_amici(torneo_amici_id));
create policy "socio risponde al proprio invito torneo" on public.tornei_amici_partecipanti
  for update to authenticated using (socio_id = auth.uid()) with check (socio_id = auth.uid());
create policy "creatore forma le squadre torneo" on public.tornei_amici_partecipanti
  for update to authenticated using (public.e_creatore_torneo_amici(torneo_amici_id)) with check (public.e_creatore_torneo_amici(torneo_amici_id));
create policy "creatore rimuove un partecipante torneo" on public.tornei_amici_partecipanti
  for delete to authenticated using (public.e_creatore_torneo_amici(torneo_amici_id));

create policy "partecipanti leggono le squadre torneo" on public.tornei_amici_squadre
  for select to authenticated using (public.e_partecipante_torneo_amici(torneo_amici_id));
create policy "creatore gestisce le squadre torneo" on public.tornei_amici_squadre
  for all to authenticated using (public.e_creatore_torneo_amici(torneo_amici_id)) with check (public.e_creatore_torneo_amici(torneo_amici_id));

create policy "partecipanti leggono gli incontri torneo" on public.tornei_amici_incontri
  for select to authenticated using (public.e_partecipante_torneo_amici(torneo_amici_id));
create policy "creatore genera gli incontri torneo" on public.tornei_amici_incontri
  for insert to authenticated with check (public.e_creatore_torneo_amici(torneo_amici_id));
create policy "giocatori inseriscono il risultato torneo" on public.tornei_amici_incontri
  for update to authenticated using (public.e_giocatore_incontro_amici(id)) with check (public.e_giocatore_incontro_amici(id));
create policy "creatore elimina gli incontri torneo" on public.tornei_amici_incontri
  for delete to authenticated using (public.e_creatore_torneo_amici(torneo_amici_id));

-- Un giocatore coinvolto in una partita del torneo amici può disdire la
-- prenotazione collegata (non solo chi l'ha creata) — stesso principio della
-- policy "istruttore cancella propri allenamenti" di tappa55.
create policy "giocatore cancella prenotazione incontro amici" on public.prenotazioni
  for delete to authenticated
  using (
    torneo_amici_incontro_id is not null
    and public.e_giocatore_incontro_amici(torneo_amici_incontro_id)
  );

-- ── RPC: prenota una partita del torneo tra amici e vi aggancia i 4 giocatori ──
-- Un socio normale non ha permesso RLS per inserire in partecipanti_amichevole
-- righe di un compagno/avversario: questa funzione fa le due scritture insieme
-- (stesso principio di crea_partecipanti_sfida per i tornei ufficiali).

create or replace function public.prenota_incontro_amici(p_prenotazione uuid, p_incontro_amici_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incontro record;
begin
  if not exists (
    select 1 from public.prenotazioni where id = p_prenotazione and socio_id = auth.uid()
  ) then
    raise exception 'La prenotazione non è tua';
  end if;

  select * into v_incontro from public.tornei_amici_incontri where id = p_incontro_amici_id;
  if v_incontro is null then
    raise exception 'Incontro non trovato';
  end if;

  if not public.e_giocatore_incontro_amici(p_incontro_amici_id) then
    raise exception 'Non fai parte di questa partita';
  end if;

  update public.prenotazioni
  set torneo_amici_incontro_id = p_incontro_amici_id
  where id = p_prenotazione;

  insert into public.partecipanti_amichevole (prenotazione_id, socio_id, confermato)
  select p_prenotazione, p.socio_id, false
  from public.tornei_amici_partecipanti p
  where p.squadra_id in (v_incontro.casa_id, v_incontro.ospite_id)
  on conflict (prenotazione_id, socio_id) do nothing;
end;
$$;

revoke all on function public.prenota_incontro_amici(uuid, uuid) from public;
grant execute on function public.prenota_incontro_amici(uuid, uuid) to authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.tornei_amici;
alter publication supabase_realtime add table public.tornei_amici_squadre;
alter publication supabase_realtime add table public.tornei_amici_partecipanti;
alter publication supabase_realtime add table public.tornei_amici_incontri;
