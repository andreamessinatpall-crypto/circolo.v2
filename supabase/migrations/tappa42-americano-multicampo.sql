-- Americano: supporto per più campi contemporanei.
-- Aggiunge un array di ID campo al torneo; americano_campo_id resta per compat.
ALTER TABLE public.tornei
  ADD COLUMN IF NOT EXISTS americano_campi_ids integer[] NULL;
