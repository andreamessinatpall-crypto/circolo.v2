-- Il super-admin di piattaforma non può essere né gestore né socio di un
-- circolo: gestisce circoli/giocatori dal pannello dedicato /admin, non
-- entrando nel circolo come un membro qualunque. Due trigger impongono la
-- regola a livello di dati (non solo in UI), in entrambe le direzioni:
-- 1) non si può iscrivere/promuovere in soci_circoli un socio che è già
--    super-admin;
-- 2) non si può promuovere a super-admin un socio che ha già righe in
--    soci_circoli (va prima rimosso da ogni circolo).

create or replace function public.blocca_soci_circoli_per_superadmin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.soci where id = new.socio_id and is_super_admin = true) then
    raise exception 'Un super-admin non può essere iscritto a un circolo (socio_id %)', new.socio_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists blocca_soci_circoli_per_superadmin on public.soci_circoli;
create trigger blocca_soci_circoli_per_superadmin
  before insert or update on public.soci_circoli
  for each row execute function public.blocca_soci_circoli_per_superadmin();

create or replace function public.blocca_promozione_superadmin_con_circoli()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_super_admin = true and coalesce(old.is_super_admin, false) = false then
    if exists (select 1 from public.soci_circoli where socio_id = new.id) then
      raise exception 'Impossibile rendere super-admin un socio ancora iscritto a un circolo (id %): rimuovilo prima da ogni circolo', new.id
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists blocca_promozione_superadmin_con_circoli on public.soci;
create trigger blocca_promozione_superadmin_con_circoli
  before update on public.soci
  for each row execute function public.blocca_promozione_superadmin_con_circoli();
