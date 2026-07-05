-- Fix Fase 5: l'istruttore non ha (né deve avere in generale) il permesso di
-- inserire una prenotazione con socio_id di un altro socio — le policy RLS
-- su "prenotazioni" richiedono socio_id = auth.uid() (prenotazione normale)
-- o puo_gestire_prenotazioni() (solo admin/collaboratore), quindi un
-- istruttore semplice riceveva 403 nell'accettare una richiesta di lezione.
--
-- Soluzione: una funzione SECURITY DEFINER dedicata che fa le tre scritture
-- (prenotazione + partecipante + stato richiesta) in una transazione,
-- verificando esplicitamente che chi chiama sia proprio l'istruttore
-- destinatario della richiesta e che questa sia ancora in attesa.

create or replace function public.accetta_richiesta_lezione(p_richiesta_id bigint, p_campo_id integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

  insert into public.prenotazioni (campo_id, socio_id, inizio, fine, allenamento, allenatore_id)
  values (p_campo_id, v_richiesta.socio_id, v_richiesta.inizio, v_richiesta.fine, true, v_richiesta.istruttore_id)
  returning id into v_prenotazione_id;

  insert into public.partecipanti_amichevole (prenotazione_id, socio_id, confermato)
  values (v_prenotazione_id, v_richiesta.socio_id, false);

  update public.richieste_lezione
  set stato = 'accettata', prenotazione_id = v_prenotazione_id
  where id = p_richiesta_id;

  return v_prenotazione_id;
end;
$$;

revoke all on function public.accetta_richiesta_lezione(bigint, integer) from public;
grant execute on function public.accetta_richiesta_lezione(bigint, integer) to authenticated;
