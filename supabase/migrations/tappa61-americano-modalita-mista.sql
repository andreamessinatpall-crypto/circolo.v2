-- Fase 6bis: modalità "Misto" per l'Americano ufficiale (coppie uomo-donna).
-- Aggiunge la colonna che sceglie la modalità e il genere alla RPC pubblica
-- soci_pubblici(), necessario per validare l'iscrizione mista e generare le
-- coppie U/D nel client.

alter table public.tornei
  add column if not exists modalita_americano text not null default 'normale'
  constraint tornei_modalita_americano_check check (modalita_americano in ('normale', 'misto'));

drop function if exists public.soci_pubblici();

create or replace function public.soci_pubblici()
returns table(
  id uuid,
  etichetta text,
  e_allenatore boolean,
  is_admin boolean,
  is_allenatore boolean,
  punti integer,
  sport_preferito text,
  data_iscrizione date,
  genere text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.cognome || ' ' || s.nome          as etichetta,
    coalesce(s.e_allenatore,  false)    as e_allenatore,
    coalesce(s.is_admin,      false)    as is_admin,
    coalesce(s.is_allenatore, false)    as is_allenatore,
    coalesce(s.punti, 0)                as punti,
    s.sport_preferito                   as sport_preferito,
    s.data_iscrizione::date             as data_iscrizione,
    s.genere                            as genere
  from public.soci s
  where s.attivo is not false
    and coalesce(s.sospeso, false) = false
    and (s.is_admin is null or s.is_admin = false)
  order by s.cognome, s.nome;
$$;
