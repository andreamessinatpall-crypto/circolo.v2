-- Fase 9c · Istruttori: funzione accessibile a tutti gli utenti staff.
--
-- Problema: il collaboratore non può leggere la tabella `soci` per via della RLS,
-- quindi non riesce a ottenere la lista degli istruttori (e_allenatore = true)
-- quando deve creare o modificare un allenamento.
--
-- Soluzione: una funzione SECURITY DEFINER (come soci_pubblici) che restituisce
-- solo id/cognome/nome dei soci con e_allenatore = true. Sicura da rieseguire.

create or replace function public.istruttori_attivi()
returns table(id uuid, cognome text, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select id, cognome, nome
  from public.soci
  where e_allenatore = true
    and attivo is not false
  order by cognome, nome;
$$;
