-- Fase F (Impostazioni → Privacy): account privato. Nasconde il socio dalla
-- classifica, dalla lista "Giocatori del circolo" e dalla ricerca "Aggiungi
-- amico", e blocca le NUOVE richieste di amicizia verso di lui. Le amicizie
-- già esistenti (e le chat che ne derivano) NON vengono toccate: restano
-- visibili a chi era già amico prima di attivare la privacy — solo la
-- scoperta futura viene bloccata. Prenotazioni/lezioni restano invariate.

alter table public.soci add column if not exists account_privato boolean not null default false;

-- soci_pubblici(): stesso pattern con cui è stata estesa più volte (genere,
-- data_iscrizione...) — aggiunge solo la colonna, il filtro vero e proprio
-- si fa lato client nei punti di "scoperta" (Giocatori, Aggiungi amico), non
-- qui dentro: altrimenti un amico esistente il cui account diventa privato
-- sparirebbe anche dalla lista amici di chi lo aveva già aggiunto.
-- drop necessario (come già fatto in tappa61) perché cambia la tabella di
-- ritorno: "create or replace" da solo non basta quando cambiano le colonne.
drop function if exists public.soci_pubblici();

create or replace function public.soci_pubblici()
returns table(
  id uuid, etichetta text, e_allenatore boolean, is_admin boolean,
  is_allenatore boolean, punti integer, sport_preferito text,
  data_iscrizione date, genere text, account_privato boolean
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
    coalesce(s.account_privato, false)  as account_privato
  from public.soci s
  where s.attivo is not false
    and coalesce(s.sospeso, false) = false
    and (s.is_admin is null or s.is_admin = false)
  order by s.cognome, s.nome;
$$;

-- classifica_visibile(): un account privato non compare proprio (non solo
-- col nome mascherato), stesso comportamento su cui si basa già la funzione
-- per attivo/sospeso/punti_bloccati.
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
    r.is_me
  from ranked r
  left join amici_miei am on am.amico_id = r.id
  order by r.pos, r.nome_completo
$$;

-- Blocca le nuove richieste di amicizia verso un account privato. Policy
-- RESTRICTIVE (non replace di quella esistente, che non è tracciata in
-- migration): si somma in AND a qualunque policy INSERT già presente,
-- senza rischio di indebolirla per errore.
drop policy if exists "amicizie blocca richieste verso privati" on public.amicizie;
create policy "amicizie blocca richieste verso privati"
  on public.amicizie
  as restrictive
  for insert
  to authenticated
  with check (
    not exists (
      select 1 from public.soci
      where id = destinatario and coalesce(account_privato, false) = true
    )
  );
