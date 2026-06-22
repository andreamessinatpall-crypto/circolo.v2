-- (Fase 8f · richiesta UI) Badge "Popolare" sui premi più richiesti.
--
-- Il socio non può leggere le richieste degli altri (RLS su richieste_premio),
-- quindi il conteggio per premio passa da una funzione SECURITY DEFINER che
-- restituisce solo aggregati (nome del premio + numero di richieste), senza
-- esporre chi le ha fatte.
--
-- Esegui questo script nello SQL editor di Supabase. Senza, il badge "Popolare"
-- semplicemente non compare (nessun errore).

create or replace function public.premi_popolarita()
returns table (nome_premio text, n bigint)
language sql
security definer
set search_path = public
as $$
  select nome_premio, count(*)::bigint as n
  from richieste_premio
  group by nome_premio
$$;

grant execute on function public.premi_popolarita() to authenticated;
