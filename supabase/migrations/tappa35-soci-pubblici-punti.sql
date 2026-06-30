-- Tappa 35 · Punti e sport in soci_pubblici()
-- Aggiunge punti e sport_preferito così il frontend può mostrare
-- livello, sport e mini-classifica nella pagina amici.

drop function if exists public.soci_pubblici();
create or replace function public.soci_pubblici()
returns table(
  id              uuid,
  etichetta       text,
  e_allenatore    boolean,
  is_admin        boolean,
  is_allenatore   boolean,
  punti           integer,
  sport_preferito text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.cognome || ' ' || s.nome          as etichetta,
    coalesce(s.e_allenatore,  false)    as e_allenatore,
    coalesce(s.is_admin,      false)    as is_admin,
    coalesce(s.is_allenatore, false)    as is_allenatore,
    coalesce(s.punti, 0)                as punti,
    s.sport_preferito                   as sport_preferito
  from public.soci s
  where s.attivo is not false
    and (s.is_admin is null or s.is_admin = false)
  order by s.cognome, s.nome;
$$;
