-- "Attività in programma" (RPC partite_in_programma, non ancora tracciata
-- nelle migration) mostrava solo le prenotazioni dove il socio è
-- PARTECIPANTE. Un istruttore assegnato come allenatore di una lezione ma
-- non presente tra i partecipanti non la vedeva. La estendiamo per includere
-- anche le prenotazioni dove il socio è l'istruttore (allenatore_id), con
-- LEFT JOIN sui partecipanti così una lezione senza ancora nessun
-- partecipante iscritto compare comunque (prima un INNER JOIN da
-- partecipanti_amichevole l'avrebbe esclusa del tutto).

create or replace function public.partite_in_programma()
returns table(
  prenotazione_id text,
  inizio          timestamptz,
  fine            timestamptz,
  campo_nome      text,
  sport           text,
  socio_id        uuid,
  confermato      boolean,
  prenotante_id   uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id::text     as prenotazione_id,
    pr.inizio,
    pr.fine,
    c.nome          as campo_nome,
    c.sport         as sport,
    pa.socio_id,
    pa.confermato,
    pr.socio_id     as prenotante_id
  from prenotazioni pr
  join campi c on c.id = pr.campo_id
  left join partecipanti_amichevole pa on pa.prenotazione_id = pr.id
  where pr.fine >= now()
    and (
      pr.id in (select prenotazione_id from partecipanti_amichevole where socio_id = auth.uid())
      or pr.allenatore_id = auth.uid()
    )
  order by pr.inizio asc, pa.socio_id asc;
$$;
