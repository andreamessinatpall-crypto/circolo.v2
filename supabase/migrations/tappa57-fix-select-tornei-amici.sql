-- Fix Fase 6: la creazione di un torneo tra amici falliva con 403
-- ("new row violates row-level security policy for table tornei_amici")
-- ogni volta che il client faceva insert(...).select() per riavere la riga
-- appena creata.
--
-- Causa: la policy SELECT di tornei_amici usava e_partecipante_torneo_amici(id),
-- che internamente ri-interroga la stessa tabella tornei_amici (via
-- e_creatore_torneo_amici) per verificare creatore_id = auth.uid(). In
-- un INSERT ... RETURNING, Postgres valuta le policy SELECT sulla riga
-- appena inserita PRIMA che sia visibile a una sotto-query ordinaria sulla
-- stessa tabella nello stesso comando (la riga è visibile solo tramite la
-- RETURNING stessa, non tramite un nuovo SELECT sulla tabella) — quindi la
-- sotto-query restituiva sempre "nessuna riga trovata" e la policy falliva,
-- anche se il creatore era davvero lui. Il SECURITY DEFINER non c'entra:
-- è proprio la visibilità MVCC del comando, non un problema di permessi.
--
-- Soluzione: la policy SELECT su tornei_amici deve confrontare direttamente
-- le colonne della riga corrente (creatore_id = auth.uid(), un riferimento
-- diretto, sempre sicuro) invece di ripassare dalla funzione che ri-legge
-- la tabella. La query sui partecipanti resta invece verso un'ALTRA tabella
-- (tornei_amici_partecipanti), quindi non ha questo problema.

drop policy if exists "partecipanti leggono il torneo amici" on public.tornei_amici;

create policy "partecipanti leggono il torneo amici" on public.tornei_amici
  for select to authenticated
  using (
    creatore_id = auth.uid()
    or exists (
      select 1 from public.tornei_amici_partecipanti p
      where p.torneo_amici_id = tornei_amici.id and p.socio_id = auth.uid()
    )
  );
