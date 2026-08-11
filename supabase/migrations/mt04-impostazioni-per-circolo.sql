-- Multi-tenant · Fase 8 (nucleo): una riga di `impostazioni` per circolo.
--
-- Finora esisteva UNA sola riga (id=1) e tutto il frontend la leggeva con
-- `.eq('id', 1)` hardcoded — qualunque nuovo circolo (es. "Padel Test Club",
-- creato in Fase 6) non aveva nessuna riga propria. Aggiunge un vincolo di
-- unicità su circolo_id, un trigger che crea automaticamente la riga quando
-- nasce un nuovo circolo (stesso pattern del trigger mt_auto_iscrivi_socio
-- di Fase 2), e fa il backfill per i circoli già esistenti senza riga.

-- `id` aveva come DEFAULT il valore letterale 1 e un CHECK (id = 1) —
-- tabella pensata per un'unica riga: senza rimuoverli nessun secondo
-- circolo potrebbe mai avere la propria riga di impostazioni.
alter table public.impostazioni drop constraint if exists impostazioni_id_check;
alter table public.impostazioni alter column id drop default;
create sequence if not exists public.impostazioni_id_seq owned by public.impostazioni.id;
select setval('public.impostazioni_id_seq', greatest((select max(id) from public.impostazioni), 1));
alter table public.impostazioni alter column id set default nextval('public.impostazioni_id_seq');

alter table public.impostazioni add constraint impostazioni_circolo_id_key unique (circolo_id);

create or replace function public.mt_crea_impostazioni_circolo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.impostazioni (circolo_id)
  values (new.id)
  on conflict (circolo_id) do nothing;
  return new;
end;
$$;

drop trigger if exists mt_crea_impostazioni_circolo on public.circoli;
create trigger mt_crea_impostazioni_circolo
  after insert on public.circoli
  for each row execute function public.mt_crea_impostazioni_circolo();

-- Backfill per i circoli creati prima di questo trigger (es. Padel Test Club).
insert into public.impostazioni (circolo_id)
select c.id
from public.circoli c
left join public.impostazioni i on i.circolo_id = c.id
where i.id is null
on conflict (circolo_id) do nothing;
