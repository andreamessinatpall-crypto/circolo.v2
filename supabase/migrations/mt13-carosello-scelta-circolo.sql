-- Carosello di scelta circolo dopo il login: mostra prima l'ultimo circolo
-- visitato dal socio, poi gli altri ordinati per vicinanza geografica.
-- Servono due cose nuove: coordinate del circolo (indirizzo geocodificato
-- dal gestore in Impostazioni) e un timestamp di ultimo accesso per socio.

alter table public.circoli
  add column if not exists indirizzo text,
  add column if not exists latitudine double precision,
  add column if not exists longitudine double precision;

alter table public.soci_circoli
  add column if not exists ultimo_accesso timestamptz;

-- Il socio aggiorna solo il proprio ultimo_accesso (nessun nuovo dato
-- sensibile: stesse righe già leggibili/scrivibili da lui via RLS
-- esistenti su altre colonne di soci_circoli).
drop policy if exists "socio aggiorna il proprio ultimo accesso" on public.soci_circoli;
create policy "socio aggiorna il proprio ultimo accesso"
  on public.soci_circoli
  for update
  to authenticated
  using (socio_id = auth.uid())
  with check (socio_id = auth.uid());
