-- Numero massimo di squadre iscrivibili a un torneo in programma.
alter table public.tornei
  add column if not exists max_squadre integer;

-- ── RPC: iscrizione diretta dal giocatore ──────────────────────────────────
-- Crea una squadra e aggiunge i componenti senza passare per la conferma admin.
-- Chiamata da un utente autenticato; bypassa RLS su squadre/squadra_componenti.

create or replace function public.iscriviti_torneo(
  p_torneo_id  uuid,
  p_componenti uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_torneo    tornei%rowtype;
  v_count     integer;
  v_squadra   uuid;
  i           integer;
begin
  -- Verifica che il torneo esista ed è in_programma (lock per evitare race).
  select * into v_torneo from tornei where id = p_torneo_id for update;
  if not found then
    raise exception 'Torneo non trovato';
  end if;
  if v_torneo.stato != 'in_programma' then
    raise exception 'Le iscrizioni non sono aperte per questo torneo';
  end if;

  -- L'utente non deve essere già iscritto.
  if exists (
    select 1 from squadra_componenti sc
    join squadre s on s.id = sc.squadra_id
    where s.torneo_id = p_torneo_id
      and sc.socio_id = auth.uid()
  ) then
    raise exception 'Sei già iscritto a questo torneo';
  end if;

  -- Verifica capienza massima.
  if v_torneo.max_squadre is not null then
    select count(*) into v_count from squadre where torneo_id = p_torneo_id;
    if v_count >= v_torneo.max_squadre then
      raise exception 'Iscrizioni chiuse: numero massimo di squadre raggiunto';
    end if;
  end if;

  -- Crea la squadra con nome provvisorio.
  insert into squadre (torneo_id, nome)
  values (p_torneo_id, 'Nuova squadra')
  returning id into v_squadra;

  -- Inserisci il richiedente come titolare (indice 0).
  insert into squadra_componenti (squadra_id, socio_id, torneo_id, riserva)
  values (v_squadra, auth.uid(), p_torneo_id, false);

  -- Inserisci i compagni: titolare se i=1, riserva se i>=2.
  if p_componenti is not null and array_length(p_componenti, 1) > 0 then
    for i in 1..array_length(p_componenti, 1) loop
      insert into squadra_componenti (squadra_id, socio_id, torneo_id, riserva)
      values (v_squadra, p_componenti[i], p_torneo_id, i >= 2)
      on conflict do nothing;
    end loop;
  end if;

  return v_squadra;
end;
$$;

-- ── RPC: disdici iscrizione ────────────────────────────────────────────────

create or replace function public.disdici_torneo(
  p_torneo_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_squadra uuid;
begin
  -- Trova la squadra dell'utente in questo torneo.
  select sc.squadra_id into v_squadra
  from squadra_componenti sc
  join squadre s on s.id = sc.squadra_id
  where s.torneo_id = p_torneo_id
    and sc.socio_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'Non sei iscritto a questo torneo';
  end if;

  -- Solo se il torneo è ancora in_programma.
  if not exists (
    select 1 from tornei where id = p_torneo_id and stato = 'in_programma'
  ) then
    raise exception 'Non puoi disdire dopo l''inizio del torneo';
  end if;

  -- Elimina squadra (in cascade elimina squadra_componenti).
  delete from squadre where id = v_squadra;
end;
$$;
