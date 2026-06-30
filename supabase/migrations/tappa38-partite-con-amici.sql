-- Tappa 38 · Conta le partite di torneo giocate con ciascun co-giocatore.
-- Usata dalla pagina Amici per mostrare "N partite giocate insieme".
-- Considera sia avversari che compagni di squadra negli incontri con risultato.

create or replace function public.partite_con_amici(p_me uuid)
returns table(amico_id uuid, n_partite bigint)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- Squadre in cui ha giocato il chiamante
  me_sq as (
    select squadra_id, torneo_id
    from public.squadra_componenti
    where socio_id = p_me
  ),
  -- Incontri con risultato a cui ha partecipato il chiamante
  miei_inc as (
    select
      i.id,
      i.torneo_id,
      case when ms.squadra_id = i.casa_id then i.ospite_id else i.casa_id end as altra_sq,
      ms.squadra_id as mia_sq
    from public.incontri i
    join me_sq ms
      on ms.torneo_id = i.torneo_id
     and (ms.squadra_id = i.casa_id or ms.squadra_id = i.ospite_id)
    where i.punti_casa is not null
       or i.punti_ospite is not null
  ),
  -- Co-giocatori: avversari e compagni di squadra
  co_giocatori as (
    select mi.id as inc_id, sc.socio_id
    from miei_inc mi
    join public.squadra_componenti sc
      on sc.torneo_id = mi.torneo_id
     and sc.squadra_id = mi.altra_sq
    where sc.socio_id is not null and sc.socio_id <> p_me
    union all
    select mi.id as inc_id, sc.socio_id
    from miei_inc mi
    join public.squadra_componenti sc
      on sc.torneo_id = mi.torneo_id
     and sc.squadra_id = mi.mia_sq
    where sc.socio_id is not null and sc.socio_id <> p_me
  )
  select cg.socio_id::uuid as amico_id,
         count(distinct cg.inc_id)::bigint as n_partite
  from co_giocatori cg
  group by cg.socio_id
$$;
