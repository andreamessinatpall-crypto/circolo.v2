-- Fase B (Modifica profilo): foto del profilo, caricata dal socio stesso.
-- Come i loghi delle squadre (tappa "logo_url"), salvata come data URL
-- (niente Supabase Storage) — l'immagine viene ridimensionata lato client
-- prima dell'upload, quindi resta piccola.

alter table public.soci add column if not exists foto_url text;
