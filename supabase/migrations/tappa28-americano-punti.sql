-- Punti per posizione in classifica nei tornei Americano.
-- Formato JSON: { "1": 10, "2": 6, "3": 3 } (posizione → punti circolo).
ALTER TABLE public.tornei
  ADD COLUMN IF NOT EXISTS punti_posizioni jsonb NULL;
