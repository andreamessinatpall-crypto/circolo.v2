-- Fase 2b (coda): sistema le RPC rimaste dopo il nucleo (mt06/mt07).
-- Due categorie di problemi trovati leggendo le definizioni live:
--
-- 1) Permessi ancora legati ai flag globali is_admin/is_allenatore/e_allenatore
--    (o alla vecchia e_admin() zero-arg / e_staff()), superati dal ruolo
--    per-circolo in soci_circoli dalla Fase 9b. Sostituiti con
--    puo_gestire_socio(p_socio) / puo_gestire(circolo_id), dedotto dalla riga
--    coinvolta quando la RPC non riceve un circolo esplicito.
-- 2) RPC che restituiscono/aggregano dati SENZA alcun filtro per circolo
--    (istruttori_attivi, premi_popolarita, stat_giocatori, partite_in_programma,
--    partite_concluse) — stesso tipo di leak già corretto per soci_pubblici/
--    soci_etichette/classifica_visibile nel nucleo. Qui aggiungiamo un nuovo
--    overload con p_circolo_id (le vecchie firme restano finché il frontend
--    non è confermato in produzione, poi verranno rimosse in mt09).
--
-- Bug indipendente trovato per strada: riscatta_premio leggeva ancora
-- `impostazioni where id = 1`, la singleton-table rimossa in mt04 — da quel
-- momento la RPC restituiva sempre "premi non attivi", per qualsiasi circolo.

-- ─────────────────────────────────────────────────────────────────────────
-- Gruppo A: stessa firma, fix di permessi/bug (CREATE OR REPLACE pulito)
-- ─────────────────────────────────────────────────────────────────────────

