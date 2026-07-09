-- Login progressivo: prima l'email, poi (se esiste già un socio con
-- quell'email) la password, altrimenti si manda alla registrazione.
-- Serve un modo per controllare l'esistenza dell'email PRIMA del login,
-- quindi chiamabile da un client anonimo (non autenticato) — restituisce
-- solo un booleano, mai altri dati del socio.

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
  );
$$;

grant execute on function public.email_esiste(text) to anon, authenticated;
