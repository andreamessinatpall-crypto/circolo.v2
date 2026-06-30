-- Tappa 40 · Cancellazione account (GDPR Art. 17)
--
-- Aggiunge il timestamp di richiesta cancellazione alla tabella soci.
-- Il flusso è:
--   1. Utente preme "Cancella account" nell'app → viene scritto richiesta_cancellazione = now()
--   2. Admin vede la richiesta nella segreteria → preme "Completa cancellazione":
--      i dati anagrafici vengono anonimizzati nell'app
--   3. Admin elimina manualmente l'utente da Supabase Dashboard → Authentication → Users
--
-- I dati storici (movimenti_punti, prenotazioni…) restano con il socio_id
-- ma senza dati personali identificabili (conservazione minima legale).

alter table public.soci
  add column if not exists richiesta_cancellazione timestamptz;

-- Il socio autenticato può impostare la propria richiesta di cancellazione.
-- (Il resto dell'anonimizzazione lo esegue l'admin tramite l'app.)
drop policy if exists "socio imposta richiesta cancellazione" on public.soci;
create policy "socio imposta richiesta cancellazione"
  on public.soci
  for update
  to authenticated
  using  (id = auth.uid())
  with check (id = auth.uid());