-- accetta_richiesta_lezione: mancava circolo_id sull'insert in prenotazioni
-- (finiva silenziosamente nel circolo di bootstrap, stesso bug-pattern già
-- visto in GestionePrenotazioni/tornei durante la Fase 8/8b).
CREATE OR REPLACE FUNCTION public.accetta_richiesta_lezione(p_richiesta_id bigint, p_campo_id integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_richiesta record;
  v_prenotazione_id uuid;
begin
  select * into v_richiesta from public.richieste_lezione where id = p_richiesta_id for update;

  if v_richiesta is null then
    raise exception 'Richiesta non trovata';
  end if;

  if v_richiesta.istruttore_id <> auth.uid() then
    raise exception 'Non autorizzato';
  end if;

  if v_richiesta.stato <> 'in_attesa' then
    raise exception 'Richiesta già gestita';
  end if;

  insert into public.prenotazioni (campo_id, socio_id, inizio, fine, allenamento, allenatore_id, circolo_id)
  values (p_campo_id, v_richiesta.socio_id, v_richiesta.inizio, v_richiesta.fine, true, v_richiesta.istruttore_id, v_richiesta.circolo_id)
  returning id into v_prenotazione_id;

  insert into public.partecipanti_amichevole (prenotazione_id, socio_id, confermato)
  values (v_prenotazione_id, v_richiesta.socio_id, false);

  update public.richieste_lezione
  set stato = 'accettata', prenotazione_id = v_prenotazione_id
  where id = p_richiesta_id;

  return v_prenotazione_id;
end;
$function$;

-- aggiorna_stato_richiesta: is_admin globale -> puo_gestire(circolo della richiesta)
CREATE OR REPLACE FUNCTION public.aggiorna_stato_richiesta(p_richiesta uuid, p_stato text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_circolo uuid;
begin
  select circolo_id into v_circolo from richieste_premio where id = p_richiesta;
  if v_circolo is null then
    return json_build_object('ok', false, 'errore', 'Richiesta non trovata.');
  end if;
  if not public.puo_gestire(v_circolo) then
    return json_build_object('ok', false, 'errore', 'Operazione riservata alla segreteria.');
  end if;
  if p_stato not in ('in_attesa','approvato','consegnato') then
    return json_build_object('ok', false, 'errore', 'Stato non valido.');
  end if;
  update richieste_premio
     set stato = p_stato, aggiornato_il = now()
   where id = p_richiesta;
  return json_build_object('ok', true);
end;
$function$;

-- annulla_richiesta_premio: is_admin globale -> puo_gestire(circolo della richiesta)
CREATE OR REPLACE FUNCTION public.annulla_richiesta_premio(p_richiesta uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid   uuid := auth.uid();
  r       richieste_premio%rowtype;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'errore', 'Non autenticato.');
  end if;

  select * into r from richieste_premio where id = p_richiesta;

  if r.id is null then
    return json_build_object('ok', false, 'errore', 'Richiesta non trovata.');
  end if;
  if r.socio_id <> v_uid and not public.puo_gestire(r.circolo_id) then
    return json_build_object('ok', false, 'errore', 'Non puoi eliminare questa richiesta.');
  end if;
  if r.stato = 'consegnato' then
    return json_build_object('ok', false, 'errore',
      'La richiesta è già stata consegnata e non può essere eliminata.');
  end if;

  update soci set crediti = crediti + r.costo_pagato where id = r.socio_id;
  if r.premio_id is not null then
    update premi set stock = stock + 1 where id = r.premio_id and stock is not null;
  end if;

  -- rimuovo il movimento di spesa collegato (il rimborso è già fatto sopra,
  -- quindi qui NON tocco di nuovo il saldo)
  delete from movimenti_punti where chiave = 'premio:' || p_richiesta;

  delete from richieste_premio where id = p_richiesta;
  return json_build_object('ok', true);
end;
$function$;

-- riscatta_premio: fix del bug reale (impostazioni id=1 non esiste più dopo
-- mt04) + circolo_id dedotto dal premio, non più letto da una tabella globale.
CREATE OR REPLACE FUNCTION public.riscatta_premio(p_premio uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_socio    uuid := auth.uid();
  v_circolo  uuid;
  v_premi_on boolean;
  v_costo    integer;
  v_stock    integer;
  v_nascosto boolean;
  v_nome     text;
  v_crediti  integer;
  v_rich     uuid;
begin
  if v_socio is null then
    return json_build_object('ok', false, 'errore', 'Non autenticato.');
  end if;

  select circolo_id, costo, stock, nascosto, nome
    into v_circolo, v_costo, v_stock, v_nascosto, v_nome
  from premi where id = p_premio;

  if v_nome is null then
    return json_build_object('ok', false, 'errore', 'Premio non trovato.');
  end if;

  select modalita_premi into v_premi_on from impostazioni where circolo_id = v_circolo;
  if not coalesce(v_premi_on, false) then
    return json_build_object('ok', false, 'errore', 'I premi non sono attivi in questo momento.');
  end if;

  if v_nascosto then
    return json_build_object('ok', false, 'errore', 'Premio non disponibile.');
  end if;
  if v_stock is not null and v_stock <= 0 then
    return json_build_object('ok', false, 'errore', 'Premio esaurito.');
  end if;

  -- blocco la riga del socio mentre leggo/aggiorno il saldo
  select crediti into v_crediti from soci where id = v_socio for update;
  if coalesce(v_crediti, 0) < v_costo then
    return json_build_object('ok', false, 'errore', 'Crediti insufficienti.');
  end if;

  update soci set crediti = crediti - v_costo where id = v_socio;
  if v_stock is not null then
    update premi set stock = stock - 1 where id = p_premio;
  end if;

  insert into richieste_premio (premio_id, socio_id, stato, costo_pagato, nome_premio, circolo_id)
    values (p_premio, v_socio, 'in_attesa', v_costo, v_nome, v_circolo)
    returning id into v_rich;

  -- movimento di spesa (crediti negativi): NON tocca di nuovo il saldo,
  -- serve solo allo storico/CSV e a far tornare la somma dei movimenti.
  insert into movimenti_punti(socio_id, delta_punti, delta_crediti, motivo, chiave, data_evento, sport, tipo)
    values (v_socio, 0, -v_costo, 'Riscatto premio: ' || v_nome, 'premio:' || v_rich, null, null, 'riscatto');

  return json_build_object('ok', true, 'id', v_rich);
end;
$function$;

-- storico_movimenti: is_admin globale -> puo_gestire_socio(p_socio)
CREATE OR REPLACE FUNCTION public.storico_movimenti(p_socio uuid, p_da date DEFAULT NULL::date, p_a date DEFAULT NULL::date)
 RETURNS TABLE(quando timestamp with time zone, data_evento timestamp with time zone, sport text, tipo text, motivo text, punti integer, crediti integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    coalesce(m.data_evento, m.creato_il)::timestamptz as quando,
    m.data_evento::timestamptz                        as data_evento,
    m.sport::text                                     as sport,
    m.tipo::text                                      as tipo,
    coalesce(m.motivo, 'Movimento')::text             as motivo,
    coalesce(m.delta_punti,0)::int                    as punti,
    coalesce(m.delta_crediti,0)::int                  as crediti
  from public.movimenti_punti m
  where m.socio_id = p_socio
    and (p_da is null or coalesce(m.data_evento, m.creato_il)::date >= p_da)
    and (p_a  is null or coalesce(m.data_evento, m.creato_il)::date <= p_a)
    and public.puo_gestire_socio(p_socio)
  order by coalesce(m.data_evento, m.creato_il) desc
$function$;

-- assegna_movimento / azzera_chiave: _puo_gestire_punti() (is_admin/is_allenatore
-- globali) -> puo_gestire_socio(...). I punti/crediti restano volutamente
-- globali per socio (decisione Fase 8b), qui sistemiamo solo CHI può
-- toccarli: deve condividere un circolo col socio target come gestore/collaboratore.
CREATE OR REPLACE FUNCTION public.assegna_movimento(p_socio uuid, p_punti integer, p_crediti integer, p_motivo text, p_chiave text, p_data_evento timestamp with time zone DEFAULT NULL::timestamp with time zone, p_sport text DEFAULT NULL::text, p_tipo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.puo_gestire_socio(p_socio) then raise exception 'Non autorizzato'; end if;
  insert into movimenti_punti(socio_id, delta_punti, delta_crediti, motivo, chiave, data_evento, sport, tipo)
    values (p_socio, coalesce(p_punti,0), coalesce(p_crediti,0), p_motivo, p_chiave, p_data_evento, p_sport, p_tipo);
  update soci set punti  = punti  + coalesce(p_punti,0),
                  crediti = crediti + coalesce(p_crediti,0)
   where id = p_socio;
end; $function$;

CREATE OR REPLACE FUNCTION public.azzera_chiave(p_chiave text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- una chiave può raggruppare movimenti di più soci (es. punti torneo
  -- assegnati in blocco): il chiamante deve poter gestire OGNUNO di loro.
  if exists (
    select 1 from movimenti_punti where chiave = p_chiave and not public.puo_gestire_socio(socio_id)
  ) then
    raise exception 'Non autorizzato';
  end if;
  update soci s set punti = s.punti - x.dp, crediti = s.crediti - x.dc
    from (select socio_id, sum(delta_punti) dp, sum(delta_crediti) dc
            from movimenti_punti where chiave = p_chiave group by socio_id) x
   where s.id = x.socio_id;
  delete from movimenti_punti where chiave = p_chiave;
end; $function$;

-- helper ormai inutilizzato (era usato solo dalle due funzioni sopra)
DROP FUNCTION IF EXISTS public._puo_gestire_punti();

-- cancella_prenotazioni_future: e_admin() zero-arg globale -> puo_gestire_socio
CREATE OR REPLACE FUNCTION public.cancella_prenotazioni_future(p_socio_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.puo_gestire_socio(p_socio_id) then
    raise exception 'Non autorizzato';
  end if;

  delete from public.partecipanti_amichevole pa
  using public.prenotazioni p
  where pa.prenotazione_id = p.id
    and pa.socio_id = p_socio_id
    and p.inizio > now();

  delete from public.prenotazioni
  where socio_id = p_socio_id
    and inizio > now();
end;
$function$;

-- preferenze_amico / partite_totali_socio / ultimi_risultati_socio: e_staff()
-- globale (qualsiasi staff di QUALSIASI circolo) -> puo_gestire_socio(p_socio)
-- (solo chi condivide davvero un circolo col socio target).
CREATE OR REPLACE FUNCTION public.preferenze_amico(p_socio uuid)
 RETURNS TABLE(sport text, mano_piede_preferito text, posizione text, orario_preferito text, giorni_preferiti text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select pg.sport, pg.mano_piede_preferito, pg.posizione, pg.orario_preferito, pg.giorni_preferiti
  from preferenze_giocatore pg
  where pg.socio_id = p_socio
    and (p_socio = auth.uid() or public.sono_amici(auth.uid(), p_socio) or public.puo_gestire_socio(p_socio))
$function$;

CREATE OR REPLACE FUNCTION public.partite_totali_socio(p_socio uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when p_socio = auth.uid() or public.sono_amici(auth.uid(), p_socio) or public.puo_gestire_socio(p_socio) then (
      select count(distinct pa.prenotazione_id)
      from partecipanti_amichevole pa
      join prenotazioni pr on pr.id = pa.prenotazione_id
      where pa.socio_id = p_socio
        and coalesce(pr.allenamento, false) = false
        and pr.fine < now()
    )
    else 0
  end
$function$;

CREATE OR REPLACE FUNCTION public.ultimi_risultati_socio(p_socio uuid, p_sport text, p_limite integer DEFAULT 5)
 RETURNS TABLE(prenotazione_id text, inizio timestamp with time zone, fine timestamp with time zone, campo_nome text, risultato_dettaglio jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select pr.id::text as prenotazione_id,
         pr.inizio, pr.fine,
         c.nome as campo_nome,
         pr.risultato_dettaglio
  from prenotazioni pr
  join campi c on c.id = pr.campo_id
  where (p_socio = auth.uid() or public.sono_amici(auth.uid(), p_socio) or public.puo_gestire_socio(p_socio))
    and coalesce(pr.allenamento, false) = false
    and pr.torneo_id is null
    and pr.incontro_id is null
    and pr.inizio <= now()
    and c.sport = p_sport
    and pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = p_socio and confermato = true)
  order by pr.inizio desc
  limit p_limite
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Gruppo B: mescolavano dati tra circoli, nuovo overload con p_circolo_id
-- (le vecchie firme senza parametro vengono rimosse in mt09 dopo il deploy)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.istruttori_attivi(p_circolo_id uuid)
 RETURNS TABLE(id uuid, cognome text, nome text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.id, s.cognome, s.nome
  from public.soci s
  join public.soci_circoli sc on sc.socio_id = s.id
  where sc.circolo_id = p_circolo_id
    and (sc.ruolo = 'gestore' or (sc.ruolo = 'collaboratore' and sc.puo_dare_lezioni = true))
    and s.attivo is not false
  order by s.cognome, s.nome;
$function$;

CREATE OR REPLACE FUNCTION public.premi_popolarita(p_circolo_id uuid)
 RETURNS TABLE(nome_premio text, n bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select nome_premio, count(*)::bigint as n
  from richieste_premio
  where circolo_id = p_circolo_id
  group by nome_premio
$function$;

-- stat_giocatori: contava su TUTTI i soci della piattaforma (tabella soci
-- globale), non sui membri del circolo. Riscritta sul modello ruoli
-- per-circolo (soci_circoli) invece dei vecchi flag is_admin/is_allenatore/
-- e_allenatore su soci. "nuoviMese" ora conta l'iscrizione al CIRCOLO
-- (soci_circoli.creato_il), non la creazione dell'account globale: più
-- corretto per una stat "di questo club".
CREATE OR REPLACE FUNCTION public.stat_giocatori(p_circolo_id uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with
  membri as (
    select s.id, s.sport_preferito, sc.ruolo, sc.puo_dare_lezioni, sc.creato_il as iscritto_il
    from public.soci_circoli sc
    join public.soci s on s.id = sc.socio_id
    where sc.circolo_id = p_circolo_id and s.attivo = true
  ),
  attivi_30 as (
    select distinct pa.socio_id
    from public.partecipanti_amichevole pa
    join public.prenotazioni pr on pr.id = pa.prenotazione_id
    where pr.circolo_id = p_circolo_id
      and pr.inizio >= (current_date - interval '30 days')::timestamptz
  ),
  attivi_7 as (
    select distinct pa.socio_id
    from public.partecipanti_amichevole pa
    join public.prenotazioni pr on pr.id = pa.prenotazione_id
    where pr.circolo_id = p_circolo_id
      and pr.inizio >= (current_date - interval '7 days')::timestamptz
  )
  select json_build_object(
    'totale',         (select count(*) from membri),
    'nuoviMese',      (select count(*) from membri where iscritto_il >= date_trunc('month', now())),
    'attiviUltimi30', (select count(*) from membri m join attivi_30 x on x.socio_id = m.id),
    'attiviUltimi7',  (select count(*) from membri m join attivi_7  x on x.socio_id = m.id),
    'padel',          (select count(*) from membri where sport_preferito = 'padel'),
    'calcio',         (select count(*) from membri where sport_preferito = 'calcio'),
    'entrambi',       (select count(*) from membri where sport_preferito is null
                                                      or sport_preferito not in ('padel','calcio')),
    'staff',          (select count(*) from membri where ruolo in ('gestore','collaboratore')),
    'adminCount',     (select count(*) from membri where ruolo = 'gestore'),
    'collaboratori',  (select count(*) from membri where ruolo = 'collaboratore' and not coalesce(puo_dare_lezioni,false)),
    'istruttori',     (select count(*) from membri where ruolo = 'collaboratore' and coalesce(puo_dare_lezioni,false)),
    'giocatori',      (select count(*) from membri where ruolo = 'socio')
  );
$function$;

-- partite_in_programma / partite_concluse: attività personali (proprie) del
-- socio, ma senza filtro circolo — mostrate in widget che vivono dentro una
-- pagina già scoped per circolo (Riepilogo/Bacheca). Un socio in 2+ circoli
-- vedeva mescolate le attività di entrambi. Stesso principio già applicato a
-- classifica_visibile nel nucleo Fase 2b.
CREATE OR REPLACE FUNCTION public.partite_in_programma(p_circolo_id uuid)
 RETURNS TABLE(prenotazione_id text, inizio timestamp with time zone, fine timestamp with time zone, campo_nome text, sport text, socio_id uuid, confermato boolean, prenotante_id uuid, nome_manuale text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    pr.id::text as prenotazione_id, pr.inizio, pr.fine,
    c.nome as campo_nome, c.sport as sport,
    pa.socio_id, pa.confermato, pr.socio_id as prenotante_id, pa.nome_manuale
  from prenotazioni pr
  join campi c on c.id = pr.campo_id
  left join partecipanti_amichevole pa on pa.prenotazione_id = pr.id
  where pr.circolo_id = p_circolo_id
    and pr.inizio > now()
    and (
      pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = auth.uid())
      or pr.allenatore_id = auth.uid()
    )
  order by pr.inizio asc, pa.socio_id asc;
$function$;

CREATE OR REPLACE FUNCTION public.partite_concluse(p_circolo_id uuid, p_giorni integer DEFAULT 7)
 RETURNS TABLE(prenotazione_id text, inizio timestamp with time zone, fine timestamp with time zone, campo_nome text, sport text, socio_id uuid, confermato boolean, prenotante_id uuid, risultato text, risultato_inserito_da uuid, risultato_dettaglio jsonb, nome_manuale text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    pr.id::text as prenotazione_id, pr.inizio, pr.fine,
    c.nome as campo_nome, c.sport as sport,
    pa.socio_id, pa.confermato, pr.socio_id as prenotante_id,
    pr.risultato, pr.risultato_inserito_da, pr.risultato_dettaglio, pa.nome_manuale
  from prenotazioni pr
  join campi c on c.id = pr.campo_id
  left join partecipanti_amichevole pa on pa.prenotazione_id = pr.id
  where pr.circolo_id = p_circolo_id
    and pr.inizio <= now()
    and pr.inizio >= now() - (p_giorni || ' days')::interval
    and (
      pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = auth.uid())
      or pr.allenatore_id = auth.uid()
    )
  order by pr.inizio desc, pa.socio_id asc;
$function$;
