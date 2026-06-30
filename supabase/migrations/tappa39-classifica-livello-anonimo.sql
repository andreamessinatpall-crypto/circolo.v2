-- Tappa 39 · Classifica: mostra il livello invece di "Giocatore"
--
-- Per i soci con mostra_in_classifica = false (non visibili per nome),
-- l'etichetta diventa il nome del livello raggiunto ("Esordiente", "Promessa"…)
-- letto da impostazioni.livelli_punti — la stessa fonte usata dai profili —
-- così nome e soglie sono sempre allineati. I punti erano già visibili a tutti.

drop function if exists public.classifica_visibile();
create or replace function public.classifica_visibile()
returns table(
  posizione bigint,
  etichetta text,
  punti     integer,
  is_me     boolean
)
language sql
stable
security definer
set search_path = public
as $$
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
      (s.id = auth.uid())                           as is_me
    from public.soci s
    where s.attivo is not false
      and (s.e_allenatore is null or s.e_allenatore = false)
      and (s.punti_bloccati is null or s.punti_bloccati = false)
      and coalesce(s.punti, 0) >= 1
  )
  select
    r.pos::bigint as posizione,
    case
      when r.is_me                 then r.nome_completo
      when r.mostra_in_classifica  then r.nome_completo
      when am.amico_id is not null then r.nome_completo
      else (
        select nome
        from livelli
        where soglia <= coalesce(r.punti, 0)
        order by soglia desc
        limit 1
      )
    end           as etichetta,
    r.punti,
    r.is_me
  from ranked r
  left join amici_miei am on am.amico_id = r.id
  order by r.pos, r.nome_completo
$$;
