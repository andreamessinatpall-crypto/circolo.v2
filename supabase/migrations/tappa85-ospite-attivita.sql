-- Ospite non registrato dal menu "+ amico" nella scheda Attività: oggi
-- l'unica policy INSERT per soci normali su partecipanti_amichevole
-- ("aggiungi partecipanti amichevole") richiede socio_id = auth.uid() o
-- sono_amici(auth.uid(), socio_id), quindi una riga ospite (socio_id null)
-- viene sempre respinta — l'aggiunta di ospiti finora esisteva solo per lo
-- staff (policy "staff aggiunge partecipanti"). Nuova policy additiva (le
-- policy permissive si sommano in OR, quella esistente resta intatta): un
-- socio attivo può aggiungere un ospite solo alle proprie prenotazioni.
create policy "aggiungi ospite alla propria prenotazione"
  on public.partecipanti_amichevole for insert to authenticated
  with check (
    socio_attivo()
    and confermato = false
    and socio_id is null
    and nome_manuale is not null
    and exists (
      select 1 from prenotazioni p
      where p.id = partecipanti_amichevole.prenotazione_id
        and p.socio_id = auth.uid()
    )
  );

-- partite_in_programma/partite_concluse scartavano di fatto gli ospiti lato
-- client (righeInMappa ignorava le righe con socio_id null, pensate per
-- l'artefatto del LEFT JOIN senza partecipanti): ora restituiscono anche
-- nome_manuale, così un ospite non sparisce dalla lista partecipanti né
-- quando la partita passa da "in programma" a "concluse". Aggiungere una
-- colonna a returns table cambia il tipo di ritorno: create or replace non è
-- permesso in questo caso, serve drop + create (i grant vanno riconcessi).
drop function if exists public.partite_in_programma();
create function public.partite_in_programma()
 returns table(prenotazione_id text, inizio timestamptz, fine timestamptz,
               campo_nome text, sport text, socio_id uuid, confermato boolean,
               prenotante_id uuid, nome_manuale text)
 language sql stable security definer set search_path to 'public'
as $function$
  select
    pr.id::text as prenotazione_id, pr.inizio, pr.fine,
    c.nome as campo_nome, c.sport as sport,
    pa.socio_id, pa.confermato, pr.socio_id as prenotante_id, pa.nome_manuale
  from prenotazioni pr
  join campi c on c.id = pr.campo_id
  left join partecipanti_amichevole pa on pa.prenotazione_id = pr.id
  where pr.inizio > now()
    and (
      pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = auth.uid())
      or pr.allenatore_id = auth.uid()
    )
  order by pr.inizio asc, pa.socio_id asc;
$function$;
grant execute on function public.partite_in_programma() to authenticated, anon;

-- ATTENZIONE: tappa81-risultato-dettaglio.sql aveva già aggiunto
-- risultato_dettaglio a questa funzione dopo tappa80 — qui va riportato
-- anche quello, altrimenti il frontend perde il dettaglio strutturato e
-- ricade nel vecchio fallback testuale "Risultato".
drop function if exists public.partite_concluse(integer);
create function public.partite_concluse(p_giorni integer default 7)
 returns table(prenotazione_id text, inizio timestamptz, fine timestamptz,
               campo_nome text, sport text, socio_id uuid, confermato boolean,
               prenotante_id uuid, risultato text, risultato_inserito_da uuid,
               risultato_dettaglio jsonb, nome_manuale text)
 language sql stable security definer set search_path to 'public'
as $function$
  select
    pr.id::text as prenotazione_id, pr.inizio, pr.fine,
    c.nome as campo_nome, c.sport as sport,
    pa.socio_id, pa.confermato, pr.socio_id as prenotante_id,
    pr.risultato, pr.risultato_inserito_da, pr.risultato_dettaglio, pa.nome_manuale
  from prenotazioni pr
  join campi c on c.id = pr.campo_id
  left join partecipanti_amichevole pa on pa.prenotazione_id = pr.id
  where pr.inizio <= now()
    and pr.inizio >= now() - (p_giorni || ' days')::interval
    and (
      pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = auth.uid())
      or pr.allenatore_id = auth.uid()
    )
  order by pr.inizio desc, pa.socio_id asc;
$function$;
grant execute on function public.partite_concluse(integer) to authenticated, anon;
