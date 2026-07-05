-- Fix: quando un partecipante (non necessariamente il creatore) salva il
-- risultato di una partita, la app genera subito in più il ritorno dello
-- stesso slot, il turno successivo del tabellone e/o la finalina 3°/4°
-- posto (eliminazioneAmici.ts). Finora l'INSERT su tornei_amici_incontri
-- era permesso solo al creatore ("creatore genera gli incontri torneo"),
-- quindi quella generazione falliva con 403 se a salvare il risultato era
-- un altro dei 4 giocatori coinvolti.
--
-- La generazione del PRIMO turno (all'avvio del torneo) resta comunque
-- possibile solo al creatore perché solo lui vede il bottone "Avvia il
-- torneo"; qui aggiungiamo, in aggiunta (le policy permissive si sommano in
-- OR), il permesso per qualunque partecipante del torneo di inserire righe.

create policy "partecipanti generano i turni successivi" on public.tornei_amici_incontri
  for insert to authenticated
  with check (public.e_partecipante_torneo_amici(torneo_amici_id));
