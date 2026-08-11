-- Multi-tenant · Fase 1: schema base per ospitare più circoli sportivi.
--
-- Introduce l'entità `circoli` come primo livello e sposta i ruoli oggi
-- globali su `soci` (is_admin/is_allenatore/e_allenatore) in una tabella
-- ponte `soci_circoli`, per circolo:
--   - ruolo 'gestore'       = ex is_admin (responsabile/proprietario del circolo)
--   - ruolo 'collaboratore' = ex is_allenatore (staff amministrativo/gestionale)
--   - puo_dare_lezioni      = ex e_allenatore, permesso extra che il gestore
--                             concede a un collaboratore (non esiste più un
--                             ruolo "istruttore" separato)
--   - ruolo 'socio'         = utente normale
--
-- Aggiunge anche `is_super_admin` su `soci`: piattaforma, non legato a un
-- circolo (solo il proprietario della piattaforma).
--
-- Il circolo esistente (dati di prova) diventa il primo tenant "Circoly Club"
-- con id fisso, così ogni riga esistente può essere backfillata in modo
-- deterministico e lo script resta ripetibile (insert ... on conflict do
-- nothing). Le colonne `circolo_id` sulle tabelle di dominio vengono aggiunte
-- nullable, backfillate sul tenant di bootstrap, poi rese NOT NULL.

-- 1) Tabella circoli -----------------------------------------------------

create table if not exists public.circoli (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  logo_url text,
  colore_primario text,
  colore_secondario text,
  apertura_default time not null default '08:30',
  chiusura_default time not null default '22:00',
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);

insert into public.circoli (id, slug, nome)
values ('00000000-0000-0000-0000-000000000001', 'circoly-club', 'Circoly Club')
on conflict (id) do nothing;

-- 2) Super-admin di piattaforma -------------------------------------------

alter table public.soci add column if not exists is_super_admin boolean not null default false;

update public.soci
  set is_super_admin = true
  where email = 'andreamessina.tpall@gmail.com';

-- 3) Ruoli per circolo ------------------------------------------------------

create table if not exists public.soci_circoli (
  id uuid primary key default gen_random_uuid(),
  socio_id uuid not null references public.soci(id) on delete cascade,
  circolo_id uuid not null references public.circoli(id) on delete cascade,
  ruolo text not null default 'socio' check (ruolo in ('socio', 'collaboratore', 'gestore')),
  puo_dare_lezioni boolean not null default false check (not puo_dare_lezioni or ruolo = 'collaboratore'),
  creato_il timestamptz not null default now(),
  unique (socio_id, circolo_id)
);

insert into public.soci_circoli (socio_id, circolo_id, ruolo, puo_dare_lezioni)
select
  id,
  '00000000-0000-0000-0000-000000000001',
  case
    when is_admin then 'gestore'
    when is_allenatore or e_allenatore then 'collaboratore'
    else 'socio'
  end,
  coalesce(e_allenatore, false)
from public.soci
on conflict (socio_id, circolo_id) do nothing;

alter table public.circoli enable row level security;
drop policy if exists "chiunque autenticato legge i circoli" on public.circoli;
create policy "chiunque autenticato legge i circoli"
  on public.circoli
  for select
  to authenticated
  using (true);

alter table public.soci_circoli enable row level security;
drop policy if exists "socio legge le proprie righe" on public.soci_circoli;
create policy "socio legge le proprie righe"
  on public.soci_circoli
  for select
  to authenticated
  using (socio_id = auth.uid());

-- 4) circolo_id sulle tabelle di dominio -----------------------------------

do $$
declare
  t text;
  bootstrap_id uuid := '00000000-0000-0000-0000-000000000001';
  tabelle text[] := array[
    'campi', 'prenotazioni', 'tornei', 'tornei_amici', 'premi',
    'richieste_partner', 'annunci', 'disponibilita_maestri', 'impostazioni',
    'movimenti_punti', 'livelli_gioco', 'preferenze_giocatore',
    'candidature_partner', 'richieste_lezione'
  ];
begin
  foreach t in array tabelle loop
    execute format('alter table public.%I add column if not exists circolo_id uuid references public.circoli(id)', t);
    execute format('update public.%I set circolo_id = %L where circolo_id is null', t, bootstrap_id);
    execute format('alter table public.%I alter column circolo_id set not null', t);
  end loop;
end $$;
