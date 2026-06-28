-- Fase 11d · Collaboratori: accesso completo alla gestione giocatori
--             e classifica con nominativi reali per tutto lo staff.
--
-- Problema 1: la RLS di `soci` consente la lettura solo della propria riga,
--   quindi i collaboratori non possono usare la tab Giocatori (lista vuota,
--   errori su insert/update al salvataggio o attivazione di un giocatore).
--
-- Problema 2: la classifica_visibile() mostra "Giocatore" per chi non è amico
--   o non ha mostra_in_classifica = true, anche se il viewer è staff.
--
-- Soluzione 1: policy permissive aggiuntive su soci per chi può gestire le
--   prenotazioni (is_admin OR is_allenatore) -- stesso pattern della fase 9.
-- Soluzione 2: riscrittura di classifica_visibile() con controllo viewer staff.

-- ── 1. RLS soci: SELECT per collaboratori ────────────────────────────────────

drop policy if exists "collaboratore legge tutti i soci" on public.soci;
create policy "collaboratore legge tutti i soci"
  on public.soci
  for select
  to authenticated
  using ( public.puo_gestire_prenotazioni() );

-- ── 2. RLS soci: INSERT per collaboratori (iscrizione nuovi giocatori) ────────

drop policy if exists "collaboratore inserisce soci" on public.soci;
create policy "collaboratore inserisce soci"
  on public.soci
  for insert
  to authenticated
  with check ( public.puo_gestire_prenotazioni() );

-- ── 3. RLS soci: UPDATE per collaboratori (attiva/disattiva, blocca saldi) ───

drop policy if exists "collaboratore aggiorna soci" on public.soci;
create policy "collaboratore aggiorna soci"
  on public.soci
  for update
  to authenticated
  using  ( public.puo_gestire_prenotazioni() )
  with check ( public.puo_gestire_prenotazioni() );

-- ── 4. classifica_visibile: nomi reali per tutto lo staff ────────────────────
-- Include istruttori (e_allenatore) oltre ad admin e collaboratori.

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
  viewer as (
    select
      coalesce(is_admin, false)
        or coalesce(is_allenatore, false)
        or coalesce(e_allenatore, false) as is_staff
    from public.soci
    where id = auth.uid()
  ),
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
      and (s.punti_bloccati is null or s.punti_bloccati = false)
      and coalesce(s.punti, 0) >= 1
  )
  select
    r.pos::bigint as posizione,
    case
      when (select is_staff from viewer) then r.nome_completo
      when r.is_me                       then r.nome_completo
      when r.mostra_in_classifica        then r.nome_completo
      when am.amico_id is not null       then r.nome_completo
      else 'Giocatore'
    end           as etichetta,
    r.punti,
    r.is_me
  from ranked r
  left join amici_miei am on am.amico_id = r.id
  order by r.pos, r.nome_completo
$$;
