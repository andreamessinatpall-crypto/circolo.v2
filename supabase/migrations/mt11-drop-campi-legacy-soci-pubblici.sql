-- Fase 9c (coda): deploy del frontend aggiornato (commit d29ff53) confermato
-- live su Cloudflare Pages. Rimossi da soci_pubblici i vecchi campi
-- e_allenatore/is_admin/is_allenatore, ormai sostituiti da ruolo/
-- puo_dare_lezioni (già gli unici letti dal frontend). Stesso pattern
-- già usato in mt06->mt07 e mt08->mt09.
DROP FUNCTION IF EXISTS public.soci_pubblici(uuid);
CREATE FUNCTION public.soci_pubblici(p_circolo_id uuid)
 RETURNS TABLE(
   id uuid, etichetta text,
   ruolo text, puo_dare_lezioni boolean,
   punti integer, sport_preferito text, data_iscrizione date,
   genere text, account_privato boolean, foto_url text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    s.id,
    s.cognome || ' ' || s.nome          as etichetta,
    sc.ruolo                            as ruolo,
    coalesce(sc.puo_dare_lezioni,false) as puo_dare_lezioni,
    coalesce(s.punti, 0)                as punti,
    s.sport_preferito                   as sport_preferito,
    s.data_iscrizione::date             as data_iscrizione,
    s.genere                            as genere,
    coalesce(s.account_privato, false)  as account_privato,
    s.foto_url                          as foto_url
  from public.soci s
  join public.soci_circoli sc on sc.socio_id = s.id and sc.circolo_id = p_circolo_id
  where s.attivo is not false
    and coalesce(s.sospeso, false) = false
    and sc.ruolo <> 'gestore'
  order by s.cognome, s.nome;
$function$;
