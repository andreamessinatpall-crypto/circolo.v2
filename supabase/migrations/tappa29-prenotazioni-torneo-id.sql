-- Tappa 29: aggiunge torneo_id e torneo_nome a prenotazioni_giorno.
-- Serve per distinguere gli slot americano (torneo_id) dai semplici incontri
-- (incontro_id) nella griglia del calendario.
-- DROP necessario perché cambia la firma dei parametri OUT.

drop function if exists public.prenotazioni_giorno(timestamptz, timestamptz);

create function public.prenotazioni_giorno(
  alba      timestamptz,
  tramonto  timestamptz
)
returns table(
  id           uuid,
  campo_id     bigint,
  socio_id     uuid,
  inizio       timestamptz,
  fine         timestamptz,
  etichetta    text,
  incontro_id  uuid,
  allenamento  boolean,
  torneo_id    uuid,
  torneo_nome  text
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
    t.nome as torneo_nome
  from public.prenotazioni p
  left join public.soci s on s.id = p.socio_id
  left join public.tornei t on t.id = p.torneo_id
  where p.inizio >= alba
    and p.inizio < tramonto
  order by p.inizio;
$$;
