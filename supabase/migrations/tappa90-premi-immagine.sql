-- Immagine facoltativa per i premi (stile catalogo/market), stesso pattern
-- data URL degli annunci (tappa89) — niente Supabase Storage.
alter table public.premi
  add column if not exists immagine text null;
