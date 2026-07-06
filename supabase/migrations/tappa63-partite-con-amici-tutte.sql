-- Tappa 63 · "N partite giocate insieme" nella tab Amici contava solo le
-- partite di torneo (squadra_componenti/incontri), quasi sempre zero perché
-- la maggior parte delle partite tra amici sono prenotazioni normali
-- (amichevoli), non tornei ufficiali. Ora conta qualunque prenotazione
-- passata con entrambi tra i partecipanti (partecipanti_amichevole), incluse
-- quelle agganciate a un torneo, escludendo solo gli allenamenti.

create or replace function public.partite_con_amici(p_me uuid)
returns table(amico_id uuid, n_partite bigint)
language sql
stable
security definer
set search_path = public
as $$
  select pa2.socio_id as amico_id,
         count(distinct pa1.prenotazione_id)::bigint as n_partite
  from partecipanti_amichevole pa1
  join prenotazioni pr on pr.id = pa1.prenotazione_id
  join partecipanti_amichevole pa2
    on pa2.prenotazione_id = pa1.prenotazione_id
   and pa2.socio_id is not null
   and pa2.socio_id <> p_me
  where pa1.socio_id = p_me
    and coalesce(pr.allenamento, false) = false
    and pr.fine < now()
  group by pa2.socio_id
$$;
