-- Tappa 37 · Istruttori: gestione partecipanti + nomi visibili in classifica
--
-- Problema 1: gli istruttori (e_allenatore = true) ricevono errore 42501
--   quando aggiungono un giocatore ai propri allenamenti, perché
--   puo_gestire_prenotazioni() controlla solo is_admin e is_allenatore.
--
-- Problema 2: classifica_visibile() mostra "Giocatore" per chiunque
--   non sia amico del visitatore; gli istruttori, non essendo amici di
--   nessun giocatore, vedono quasi tutta la classifica anonimizzata.
--
-- Soluzione 1: nuove policy permissive per e_allenatore su
--   partecipanti_amichevole, limitate alle prenotazioni di cui è allenatore.
--
-- Soluzione 2: riscrittura di classifica_visibile() che mostra il nome reale
--   anche quando chi guarda è admin, collaboratore o istruttore.

-- ─── 1. Policy istruttori su partecipanti_amichevole ──────────────────────

-- SELECT: vede i partecipanti dei propri allenamenti
drop policy if exists "istruttore vede propri partecipanti" on public.partecipanti_amichevole;
create policy "istruttore vede propri partecipanti"
  on public.partecipanti_amichevole
  for select
  to authenticated
  using (
    exists (
      select 1 from public.prenotazioni p
      join public.soci s on s.id = auth.uid() and coalesce(s.e_allenatore, false) = true
      where p.id = prenotazione_id
        and p.allenatore_id = auth.uid()
    )
  );

-- INSERT: aggiunge qualsiasi giocatore ai propri allenamenti
drop policy if exists "istruttore aggiunge ai propri allenamenti" on public.partecipanti_amichevole;
create policy "istruttore aggiunge ai propri allenamenti"
  on public.partecipanti_amichevole
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.prenotazioni p
      join public.soci s on s.id = auth.uid() and coalesce(s.e_allenatore, false) = true
      where p.id = prenotazione_id
        and p.allenatore_id = auth.uid()
    )
  );

-- UPDATE: modifica presenza nei propri allenamenti
drop policy if exists "istruttore aggiorna propri partecipanti" on public.partecipanti_amichevole;
create policy "istruttore aggiorna propri partecipanti"
  on public.partecipanti_amichevole
  for update
  to authenticated
  using (
    exists (
      select 1 from public.prenotazioni p
      join public.soci s on s.id = auth.uid() and coalesce(s.e_allenatore, false) = true
      where p.id = prenotazione_id
        and p.allenatore_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.prenotazioni p
      join public.soci s on s.id = auth.uid() and coalesce(s.e_allenatore, false) = true
      where p.id = prenotazione_id
        and p.allenatore_id = auth.uid()
    )
  );

-- DELETE: rimuove partecipanti dai propri allenamenti
drop policy if exists "istruttore rimuove propri partecipanti" on public.partecipanti_amichevole;
create policy "istruttore rimuove propri partecipanti"
  on public.partecipanti_amichevole
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.prenotazioni p
      join public.soci s on s.id = auth.uid() and coalesce(s.e_allenatore, false) = true
      where p.id = prenotazione_id
        and p.allenatore_id = auth.uid()
    )
  );

-- ─── 2. classifica_visibile(): nomi visibili a tutto lo staff ─────────────
drop function if exists public.classifica_visibile();
create or replace function public.classifica_visibile()
returns table(
  posizione bigint,
  etichetta text,
  punti     integer,
  is_me     boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- Chi sta guardando la classifica?
  chiamante as (
    select
      coalesce(is_admin,      false) as is_admin,
      coalesce(is_allenatore, false) as is_allenatore,
      coalesce(e_allenatore,  false) as e_allenatore
    from public.soci
    where id = auth.uid()
  ),
  -- Amici del chiamante (per giocatori normali)
  amici_miei as (
    select
      case
        when richiedente = auth.uid() then destinatario
        else richiedente
      end as amico_id
    from public.amicizie
    where stato = 'accettata'
      and (richiedente = auth.uid() or destinatario = auth.uid())
  ),
  ranked as (
    select
      rank() over (order by s.punti desc nulls last) as pos,
      s.id,
      s.cognome || ' ' || s.nome                    as nome_completo,
      s.punti,
      s.mostra_in_classifica,
      (s.id = auth.uid())                           as is_me
    from public.soci s
    where s.attivo is not false
      and (s.e_allenatore is null or s.e_allenatore = false)
      and (s.punti_bloccati is null or s.punti_bloccati = false)
      and coalesce(s.punti, 0) >= 1
  )
  select
    r.pos::bigint as posizione,
    case
      when r.is_me                then r.nome_completo  -- sempre se stesso
      when r.mostra_in_classifica then r.nome_completo  -- ha acconsentito
      when am.amico_id is not null then r.nome_completo  -- è un amico
      when c.is_admin             then r.nome_completo  -- admin vede tutto
      when c.is_allenatore        then r.nome_completo  -- collaboratore vede tutto
      when c.e_allenatore         then r.nome_completo  -- istruttore vede tutto
      else 'Giocatore'
    end           as etichetta,
    r.punti,
    r.is_me
  from ranked r
  cross join chiamante c
  left join amici_miei am on am.amico_id = r.id
  order by r.pos, r.nome_completo
$$;
