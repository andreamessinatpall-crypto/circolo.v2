-- email_esiste controllava solo public.soci, ma la riga in "soci" per un
-- socio auto-registrato viene creata solo al PRIMO accesso riuscito (vedi
-- AuthProvider.creaSchedaSocio). Risultato: chi si era appena registrato e
-- aveva confermato l'email, al primo tentativo di login veniva rimandato
-- di nuovo alla registrazione, perché "soci" era ancora vuoto per lui.
-- Ora controlliamo anche auth.users (accessibile perché la funzione è
-- security definer), così chi ha già un account viene sempre mandato al
-- passo password, anche prima che la scheda socio sia stata creata.

create or replace function public.email_esiste(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.soci
    where lower(email) = lower(trim(p_email))
  ) or exists(
    select 1 from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$;
