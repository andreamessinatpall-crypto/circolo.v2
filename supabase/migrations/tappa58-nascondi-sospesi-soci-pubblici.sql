-- I giocatori sospesi da admin/collaboratori non devono comparire ai soci
-- normali (amici, ricerca amici, staff del club) — solo l'account cancellato
-- era già escluso da soci_pubblici(). L'admin/segreteria continua a vederli
-- comunque: quella pagina legge direttamente da "soci", non da questa RPC.

create or replace function public.soci_pubblici()
returns table(id uuid, etichetta text, e_allenatore boolean, is_admin boolean, is_allenatore boolean, punti integer, sport_preferito text, data_iscrizione date)
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
    s.sport_preferito                   as sport_preferito,
    s.data_iscrizione::date             as data_iscrizione
  from public.soci s
  where s.attivo is not false
    and coalesce(s.sospeso, false) = false
    and (s.is_admin is null or s.is_admin = false)
  order by s.cognome, s.nome;
$$;
