-- Tappa 31: modalità andata e ritorno per tutti i formati di torneo,
-- finale secca e partita per il terzo posto nell'eliminazione diretta.
ALTER TABLE tornei ADD COLUMN IF NOT EXISTS andata_ritorno boolean DEFAULT false;
ALTER TABLE tornei ADD COLUMN IF NOT EXISTS finale_secca   boolean DEFAULT false;
ALTER TABLE tornei ADD COLUMN IF NOT EXISTS terzo_posto    boolean DEFAULT false;
