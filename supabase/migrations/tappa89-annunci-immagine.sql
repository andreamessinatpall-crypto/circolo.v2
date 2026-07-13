-- Immagine facoltativa per gli annunci (banner), salvata come data URL come
-- già fatto per foto profilo/loghi/medaglie (vedi src/lib/immagini.ts) —
-- niente Supabase Storage in questo progetto.
alter table public.annunci
  add column if not exists immagine text null;
