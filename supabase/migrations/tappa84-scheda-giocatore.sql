-- Scheda giocatore (DettaglioAmicoModal): oggi si vedono solo i dati propri
-- (RLS "socio_id = auth.uid()" su preferenze_giocatore, e partite_con_amico_
-- dettaglio è limitata alle partite condivise col chiamante). Per mostrare
-- attività totali, preferenze e ultimi risultati di UN ALTRO socio nella
-- scheda servono RPC security definer, tutte protette dallo stesso guard:
-- il chiamante deve essere amico del socio richiesto (o essere lui stesso),
-- riusando sono_amici() già esistente (tappa45-messaggi-chat.sql).

create or replace function public.partite_totali_socio(p_socio uuid)
returns bigint
language sql
stable security definer
set search_path = public
as $function$
  select case
    when p_socio = auth.uid() or public.sono_amici(auth.uid(), p_socio) then (
      select count(distinct pa.prenotazione_id)
      from partecipanti_amichevole pa
      join prenotazioni pr on pr.id = pa.prenotazione_id
      where pa.socio_id = p_socio
        and coalesce(pr.allenamento, false) = false
        and pr.fine < now()
    )
    else 0
  end
$function$;

create or replace function public.preferenze_amico(p_socio uuid)
returns table(
  sport text,
  mano_piede_preferito text,
  posizione text,
  orario_preferito text,
  giorni_preferiti text[]
)
language sql
stable security definer
set search_path = public
as $function$
  select pg.sport, pg.mano_piede_preferito, pg.posizione, pg.orario_preferito, pg.giorni_preferiti
  from preferenze_giocatore pg
  where pg.socio_id = p_socio
    and (p_socio = auth.uid() or public.sono_amici(auth.uid(), p_socio))
$function$;

create or replace function public.ultimi_risultati_socio(p_socio uuid, p_sport text, p_limite integer default 5)
returns table(
  prenotazione_id text,
  inizio timestamptz,
  fine timestamptz,
  campo_nome text,
  risultato_dettaglio jsonb
)
language sql
stable security definer
set search_path = public
as $function$
  select pr.id::text as prenotazione_id,
         pr.inizio, pr.fine,
         c.nome as campo_nome,
         pr.risultato_dettaglio
  from prenotazioni pr
  join campi c on c.id = pr.campo_id
  where (p_socio = auth.uid() or public.sono_amici(auth.uid(), p_socio))
    and coalesce(pr.allenamento, false) = false
    and pr.torneo_id is null
    and pr.incontro_id is null
    and pr.inizio <= now()
    and c.sport = p_sport
    and pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = p_socio and confermato = true)
  order by pr.inizio desc
  limit p_limite
$function$;
