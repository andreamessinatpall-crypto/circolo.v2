-- Tappa 68 · Verifica comportamento utenti sospesi/cancellati:
--
-- 1. BUG: classifica_visibile() filtrava solo gli account cancellati
--    (attivo is not false) ma non quelli sospesi, quindi un giocatore
--    sospeso continuava a comparire nella classifica del club.
--
-- 2. GAP: soci_pubblici() esclude (giustamente) sospesi e cancellati, ma è
--    anche l'unica fonte usata per risolvere id → nome nello storico delle
--    prenotazioni (Le mie amichevoli, Attività in programma, Prenotazioni
--    in segreteria): un giocatore già presente in una prenotazione passata
--    perdeva il proprio nome (sostituito da "Giocatore"/"Socio") non appena
--    veniva sospeso o cancellato, anche se la cancellazione anonimizza i
--    dati personali lasciando apposta nome/cognome leggibili nello storico.
--    Aggiunta soci_etichette(): id + nome per TUTTI i soci (anche sospesi e
--    cancellati), usata solo per la visualizzazione dello storico — la
--    selezione di nuovi giocatori resta su soci_pubblici(), che li esclude.

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
      and coalesce(s.sospeso, false) = false
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

create or replace function public.soci_etichette()
returns table(id uuid, etichetta text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.cognome || ' ' || s.nome as etichetta
  from public.soci s;
$$;
