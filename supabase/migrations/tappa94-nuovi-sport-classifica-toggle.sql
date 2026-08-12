-- Tappa 94: nuovi sport (tennis, pickleball, beachvolley, basket), formato
-- del campo calcio (a5/a7), valori punti/crediti/limiti per sport spostati
-- da colonne fisse a JSONB (per non dover aggiungere colonne ad ogni nuovo
-- sport), toggle modalita_classifica (mirror di modalita_premi).

-- ── 1. Formato del campo calcio ──────────────────────────────────────────
alter table public.campi add column if not exists formato text;
alter table public.campi
  add constraint campi_formato_check check (formato is null or formato in ('a5', 'a7'));

-- ── 2. Vincoli CHECK sullo sport allargati ai 6 sport ────────────────────
alter table public.campi drop constraint campi_sport_check;
alter table public.campi add constraint campi_sport_check
  check (sport = any (array['padel', 'calcio', 'tennis', 'pickleball', 'beachvolley', 'basket']));

alter table public.soci drop constraint soci_sport_preferito_chk;
alter table public.soci add constraint soci_sport_preferito_chk
  check (sport_preferito = any (array['padel', 'calcio', 'tennis', 'pickleball', 'beachvolley', 'basket', 'entrambi']));

alter table public.richieste_partner drop constraint richieste_partner_sport_check;
alter table public.richieste_partner add constraint richieste_partner_sport_check
  check (sport = any (array['padel', 'calcio', 'tennis', 'pickleball', 'beachvolley', 'basket']));

-- Il livello di gioco resta solo per il padel (decisione già presa):
-- generalizzato da "sport='calcio'" a "sport<>'padel'" per coprire anche
-- gli altri sport nuovi, stessa logica di prima (livello valorizzato solo
-- per il padel, null per tutti gli altri).
alter table public.richieste_partner drop constraint richieste_partner_check;
alter table public.richieste_partner add constraint richieste_partner_check
  check (
    (giocatori_mancanti is not null)
    and ((sport = 'padel') or ((sport <> 'padel') and (livello is null)))
  );

alter table public.richieste_lezione drop constraint richieste_lezione_sport_check;
alter table public.richieste_lezione add constraint richieste_lezione_sport_check
  check (sport = any (array['padel', 'calcio', 'tennis', 'pickleball', 'beachvolley', 'basket']));

alter table public.disponibilita_maestri drop constraint disponibilita_maestri_sport_check;
alter table public.disponibilita_maestri add constraint disponibilita_maestri_sport_check
  check (sport = any (array['padel', 'calcio', 'tennis', 'pickleball', 'beachvolley', 'basket']));

alter table public.preferenze_giocatore drop constraint preferenze_giocatore_sport_check;
alter table public.preferenze_giocatore add constraint preferenze_giocatore_sport_check
  check (sport = any (array['padel', 'calcio', 'tennis', 'pickleball', 'beachvolley', 'basket']));

-- tornei/tornei_amici e livelli_gioco NON toccati: fuori scope (vedi piano).

-- ── 3. impostazioni: punti/crediti/limiti per sport, da colonne a JSONB ──
alter table public.impostazioni add column if not exists punti_per_sport jsonb not null default '{}';
alter table public.impostazioni add column if not exists crediti_per_sport jsonb not null default '{}';
alter table public.impostazioni add column if not exists limiti_per_sport jsonb not null default '{}';
alter table public.impostazioni add column if not exists modalita_classifica boolean not null default true;

-- Backfill dai valori esistenti (solo padel/calcio, gli unici sport finora
-- possibili): le vecchie colonne restano intatte, non vengono droppate.
update public.impostazioni set
  punti_per_sport = jsonb_build_object(
    'padel', jsonb_build_object(
      'partita', coalesce(punti_partita_padel, punti_partita, 0),
      'allenamento', coalesce(punti_allenamento_padel, punti_allenamento, 0)
    ),
    'calcio', jsonb_build_object(
      'partita', coalesce(punti_partita_calcio, punti_partita, 0),
      'allenamento', coalesce(punti_allenamento_calcio, punti_allenamento, 0)
    )
  ),
  crediti_per_sport = jsonb_build_object(
    'padel', jsonb_build_object(
      'partita', coalesce(crediti_partita_padel, 0),
      'allenamento', coalesce(crediti_allenamento_padel, 0)
    ),
    'calcio', jsonb_build_object(
      'partita', coalesce(crediti_partita_calcio, 0),
      'allenamento', coalesce(crediti_allenamento_calcio, 0)
    )
  ),
  limiti_per_sport = jsonb_build_object(
    'padel', jsonb_build_object(
      'maxAttive', coalesce(max_pren_padel, 0),
      'maxGiorno', coalesce(max_pren_padel_giorno, 0)
    ),
    'calcio', jsonb_build_object(
      'maxAttive', coalesce(max_pren_calcio, 0),
      'maxGiorno', coalesce(max_pren_calcio_giorno, 0)
    )
  )
where punti_per_sport = '{}';
