-- Tappa 33 · Regole istruttori.
--
-- 1) classifica_visibile(): esclude gli istruttori (e_allenatore = true).
-- 2) soci_pubblici(): aggiunge il campo e_allenatore al risultato
--    (usato dal frontend per mostrare gli istruttori come "staff" automatico).
-- 3) Trigger che azzera punti e crediti quando il socio è un istruttore,
--    impedendo che li accumulino anche se le RPC li aggiornassero.

-- 1. Classifica senza istruttori ------------------------------------------
drop function if exists public.classifica_visibile();
create or replace function public.classifica_visibile()
returns table(
  posizione bigint,
  etichetta text,
  punti     integer,
  is_me     boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with amici_miei as (
    select
      case
        when richiedente = auth.uid() then destinatario
        else richiedente
      end as amico_id
    from public.amicizie
    where stato = 'accettata'
      and (richiedente = auth.uid() or destinatario = auth.uid())
  ),
  ranked as (
    select
      rank() over (order by s.punti desc nulls last) as pos,
      s.id,
      s.cognome || ' ' || s.nome                    as nome_completo,
      s.punti,
      s.mostra_in_classifica,
      (s.id = auth.uid())                           as is_me
    from public.soci s
    where s.attivo is not false
      and (s.e_allenatore is null or s.e_allenatore = false)
      and (s.punti_bloccati is null or s.punti_bloccati = false)
      and coalesce(s.punti, 0) >= 1
  )
  select
    r.pos::bigint as posizione,
    case
      when r.is_me                 then r.nome_completo
      when r.mostra_in_classifica  then r.nome_completo
      when am.amico_id is not null then r.nome_completo
      else 'Giocatore'
    end           as etichetta,
    r.punti,
    r.is_me
  from ranked r
  left join amici_miei am on am.amico_id = r.id
  order by r.pos, r.nome_completo
$$;

-- 2. soci_pubblici() con campo e_allenatore --------------------------------
-- La firma cambia (aggiunge colonna), quindi drop + create.
drop function if exists public.soci_pubblici();
create or replace function public.soci_pubblici()
returns table(
  id           uuid,
  etichetta    text,
  e_allenatore boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.cognome || ' ' || s.nome  as etichetta,
    coalesce(s.e_allenatore, false) as e_allenatore
  from public.soci s
  where s.attivo is not false
    and (s.is_admin is null or s.is_admin = false)
  order by s.cognome, s.nome;
$$;

-- 3. Trigger: azzera punti/crediti per istruttori --------------------------
create or replace function public.blocca_punti_istruttore()
returns trigger
language plpgsql
as $$
begin
  if new.e_allenatore = true then
    new.punti   := 0;
    new.crediti := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_blocca_punti_istruttore on public.soci;
create trigger trg_blocca_punti_istruttore
  before update on public.soci
  for each row
  execute function public.blocca_punti_istruttore();

-- Azzera subito i valori correnti per gli istruttori già presenti.
update public.soci
set punti = 0, crediti = 0
where e_allenatore = true
  and (punti <> 0 or crediti <> 0);
