-- Collega le prenotazioni alle partite americano.
ALTER TABLE public.prenotazioni
  ADD COLUMN IF NOT EXISTS americano_partita_id bigint
    REFERENCES public.americano_partite(id) ON DELETE SET NULL;

-- RPC sicura (bypassa RLS) per leggere quali partite americano hanno una prenotazione.
-- Stessa logica di incontri_prenotati ma per americano_partite.
CREATE OR REPLACE FUNCTION public.americano_prenotati(p_partite bigint[])
RETURNS TABLE(americano_partita_id bigint, inizio timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.americano_partita_id, p.inizio
  FROM public.prenotazioni p
  WHERE p.americano_partita_id = ANY(p_partite);
$$;
