-- tappa32: Modifica il vincolo coppia per supportare andata e ritorno.
-- idx_incontri_coppia trattava (A,B) e (B,A) come la stessa coppia → bloccava il ritorno.
-- Aggiungendo `round` alla chiave, la stessa coppia può giocare in round diversi.

-- Rimuove il vecchio vincolo (può essere indice o constraint nominato)
ALTER TABLE incontri DROP CONSTRAINT IF EXISTS idx_incontri_coppia;
DROP INDEX IF EXISTS idx_incontri_coppia;

-- Ricrea includendo round: coppia unica per round, non per intero torneo
CREATE UNIQUE INDEX idx_incontri_coppia ON incontri (
  torneo_id,
  round,
  LEAST(casa_id::text, ospite_id::text),
  GREATEST(casa_id::text, ospite_id::text)
);
