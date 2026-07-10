-- Dettaglio strutturato del risultato (squadre + set), per renderizzare le
-- partite concluse con lo stesso stile "match-row" dei tornei (nome vs nome
-- + punteggio al centro), non solo come testo piatto.
alter table public.prenotazioni add column if not exists risultato_dettaglio jsonb;

create or replace function public.imposta_risultato_prenotazione(
  p_prenotazione_id uuid,
  p_risultato text,
  p_dettaglio jsonb default null
)
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
      risultato_dettaglio = p_dettaglio,
      risultato_inserito_da = auth.uid(),
      risultato_inserito_il = now()
  where id = p_prenotazione_id;
end;
$function$;

grant execute on function public.imposta_risultato_prenotazione(uuid, text, jsonb) to authenticated;

create or replace function public.partite_concluse(p_giorni integer default 7)
 returns table(prenotazione_id text, inizio timestamptz, fine timestamptz,
               campo_nome text, sport text, socio_id uuid, confermato boolean,
               prenotante_id uuid, risultato text, risultato_inserito_da uuid,
               risultato_dettaglio jsonb)
 language sql stable security definer set search_path to 'public'
as $function$
  select
    pr.id::text as prenotazione_id, pr.inizio, pr.fine,
    c.nome as campo_nome, c.sport as sport,
    pa.socio_id, pa.confermato, pr.socio_id as prenotante_id,
    pr.risultato, pr.risultato_inserito_da, pr.risultato_dettaglio
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
