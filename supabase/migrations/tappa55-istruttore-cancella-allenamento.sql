-- Fase 5 (fix): l'istruttore titolare di un allenamento deve poterlo
-- annullare anche se è già iniziato ("in corso") — la policy generica
-- "Annullamento proprio o da admin" richiede inizio > now() e comunque
-- guarda socio_id, non allenatore_id (per le lezioni nate da una richiesta
-- accettata, socio_id è il giocatore, non l'istruttore che l'ha accettata).

create policy "istruttore cancella propri allenamenti"
  on public.prenotazioni
  for delete
  to authenticated
  using (allenamento = true and allenatore_id = auth.uid());
