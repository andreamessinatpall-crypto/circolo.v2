-- Fase "cancellazione account": quando l'admin completa la cancellazione di
-- un socio, le sue prenotazioni FUTURE vanno rimosse (non ha più senso tenere
-- un campo prenotato per un socio che non è più iscritto). Quelle passate
-- restano intatte come storico.
--
-- - Se il socio è proprietario della prenotazione (prenotazioni.socio_id):
--   la prenotazione futura viene cancellata del tutto.
-- - Se il socio è solo partecipante a una prenotazione di gruppo altrui
--   (partecipanti_amichevole): viene tolto solo lui, la prenotazione resta
--   per gli altri partecipanti.
--
-- Riservata all'admin (security definer + controllo e_admin()): un socio
-- normale non deve poter cancellare le prenotazioni future di un altro.

create or replace function public.cancella_prenotazioni_future(p_socio_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.e_admin() then
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
$$;

revoke all on function public.cancella_prenotazioni_future(uuid) from public;
grant execute on function public.cancella_prenotazioni_future(uuid) to authenticated;
