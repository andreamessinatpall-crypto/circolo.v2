-- Multi-tenant · Fase 8 (nucleo): prenotazioni_giorno filtra per circolo.
--
-- RPC principale della griglia prenotazioni: senza il filtro, un socio che
-- appartiene a più circoli vedrebbe mischiate le prenotazioni di tutti.
-- Aggiunge il parametro p_circolo_id; la vecchia firma a 2 argomenti viene
-- rimossa (l'unico chiamante, usePrenotazioniGiorno, è già stato aggiornato).

drop function if exists public.prenotazioni_giorno(timestamptz, timestamptz);

create or replace function public.prenotazioni_giorno(alba timestamptz, tramonto timestamptz, p_circolo_id uuid)
returns table(
  id uuid, campo_id bigint, socio_id uuid, inizio timestamptz, fine timestamptz,
  etichetta text, incontro_id uuid, allenamento boolean, torneo_id uuid,
  torneo_nome text, giocatori_torneo text
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    p.id,
    p.campo_id::bigint,
    p.socio_id,
    p.inizio,
    p.fine,
    (s.cognome || ' ' || s.nome)::text as etichetta,
    p.incontro_id,
    coalesce(p.allenamento, false),
    p.torneo_id,
    t.nome as torneo_nome,
    case when p.torneo_id is not null then
      (
        select string_agg(sq.nome, ', ' order by sq.id)
        from public.squadre sq
        where sq.torneo_id = p.torneo_id
      )
    else null end as giocatori_torneo
  from public.prenotazioni p
  left join public.soci s on s.id = p.socio_id
  left join public.tornei t on t.id = p.torneo_id
  where p.inizio >= alba
    and p.inizio < tramonto
    and p.circolo_id = p_circolo_id
  order by p.inizio;
$function$;
