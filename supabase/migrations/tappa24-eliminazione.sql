-- Seed del bracket per i tornei a eliminazione diretta.
-- Array JSONB di lunghezza = prossima potenza di 2 rispetto alle squadre.
-- Ogni coppia di elementi adiacenti (0-1, 2-3, …) è un accoppiamento del 1° turno;
-- null = bye (quella squadra avanza direttamente senza giocare).
alter table public.tornei
  add column if not exists bracket_seed jsonb;
