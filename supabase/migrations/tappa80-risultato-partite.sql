-- Risultato delle partite amichevoli semplici (non tornei, che hanno già il
-- proprio punteggio in incontri/tornei_amici_incontri): chi ha giocato può
-- inserirlo, tramite una funzione dedicata (niente policy UPDATE larga sulla
-- riga intera di prenotazioni, che esporrebbe anche campo/orario/socio_id).
alter table public.prenotazioni add column if not exists risultato text;
alter table public.prenotazioni add column if not exists risultato_inserito_da uuid;
alter table public.prenotazioni add column if not exists risultato_inserito_il timestamptz;

-- "In programma" ora si ferma all'orario di INIZIO (non più a fine): una
-- volta partita, la prenotazione passa alle "concluse" anche se ancora in
-- corso, e non è più mostrata come annullabile.
create or replace function public.partite_in_programma()
 returns table(prenotazione_id text, inizio timestamptz, fine timestamptz,
               campo_nome text, sport text, socio_id uuid, confermato boolean,
               prenotante_id uuid)
 language sql stable security definer set search_path to 'public'
as $function$
  select
    pr.id::text as prenotazione_id, pr.inizio, pr.fine,
    c.nome as campo_nome, c.sport as sport,
    pa.socio_id, pa.confermato, pr.socio_id as prenotante_id
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

-- Attività già iniziate (fino a p_giorni indietro, default 7): la finestra
-- "concluse" della pagina Attività. Oltre p_giorni, restano visibili solo
-- nello Storico attività (query lato client in usePartiteGiocate).
create or replace function public.partite_concluse(p_giorni integer default 7)
 returns table(prenotazione_id text, inizio timestamptz, fine timestamptz,
               campo_nome text, sport text, socio_id uuid, confermato boolean,
               prenotante_id uuid, risultato text, risultato_inserito_da uuid)
 language sql stable security definer set search_path to 'public'
as $function$
  select
    pr.id::text as prenotazione_id, pr.inizio, pr.fine,
    c.nome as campo_nome, c.sport as sport,
    pa.socio_id, pa.confermato, pr.socio_id as prenotante_id,
    pr.risultato, pr.risultato_inserito_da
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

grant execute on function public.partite_concluse(integer) to authenticated;

-- Solo chi ha giocato la partita (partecipante o chi l'ha prenotata) può
-- inserire/modificare il risultato. SECURITY DEFINER: evita di dover aprire
-- una policy UPDATE sull'intera riga di prenotazioni ai soci.
create or replace function public.imposta_risultato_prenotazione(p_prenotazione_id uuid, p_risultato text)
 returns void
 language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not (
    exists (
      select 1 from partecipanti_amichevole
      where prenotazione_id = p_prenotazione_id and socio_id = auth.uid()
    )
    or exists (
      select 1 from prenotazioni where id = p_prenotazione_id and socio_id = auth.uid()
    )
  ) then
    raise exception 'Non hai giocato questa partita.';
  end if;

  update prenotazioni
  set risultato = nullif(trim(p_risultato), ''),
      risultato_inserito_da = auth.uid(),
      risultato_inserito_il = now()
  where id = p_prenotazione_id;
end;
$function$;

grant execute on function public.imposta_risultato_prenotazione(uuid, text) to authenticated;
