-- (Fase 8e) Livelli a punti e traguardi configurabili dall'admin.
--
-- Le soglie dei livelli (e in seguito dei traguardi di partita) si salvano in
-- due colonne jsonb della riga impostazioni. Nella v1 esistono già; questo
-- script le aggiunge solo se mancano (idempotente). Senza, l'app usa i valori
-- di default e il salvataggio avvisa di eseguire questo script.
--
-- Esegui nello SQL editor di Supabase.

alter table impostazioni add column if not exists livelli_punti jsonb;
alter table impostazioni add column if not exists badge_livelli jsonb;
