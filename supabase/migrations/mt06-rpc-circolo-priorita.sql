-- Fase 2b (nucleo): le 3 RPC SECURITY DEFINER più usate (soci_pubblici,
-- soci_etichette, classifica_visibile) leggevano da TUTTI i soci della
-- piattaforma, senza alcun filtro per circolo: una perdita di dati reale tra
-- tenant (bypassano le RLS per definizione). Aggiungiamo un overload con
-- p_circolo_id che filtra via join su soci_circoli, senza toccare il
-- significato delle altre colonne restituite (is_admin/is_allenatore/
-- e_allenatore restano i vecchi flag globali: la loro sostituzione col
-- ruolo per-circolo è un problema distinto, tracciato a parte).
--
-- Le vecchie funzioni a zero argomenti NON vengono rimosse qui (il frontend
-- va aggiornato e ridistribuito prima): la rimozione è in una migrazione
-- successiva, dopo aver verificato che nessun chiamante le usi più.
--
-- classifica_visibile coglie anche l'occasione per correggere una lettura
-- rimasta rotta dalla Fase 8 (mt04-impostazioni-per-circolo.sql): leggeva
-- `impostazioni where id = 1`, che dopo la rimozione della singleton-table
-- punta a una riga qualunque (non necessariamente quella del circolo giusto).

create or replace function public.soci_pubblici(p_circolo_id uuid)
returns table(id uuid, etichetta text, e_allenatore boolean, is_admin boolean, is_allenatore boolean, punti integer, sport_preferito text, data_iscrizione date, genere text, account_privato boolean, foto_url text)
language sql stable security definer
set search_path to 'public'
as $function$
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
  join public.soci_circoli sc on sc.socio_id = s.id and sc.circolo_id = p_circolo_id
  where s.attivo is not false
    and coalesce(s.sospeso, false) = false
    and (s.is_admin is null or s.is_admin = false)
  order by s.cognome, s.nome;
$function$;

create or replace function public.soci_etichette(p_circolo_id uuid)
returns table(id uuid, etichetta text)
language sql stable security definer
set search_path to 'public'
as $function$
  select s.id, s.cognome || ' ' || s.nome as etichetta
  from public.soci s
  join public.soci_circoli sc on sc.socio_id = s.id and sc.circolo_id = p_circolo_id;
$function$;

create or replace function public.classifica_visibile(p_circolo_id uuid)
returns table(posizione bigint, etichetta text, punti integer, is_me boolean, foto_url text)
language sql stable security definer
set search_path to 'public'
as $function$
  with amici_miei as (
    select
      case
        when richiedente = auth.uid() then destinatario
        else richiedente
      end as amico_id
    from public.amicizie
    where stato = 'accettata'
      and (richiedente = auth.uid() or destinatario = auth.uid())
  ),
  livelli_cfg as (
    select coalesce(
      (select livelli_punti from public.impostazioni where circolo_id = p_circolo_id),
      '[{"nome":"Esordiente","soglia":0},{"nome":"Promessa","soglia":100},{"nome":"Atleta","soglia":300},{"nome":"Veterano","soglia":700},{"nome":"Leggenda","soglia":1500},{"nome":"Campione","soglia":3000}]'::jsonb
    ) as cfg
  ),
  livelli as (
    select
      (elem->>'nome')::text    as nome,
      (elem->>'soglia')::integer as soglia
    from livelli_cfg, jsonb_array_elements(cfg) as elem
  ),
  ranked as (
    select
      rank() over (order by s.punti desc nulls last) as pos,
      s.id,
      s.cognome || ' ' || s.nome                    as nome_completo,
      s.punti,
      s.mostra_in_classifica,
      s.foto_url,
      (s.id = auth.uid())                           as is_me
    from public.soci s
    join public.soci_circoli sc on sc.socio_id = s.id and sc.circolo_id = p_circolo_id
    where s.attivo is not false
      and coalesce(s.sospeso, false) = false
      and (s.e_allenatore is null or s.e_allenatore = false)
      and (s.punti_bloccati is null or s.punti_bloccati = false)
      and coalesce(s.punti, 0) >= 1
      and (s.id = auth.uid() or coalesce(s.account_privato, false) = false)
  )
  select
    r.pos::bigint as posizione,
    case
      when r.is_me                 then r.nome_completo
      when r.mostra_in_classifica  then r.nome_completo
      when am.amico_id is not null then r.nome_completo
      else (select nome from livelli where soglia <= coalesce(r.punti,0) order by soglia desc limit 1)
    end           as etichetta,
    r.punti,
    r.is_me,
    case
      when r.is_me                 then r.foto_url
      when r.mostra_in_classifica  then r.foto_url
      when am.amico_id is not null then r.foto_url
      else null
    end           as foto_url
  from ranked r
  left join amici_miei am on am.amico_id = r.id
  order by r.pos, r.nome_completo
$function$;
