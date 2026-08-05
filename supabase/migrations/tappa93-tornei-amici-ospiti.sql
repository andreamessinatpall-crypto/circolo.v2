-- (Tappa 93) Squadre di calcio libere nei tornei tra amici: l'organizzatore
-- forma squadre di qualsiasi dimensione (non più coppie fisse a 2, che restano
-- invece il formato del padel) e può aggiungere giocatori non registrati
-- (ospiti), indicandone solo il nome — stesso meccanismo già in uso per i
-- tornei ufficiali (tappa10-componenti-manuali.sql) e per le amichevoli
-- (tappa11-partecipanti-manuali.sql).

alter table public.tornei_amici_partecipanti alter column socio_id drop not null;
alter table public.tornei_amici_partecipanti add column if not exists nome_manuale text;

-- prenota_incontro_amici copiava solo socio_id nei partecipanti della
-- prenotazione collegata: un ospite in squadra risulterebbe altrimenti un
-- partecipante senza nome. Aggiorna la funzione per portare anche
-- nome_manuale (la riga resta comunque innocua per i soci veri, che hanno
-- nome_manuale null).
create or replace function public.prenota_incontro_amici(p_prenotazione uuid, p_incontro_amici_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incontro record;
begin
  if not exists (
    select 1 from public.prenotazioni where id = p_prenotazione and socio_id = auth.uid()
  ) then
    raise exception 'La prenotazione non è tua';
  end if;

  select * into v_incontro from public.tornei_amici_incontri where id = p_incontro_amici_id;
  if v_incontro is null then
    raise exception 'Incontro non trovato';
  end if;

  if not public.e_giocatore_incontro_amici(p_incontro_amici_id) then
    raise exception 'Non fai parte di questa partita';
  end if;

  update public.prenotazioni
  set torneo_amici_incontro_id = p_incontro_amici_id
  where id = p_prenotazione;

  insert into public.partecipanti_amichevole (prenotazione_id, socio_id, nome_manuale, confermato)
  select p_prenotazione, p.socio_id, p.nome_manuale, false
  from public.tornei_amici_partecipanti p
  where p.squadra_id in (v_incontro.casa_id, v_incontro.ospite_id)
  on conflict (prenotazione_id, socio_id) do nothing;
end;
$$;
