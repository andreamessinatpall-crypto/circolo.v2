-- Fase 3bis (revisione): il questionario "Livello di gioco" è solo per il
-- padel (il calcio è escluso su richiesta). Il punteggio ora è una MEDIA
-- 1-5 con tre livelli (non più quattro): Principiante/Intermedio/Avanzato.
-- Le righe create durante il test della versione precedente non sono più
-- valide con il nuovo modello: le rimuoviamo prima di stringere i vincoli.

delete from public.livelli_gioco where sport <> 'padel' or livello = 'esperto';

alter table public.livelli_gioco drop constraint if exists livelli_gioco_sport_check;
alter table public.livelli_gioco add constraint livelli_gioco_sport_check check (sport = 'padel');

alter table public.livelli_gioco drop constraint if exists livelli_gioco_livello_check;
alter table public.livelli_gioco add constraint livelli_gioco_livello_check
  check (livello in ('principiante', 'intermedio', 'avanzato'));
