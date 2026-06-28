-- Tappa 30: aggiunge giocatori_torneo a prenotazioni_giorno.
-- Per gli slot americano, elenca i nominativi degli iscritti nel pannello prenotazioni,
-- così ogni aggiunta/rimozione di giocatori si riflette automaticamente sul calendario.

drop function if exists public.prenotazioni_giorno(timestamptz, timestamptz);

create function public.prenotazioni_giorno(
  alba      timestamptz,
  tramonto  timestamptz
)
returns table(
  id               uuid,
  campo_id         bigint,
  socio_id         uuid,
  inizio           timestamptz,
  fine             timestamptz,
  etichetta        text,
  incontro_id      uuid,
  allenamento      boolean,
  torneo_id        uuid,
  torneo_nome      text,
  giocatori_torneo text
)
language sql
stable
security definer
set search_path = public
as $$
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
  order by p.inizio;
$$;
