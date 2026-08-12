-- Fase 9c: il modulo "gestione soci" in segreteria (form nuovo/modifica
-- socio, import CSV, badge) leggeva/scriveva ancora is_admin/is_allenatore/
-- e_allenatore (flag globali, uguali in ogni circolo) invece del vero ruolo
-- per-circolo in soci_circoli. Durante la migrazione sono emersi due bug
-- indipendenti, scoperti mentre si toccava esattamente questo codice:
--
-- 1) Solo il super-admin di piattaforma può oggi inserire una riga in `soci`
--    per conto di un altro utente: un vero gestore/collaboratore (non
--    super-admin) riceve "row-level security policy" provando ad "Aggiungere
--    un nuovo giocatore" o importare un CSV — verificato con impersonazione.
--    "Aggiungi nuovo giocatore"/"Importa da CSV" erano quindi utilizzabili
--    solo dall'account super-admin, non da un vero gestore di un circolo reale.
-- 2) Il trigger mt_auto_iscrivi_socio (Fase 2, "stop-gap... da rimuovere
--    quando la Fase 6 introduce la vera selezione del circolo") non è mai
--    stato rimosso: iscrive OGNI nuova riga di `soci` al circolo di bootstrap
--    "Circoly Club", indipendentemente dal circolo in cui la segreteria sta
--    davvero operando (un gestore di "Padel Test Club" che aggiunge un
--    giocatore lo vedrebbe finire in Circoly Club). La Fase 6 ha già
--    implementato la vera scelta del circolo (SceltaCircoloPage, 0 circoli ->
--    schermata di scelta), quindi il trigger è ora solo un doppione dannoso.

-- ── 1) soci_pubblici: aggiunge ruolo/puo_dare_lezioni per-circolo ──────────
-- (Overload additivo: tiene ancora e_allenatore/is_admin/is_allenatore per
-- non rompere il frontend vecchio durante il deploy; rimossi in mt11 dopo
-- conferma che il nuovo bundle è live. Anche l'esclusione dei gestori dalla
-- lista pubblica, prima basata su is_admin, ora usa il ruolo.)
DROP FUNCTION IF EXISTS public.soci_pubblici(uuid);
CREATE FUNCTION public.soci_pubblici(p_circolo_id uuid)
 RETURNS TABLE(
   id uuid, etichetta text,
   e_allenatore boolean, is_admin boolean, is_allenatore boolean,
   ruolo text, puo_dare_lezioni boolean,
   punti integer, sport_preferito text, data_iscrizione date,
   genere text, account_privato boolean, foto_url text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    s.id,
    s.cognome || ' ' || s.nome          as etichetta,
    coalesce(s.e_allenatore,  false)    as e_allenatore,
    coalesce(s.is_admin,      false)    as is_admin,
    coalesce(s.is_allenatore, false)    as is_allenatore,
    sc.ruolo                            as ruolo,
    coalesce(sc.puo_dare_lezioni,false) as puo_dare_lezioni,
    coalesce(s.punti, 0)                as punti,
    s.sport_preferito                   as sport_preferito,
    s.data_iscrizione::date             as data_iscrizione,
    s.genere                            as genere,
    coalesce(s.account_privato, false)  as account_privato,
    s.foto_url                          as foto_url
  from public.soci s
  join public.soci_circoli sc on sc.socio_id = s.id and sc.circolo_id = p_circolo_id
  where s.attivo is not false
    and coalesce(s.sospeso, false) = false
    and sc.ruolo <> 'gestore'
  order by s.cognome, s.nome;
$function$;

-- ── 2) soci: permette a un membro dello staff (gestore o collaboratore, in
-- QUALSIASI circolo) di creare un nuovo socio da segreteria. Non si può
-- ancora scoping per circolo qui: la riga è nuova, non ha ancora alcuna
-- appartenenza — lo scoping vero avviene sull'insert in soci_circoli
-- (punto 3). is_admin/is_super_admin non possono mai essere auto-concessi
-- da questa via.
CREATE POLICY "staff crea nuovi soci" ON public.soci
FOR INSERT TO authenticated
WITH CHECK (
  coalesce(is_admin, false) = false
  AND coalesce(is_super_admin, false) = false
  AND EXISTS (
    SELECT 1 FROM public.soci_circoli sc
    JOIN public.soci s ON s.id = sc.socio_id
    WHERE sc.socio_id = auth.uid()
      AND sc.ruolo IN ('gestore', 'collaboratore')
      AND s.attivo = true
  )
);

-- ── 3) soci_circoli: un collaboratore (non solo un gestore) può ora
-- aggiungere un socio al proprio circolo, ma solo con ruolo 'socio' — la
-- promozione a collaboratore/gestore resta riservata al gestore/super-admin
-- (già coperta dal ramo e_gestore esistente).
DROP POLICY IF EXISTS "iscrizione o gestione ruoli" ON public.soci_circoli;
CREATE POLICY "iscrizione o gestione ruoli" ON public.soci_circoli
FOR INSERT TO authenticated
WITH CHECK (
  e_super_admin()
  OR (socio_id = auth.uid() AND ruolo = 'socio')
  OR e_gestore(circolo_id)
  OR (puo_gestire(circolo_id) AND ruolo = 'socio')
);

-- ── 4) rimuove il trigger stop-gap: il frontend (AuthProvider per il
-- self-signup, NuovoSocio/ImportaGiocatoriCsv per la segreteria) ora inserisce
-- esplicitamente la riga soci_circoli giusta subito dopo aver creato il socio.
DROP TRIGGER IF EXISTS mt_auto_iscrivi_socio ON public.soci;
DROP FUNCTION IF EXISTS public.mt_auto_iscrivi_socio();
