-- (Fase 8d) Valori dei CREDITI separati dai punti.
--
-- Novità della v2: nella v1 un evento dava tanti crediti quanti punti
-- (1 punto = 1 credito). Qui rendiamo i crediti configurabili a parte, con un
-- valore proprio per ogni azione e per ogni sport, sulla riga impostazioni id=1.
--
-- I crediti continueranno comunque ad accreditarsi solo a "modalità premi"
-- accesa e dentro gli intervalli crediti (logica dei blocchi successivi).
--
-- Sicuro e ripetibile (IF NOT EXISTS). Default 0: dopo la migrazione imposta i
-- valori dal pannello Segreteria → Punti e crediti. Eseguire una volta
-- nell'SQL editor di Supabase.

alter table public.impostazioni
  add column if not exists crediti_partita_padel      integer not null default 0,
  add column if not exists crediti_partita_calcio     integer not null default 0,
  add column if not exists crediti_allenamento_padel  integer not null default 0,
  add column if not exists crediti_allenamento_calcio integer not null default 0;
