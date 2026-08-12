-- Decisione di prodotto: nessuno crea account per conto di altri. Tutti si
-- registrano autonomamente via email (self-signup + scelta del circolo già
-- costruita in Fase 6); i gestori scelgono i propri collaboratori tra i
-- membri già iscritti al loro circolo (Fase 9c-bis, pannello "Collaboratori").
-- "Aggiungi nuovo giocatore"/"Importa da CSV" sono state rimosse dal
-- frontend: revert delle policy aggiunte in mt10 che le supportavano.

-- La policy "staff crea nuovi soci" (mt10) permetteva a qualsiasi
-- gestore/collaboratore di inserire una riga in `soci` per conto di un
-- altro utente: non serve più, nessuno crea più account per altri da UI.
DROP POLICY IF EXISTS "staff crea nuovi soci" ON public.soci;

-- Ripristina "iscrizione o gestione ruoli" senza il ramo aggiunto in mt10
-- (collaboratore che iscrive un nuovo membro) — un collaboratore non deve
-- più poter inserire righe soci_circoli per altri, solo il gestore (ruoli)
-- o il socio stesso (auto-iscrizione al proprio circolo).
DROP POLICY IF EXISTS "iscrizione o gestione ruoli" ON public.soci_circoli;
CREATE POLICY "iscrizione o gestione ruoli" ON public.soci_circoli
FOR INSERT TO authenticated
WITH CHECK (
  e_super_admin()
  OR (socio_id = auth.uid() AND ruolo = 'socio')
  OR e_gestore(circolo_id)
);
