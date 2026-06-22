-- (Fase 7c) Storico movimenti visibile al socio.
--
-- Problema: la tabella movimenti_punti (punti/crediti guadagnati e spesi) in v1
-- veniva letta SOLO da RPC con privilegi (storico_movimenti, risincronizza_saldi,
-- classifica...). Un socio normale, leggendola direttamente, non vede nulla
-- perché la Row Level Security non gli concede il SELECT sui propri movimenti.
--
-- Soluzione: una policy di SOLA LETTURA che lascia a ciascun socio vedere
-- esclusivamente le proprie righe. soci.id coincide con auth.uid() (vedi
-- AuthProvider, insert con id = user.id) e movimenti_punti.socio_id -> soci.id,
-- quindi il confronto è diretto.
--
-- Sicuro e ripetibile: aggiunge solo una policy di lettura, non tocca le altre
-- e non concede alcuna scrittura. Eseguire una sola volta nell'SQL editor di
-- Supabase.

alter table public.movimenti_punti enable row level security;

drop policy if exists "socio legge i propri movimenti" on public.movimenti_punti;
create policy "socio legge i propri movimenti"
  on public.movimenti_punti
  for select
  to authenticated
  using (socio_id = auth.uid());
