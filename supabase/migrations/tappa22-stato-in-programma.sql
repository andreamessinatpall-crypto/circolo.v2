-- Aggiunge 'in_programma' ai valori consentiti per tornei.stato.
alter table public.tornei
  drop constraint if exists tornei_stato_check;

alter table public.tornei
  add constraint tornei_stato_check
  check (stato in ('bozza', 'in_programma', 'in_corso', 'concluso'));
