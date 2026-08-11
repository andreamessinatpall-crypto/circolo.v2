-- Multi-tenant · Fase 2 fix: DEFAULT su circolo_id per le tabelle scritte
-- direttamente dal frontend, che non passa ancora circolo_id esplicitamente
-- (lo farà la Fase 8). Senza DEFAULT, ogni insert falliva per violazione
-- NOT NULL invece che per RLS. Il DEFAULT punta al tenant di bootstrap
-- "Circoly Club" e va rimosso quando la Fase 5/8 rendono il frontend
-- circolo-aware.
do $$
declare
  t text;
  bootstrap_id uuid := '00000000-0000-0000-0000-000000000001';
  tabelle text[] := array[
    'campi', 'prenotazioni', 'tornei', 'tornei_amici', 'premi',
    'richieste_partner', 'annunci', 'disponibilita_maestri', 'impostazioni',
    'movimenti_punti', 'livelli_gioco', 'preferenze_giocatore',
    'candidature_partner', 'richieste_lezione', 'richieste_premio'
  ];
begin
  foreach t in array tabelle loop
    execute format('alter table public.%I alter column circolo_id set default %L', t, bootstrap_id);
  end loop;
end $$;
