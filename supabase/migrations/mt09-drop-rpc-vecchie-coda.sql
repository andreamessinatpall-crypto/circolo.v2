-- Fase 2b (coda): rimuove le vecchie firme senza p_circolo_id introdotte in
-- mt08 come overload aggiuntivo, ora che il frontend che le chiamava (già
-- aggiornato nello stesso commit di mt08) è confermato live su Cloudflare
-- Pages. Stesso pattern già usato per soci_pubblici/soci_etichette/
-- classifica_visibile nel nucleo (mt06 → mt07).

DROP FUNCTION IF EXISTS public.istruttori_attivi();
DROP FUNCTION IF EXISTS public.premi_popolarita();
DROP FUNCTION IF EXISTS public.stat_giocatori();
DROP FUNCTION IF EXISTS public.partite_in_programma();
DROP FUNCTION IF EXISTS public.partite_concluse(integer);
