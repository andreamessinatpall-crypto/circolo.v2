-- Americano padel: partite con 4 giocatori individuali (2 coppie dinamiche per round).
-- p1+p2 (lato "casa") vs p3+p4 (lato "ospite").
-- I giocatori sono record di "squadre" con un solo componente ciascuno.
-- Le FK usano uuid perché tornei.id e squadre.id sono uuid (generati da Supabase).

CREATE TABLE IF NOT EXISTS americano_partite (
  id             bigserial PRIMARY KEY,
  torneo_id      uuid      NOT NULL REFERENCES tornei(id)  ON DELETE CASCADE,
  round          int       NOT NULL,
  campo          int       NOT NULL DEFAULT 1,
  p1_id          uuid      NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  p2_id          uuid      NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  p3_id          uuid      NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  p4_id          uuid      NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  punti_casa     int       NULL,
  punti_ospite   int       NULL,
  data_disputata date      NULL
);

ALTER TABLE americano_partite ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere.
CREATE POLICY "tutti_leggono" ON americano_partite
  FOR SELECT USING (true);

-- Solo admin e allenatori (staff) possono scrivere.
-- Usa la stessa logica di puo_gestire_prenotazioni() già presente nel DB.
CREATE POLICY "staff_gestisce" ON americano_partite
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.soci
      WHERE id = auth.uid()
        AND (is_admin = true OR is_allenatore = true)
    )
  );
