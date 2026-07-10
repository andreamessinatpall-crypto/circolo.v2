-- Area Club: le mini-card di Amici/Staff nella griglia di anteprima devono
-- mostrare la foto profilo, non ancora esposta da soci_pubblici(). Stesso
-- pattern di estensione già usato più volte (genere, account_privato...).
drop function if exists public.soci_pubblici();

create or replace function public.soci_pubblici()
returns table(
  id uuid, etichetta text, e_allenatore boolean, is_admin boolean,
  is_allenatore boolean, punti integer, sport_preferito text,
  data_iscrizione date, genere text, account_privato boolean, foto_url text
)
language sql stable security definer set search_path = public
as $$
  select
    s.id,
    s.cognome || ' ' || s.nome          as etichetta,
    coalesce(s.e_allenatore,  false)    as e_allenatore,
    coalesce(s.is_admin,      false)    as is_admin,
    coalesce(s.is_allenatore, false)    as is_allenatore,
    coalesce(s.punti, 0)                as punti,
    s.sport_preferito                   as sport_preferito,
    s.data_iscrizione::date             as data_iscrizione,
    s.genere                            as genere,
    coalesce(s.account_privato, false)  as account_privato,
    s.foto_url                          as foto_url
  from public.soci s
  where s.attivo is not false
    and coalesce(s.sospeso, false) = false
    and (s.is_admin is null or s.is_admin = false)
  order by s.cognome, s.nome;
$$;
