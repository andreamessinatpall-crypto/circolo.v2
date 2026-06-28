-- Fase 11c · Statistiche giocatori accessibili ai collaboratori.
--
-- Problema: la RLS su `soci` consente a ciascun utente di leggere solo la
-- propria riga. Quando un collaboratore (is_allenatore) apre la pagina
-- Statistiche, la query diretta a `soci` restituisce un solo record e la
-- sezione "Giocatori" appare vuota o errata.
--
-- Soluzione: una funzione SECURITY DEFINER (stesso pattern di istruttori_attivi)
-- che calcola i conteggi aggregati necessari e li restituisce come JSON.
-- Non espone dati personali individuali, solo conteggi.

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
  )
  select json_build_object(
    'totale',        (select count(*)  from attivi),
    'nuoviMese',     (select count(*)  from attivi where created_at >= date_trunc('month', now())),
    'attiviUltimi30',(select count(*)  from attivi a join attivi_30 x on x.socio_id = a.id),
    'padel',         (select count(*)  from attivi where sport_preferito = 'padel'),
    'calcio',        (select count(*)  from attivi where sport_preferito = 'calcio'),
    'entrambi',      (select count(*)  from attivi where sport_preferito is null
                                                      or sport_preferito not in ('padel','calcio')),
    'staff',         (select count(*)  from attivi where is_admin or is_allenatore or e_allenatore),
    'adminCount',    (select count(*)  from attivi where is_admin),
    'collaboratori', (select count(*)  from attivi where is_allenatore and not is_admin),
    'istruttori',    (select count(*)  from attivi where e_allenatore and not is_allenatore and not is_admin),
    'giocatori',     (select count(*)  from attivi where not is_admin and not is_allenatore and not e_allenatore)
  );
$$;
