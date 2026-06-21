-- (Fase 7b) Punti diversi per ciascun girone.
-- Aggiunge alla tabella tornei una colonna JSON con i punti personalizzati
-- per girone, nel formato:
--   { "1": {"iscrizione": 5, "vittoria": 3, "torneo": 10}, "2": {...} }
-- Quando un girone non è presente (o il torneo ha un solo girone) si usano
-- i punti "base" nelle colonne punti_iscrizione / punti_vittoria / punti_torneo.

alter table tornei add column if not exists punti_gironi jsonb;
