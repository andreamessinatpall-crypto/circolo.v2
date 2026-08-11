-- Fase 2b (nucleo, pulizia finale): rimuove le vecchie versioni a zero
-- argomenti di soci_pubblici/soci_etichette/classifica_visibile, sostituite
-- in mt06-rpc-circolo-priorita.sql da un overload con p_circolo_id.
--
-- Restavano attive e richiamabili via API (SECURITY DEFINER, bypassano le
-- RLS) anche dopo l'introduzione del nuovo overload: chiunque poteva ancora
-- chiamarle senza argomenti e leggere i dati di TUTTI i circoli mescolati.
-- Rimosse solo ora, dopo aver verificato che il deploy del nuovo frontend
-- (che passa sempre p_circolo_id) è live e funzionante.

drop function if exists public.soci_pubblici();
drop function if exists public.soci_etichette();
drop function if exists public.classifica_visibile();
