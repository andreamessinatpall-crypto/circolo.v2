-- Aggiunge foto_url a classifica_visibile(), per mostrare l'avatar (foto o
-- iniziali) al posto della medaglia podio nella classifica del club.
-- Stessa logica di visibilità già usata per il nome: se il nickname è
-- offuscato (non amico, non "mostra in classifica"), niente foto neanche.
drop function if exists public.classifica_visibile();

create or replace function public.classifica_visibile()
returns table(posizione bigint, etichetta text, punti integer, is_me boolean, foto_url text)
language sql
stable security definer
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
      (select livelli_punti from public.impostazioni where id = 1),
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
