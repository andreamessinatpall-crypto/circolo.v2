-- Ultime partite giocate insieme a un amico specifico (scheda dettaglio
-- amico in AmiciProfilo.tsx). Sicura perché limitata alle partite a cui
-- l'utente stesso ha partecipato (auth.uid()) — nessun dato nuovo esposto
-- rispetto a quanto l'utente già vede nel proprio storico attività.
create or replace function public.partite_con_amico_dettaglio(p_amico uuid, p_limite integer default 5)
returns table(
  prenotazione_id text,
  inizio timestamptz,
  fine timestamptz,
  campo_nome text,
  sport text,
  risultato text,
  risultato_dettaglio jsonb
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    pr.id::text as prenotazione_id,
    pr.inizio, pr.fine,
    c.nome as campo_nome, c.sport as sport,
    pr.risultato, pr.risultato_dettaglio
  from prenotazioni pr
  join campi c on c.id = pr.campo_id
  where coalesce(pr.allenamento, false) = false
    and pr.torneo_id is null
    and pr.incontro_id is null
    and pr.inizio <= now()
    and pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = auth.uid() and confermato = true)
    and pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = p_amico and confermato = true)
  order by pr.inizio desc
  limit p_limite
$function$;
