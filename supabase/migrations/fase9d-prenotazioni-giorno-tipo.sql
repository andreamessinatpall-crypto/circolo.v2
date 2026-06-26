-- Fase 9d · prenotazioni_giorno: aggiunta di incontro_id e allenamento
--
-- La funzione RPC restituiva solo id/campo_id/socio_id/inizio/fine/etichetta.
-- Aggiungiamo incontro_id e allenamento così il client può distinguere
-- il tipo di prenotazione (partita / allenamento / torneo) e colorarla.
-- Sicuro da rieseguire: CREATE OR REPLACE.

create or replace function public.prenotazioni_giorno(
  alba      timestamptz,
  tramonto  timestamptz
)
returns table(
  id           bigint,
  campo_id     bigint,
  socio_id     uuid,
  inizio       timestamptz,
  fine         timestamptz,
  etichetta    text,
  incontro_id  bigint,
  allenamento  boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id::bigint,
    p.campo_id::bigint,
    p.socio_id,
    p.inizio,
    p.fine,
    (s.cognome || ' ' || s.nome)::text as etichetta,
    p.incontro_id::bigint,
    coalesce(p.allenamento, false)
  from public.prenotazioni p
  left join public.soci s on s.id = p.socio_id
  where p.inizio >= alba
    and p.inizio < tramonto
  order by p.inizio;
$$;
