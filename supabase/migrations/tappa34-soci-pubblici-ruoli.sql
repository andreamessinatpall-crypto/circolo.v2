-- Tappa 34 · Ruoli nella lista soci pubblici.
--
-- Aggiunge is_admin e is_allenatore al risultato di soci_pubblici()
-- così il frontend può mostrare icone di ruolo nella lista amici
-- (scudo = admin, medaglia = collaboratore, libro = istruttore).
-- Gli admin sono esclusi completamente: non appaiono né negli amici
-- né nel selettore giocatori per le partite.

drop function if exists public.soci_pubblici();
create or replace function public.soci_pubblici()
returns table(
  id            uuid,
  etichetta     text,
  e_allenatore  boolean,
  is_admin      boolean,
  is_allenatore boolean
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
    coalesce(s.is_allenatore, false)    as is_allenatore
  from public.soci s
  where s.attivo is not false
    and (s.is_admin is null or s.is_admin = false)
  order by s.cognome, s.nome;
$$;
