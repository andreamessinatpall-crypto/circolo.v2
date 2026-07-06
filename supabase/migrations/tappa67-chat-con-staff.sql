-- Tappa 67 · "Staff del club": aggiunta la possibilità di scrivere in chat a
-- collaboratori e istruttori direttamente dalla tab Club, anche senza essere
-- amici (la policy "chat insert" richiedeva sono_amici o un annuncio attivo
-- in "Cerco giocatori" — estesa per includere lo staff in entrambe le
-- direzioni).

create or replace function public.puo_contattare(mittente uuid, destinatario uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select public.sono_amici(mittente, destinatario)
    or exists (
      select 1 from public.richieste_partner r
      where r.socio_id = destinatario and r.scade_il > now()
    )
    or exists (
      select 1 from public.richieste_partner r
      where r.socio_id = mittente and r.scade_il > now()
    )
    or exists (
      select 1 from public.soci s
      where s.id = destinatario and (s.is_allenatore or s.e_allenatore)
    )
    or exists (
      select 1 from public.soci s
      where s.id = mittente and (s.is_allenatore or s.e_allenatore)
    );
$$;
