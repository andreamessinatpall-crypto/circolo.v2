-- Tappa 71 · "Cerco giocatori": chi ha creato un annuncio può modificarlo
-- (prima si poteva solo eliminarlo e ricrearlo da capo).

drop policy if exists "richieste_partner update" on public.richieste_partner;
create policy "richieste_partner update"
  on public.richieste_partner for update to authenticated
  using (socio_id = auth.uid())
  with check (socio_id = auth.uid());
