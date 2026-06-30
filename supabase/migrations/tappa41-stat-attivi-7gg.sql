-- Tappa 41 · Statistiche giocatori — attivi ultimi 7 giorni
--
-- Aggiunge attiviUltimi7 alla funzione stat_giocatori(),
-- usando lo stesso pattern di attiviUltimi30.

create or replace function public.stat_giocatori()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with
  attivi as (
    select id, sport_preferito, is_admin, is_allenatore, e_allenatore, created_at
    from public.soci
    where attivo = true
  ),
  attivi_30 as (
    select distinct pa.socio_id
    from public.partecipanti_amichevole pa
    join public.prenotazioni pr on pr.id = pa.prenotazione_id
    where pr.inizio >= (current_date - interval '30 days')::timestamptz
  ),
  attivi_7 as (
    select distinct pa.socio_id
    from public.partecipanti_amichevole pa
    join public.prenotazioni pr on pr.id = pa.prenotazione_id
    where pr.inizio >= (current_date - interval '7 days')::timestamptz
  )
  select json_build_object(
    'totale',         (select count(*) from attivi),
    'nuoviMese',      (select count(*) from attivi where created_at >= date_trunc('month', now())),
    'attiviUltimi30', (select count(*) from attivi a join attivi_30 x on x.socio_id = a.id),
    'attiviUltimi7',  (select count(*) from attivi a join attivi_7  x on x.socio_id = a.id),
    'padel',          (select count(*) from attivi where sport_preferito = 'padel'),
    'calcio',         (select count(*) from attivi where sport_preferito = 'calcio'),
    'entrambi',       (select count(*) from attivi where sport_preferito is null
                                                      or sport_preferito not in ('padel','calcio')),
    'staff',          (select count(*) from attivi where is_admin or is_allenatore or e_allenatore),
    'adminCount',     (select count(*) from attivi where is_admin),
    'collaboratori',  (select count(*) from attivi where is_allenatore and not is_admin),
    'istruttori',     (select count(*) from attivi where e_allenatore and not is_allenatore and not is_admin),
    'giocatori',      (select count(*) from attivi where not is_admin and not is_allenatore and not e_allenatore)
  );
$$;
