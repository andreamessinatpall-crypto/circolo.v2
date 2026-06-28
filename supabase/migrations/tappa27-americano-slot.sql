-- Americano: il torneo occupa un blocco unico di tempo su un campo.
-- Si salva direttamente sul torneo e si crea una prenotazione collegata.

-- Colonne sullo slot americano (sostituite a durata_minuti per l'americano).
ALTER TABLE public.tornei
  ADD COLUMN IF NOT EXISTS americano_inizio      timestamptz NULL,
  ADD COLUMN IF NOT EXISTS americano_fine        timestamptz NULL,
  ADD COLUMN IF NOT EXISTS americano_campo_id    bigint      NULL;

-- Collega la prenotazione al torneo (cascade delete).
ALTER TABLE public.prenotazioni
  ADD COLUMN IF NOT EXISTS torneo_id uuid
    REFERENCES public.tornei(id) ON DELETE CASCADE;

-- Nota: tappa26-americano-prenotazioni.sql è ora sostituito da questo script.
-- La colonna americano_partita_id non è necessaria (la programmazione è a livello torneo).
