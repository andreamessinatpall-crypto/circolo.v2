-- Multi-tenant · Fase 2: RLS scoping per circolo.
--
-- Riscrive le policy esistenti (basate su e_admin()/is_admin()/
-- puo_gestire_prenotazioni()/puo_gestire_tornei(), tutte globali) perché
-- controllino il ruolo dell'utente nello SPECIFICO circolo della riga, via
-- le nuove funzioni helper sotto. Le funzioni "storiche" senza argomenti
-- restano intatte (non più referenziate da nessuna policy dopo questa
-- migrazione, ma non vengono eliminate per sicurezza/rollback).
--
-- Nota: molte RPC SECURITY DEFINER (classifica_punti, soci_pubblici,
-- istruttori_attivi, assegna_movimento, ecc.) bypassano le RLS delle
-- tabelle e leggono/scrivono ancora senza scoping per circolo. Non sono
-- toccate qui: richiedono anche modifiche al frontend che le chiama
-- (Fase 8). Vedi task "Fase 2b: RPC multi-tenant" nella todo list.

-- PARTE A — helper functions -----------------------------------------------

create or replace function public.e_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.soci
    where id = auth.uid() and is_super_admin = true
  );
$$;

create or replace function public.e_gestore(p_circolo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_super_admin() or exists (
    select 1 from public.soci_circoli sc
    join public.soci s on s.id = sc.socio_id
    where sc.socio_id = auth.uid()
      and sc.circolo_id = p_circolo_id
      and sc.ruolo = 'gestore'
      and s.attivo = true
  );
$$;

create or replace function public.puo_gestire(p_circolo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_super_admin() or exists (
    select 1 from public.soci_circoli sc
    join public.soci s on s.id = sc.socio_id
    where sc.socio_id = auth.uid()
      and sc.circolo_id = p_circolo_id
      and sc.ruolo in ('gestore', 'collaboratore')
      and s.attivo = true
  );
$$;

create or replace function public.e_membro(p_circolo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_super_admin() or exists (
    select 1 from public.soci_circoli sc
    where sc.socio_id = auth.uid()
      and sc.circolo_id = p_circolo_id
  );
$$;

create or replace function public.puo_dare_lezioni(p_circolo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_super_admin() or exists (
    select 1 from public.soci_circoli sc
    where sc.socio_id = auth.uid()
      and sc.circolo_id = p_circolo_id
      and sc.ruolo = 'collaboratore'
      and sc.puo_dare_lezioni = true
  );
$$;

create or replace function public.e_admin(p_circolo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_gestore(p_circolo_id);
$$;

create or replace function public.is_admin(p_circolo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_gestore(p_circolo_id);
$$;

create or replace function public.puo_gestire_prenotazioni(p_circolo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.puo_gestire(p_circolo_id);
$$;

create or replace function public.puo_gestire_tornei(p_circolo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.puo_gestire(p_circolo_id);
$$;

-- soci non ha circolo_id proprio (identità globale): un membro dello staff
-- può leggere/gestire solo i soci che condividono con lui almeno un
-- circolo in cui lui è gestore o collaboratore.
create or replace function public.puo_gestire_socio(p_socio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_super_admin() or exists (
    select 1
    from public.soci_circoli mio
    join public.soci_circoli target
      on target.circolo_id = mio.circolo_id
     and target.socio_id = p_socio_id
    join public.soci s on s.id = mio.socio_id
    where mio.socio_id = auth.uid()
      and mio.ruolo in ('gestore', 'collaboratore')
      and s.attivo = true
  );
$$;

-- Stop-gap fino alla Fase 6 (selezione circolo lato socio): iscrive
-- automaticamente ogni nuovo socio al circolo di bootstrap, altrimenti un
-- neo-iscritto non vedrebbe nulla (nessuna riga in soci_circoli). Da
-- rimuovere/sostituire quando la Fase 6 introduce la vera selezione.
create or replace function public.mt_auto_iscrivi_socio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.soci_circoli (socio_id, circolo_id, ruolo)
  values (new.id, '00000000-0000-0000-0000-000000000001', 'socio')
  on conflict (socio_id, circolo_id) do nothing;
  return new;
end;
$$;

drop trigger if exists mt_auto_iscrivi_socio on public.soci;
create trigger mt_auto_iscrivi_socio
  after insert on public.soci
  for each row execute function public.mt_auto_iscrivi_socio();

-- PARTE B — circoli / soci_circoli ------------------------------------------

drop policy if exists "super admin crea circoli" on public.circoli;
create policy "super admin crea circoli"
  on public.circoli for insert to authenticated
  with check (public.e_super_admin());

drop policy if exists "gestore modifica il proprio circolo" on public.circoli;
create policy "gestore modifica il proprio circolo"
  on public.circoli for update to authenticated
  using (public.e_gestore(id))
  with check (public.e_gestore(id));

drop policy if exists "super admin elimina circoli" on public.circoli;
create policy "super admin elimina circoli"
  on public.circoli for delete to authenticated
  using (public.e_super_admin());

drop policy if exists "staff legge soci_circoli del proprio circolo" on public.soci_circoli;
create policy "staff legge soci_circoli del proprio circolo"
  on public.soci_circoli for select to authenticated
  using (public.puo_gestire(circolo_id));

drop policy if exists "iscrizione o gestione ruoli" on public.soci_circoli;
create policy "iscrizione o gestione ruoli"
  on public.soci_circoli for insert to authenticated
  with check (
    public.e_super_admin()
    or (socio_id = auth.uid() and ruolo = 'socio')
    or public.e_gestore(circolo_id)
  );

drop policy if exists "gestore aggiorna i ruoli del proprio circolo" on public.soci_circoli;
create policy "gestore aggiorna i ruoli del proprio circolo"
  on public.soci_circoli for update to authenticated
  using (public.e_gestore(circolo_id))
  with check (public.e_gestore(circolo_id));

drop policy if exists "esci dal circolo o gestore rimuove" on public.soci_circoli;
create policy "esci dal circolo o gestore rimuove"
  on public.soci_circoli for delete to authenticated
  using (socio_id = auth.uid() or public.e_gestore(circolo_id));

-- PARTE C — soci: lo staff vede/gestisce solo chi condivide un circolo -----

drop policy if exists "admin iscrive nuovi soci" on public.soci;
drop policy if exists "collaboratore inserisce soci" on public.soci;
create policy "super admin crea soci manualmente"
  on public.soci for insert to authenticated
  with check (public.e_super_admin());

drop policy if exists "admin legge tutti i soci" on public.soci;
drop policy if exists "collaboratore legge tutti i soci" on public.soci;
create policy "staff legge i soci del proprio circolo"
  on public.soci for select to authenticated
  using (public.puo_gestire_socio(id));

drop policy if exists "admin modifica i soci" on public.soci;
drop policy if exists "collaboratore aggiorna soci" on public.soci;
create policy "staff modifica i soci del proprio circolo"
  on public.soci for update to authenticated
  using (public.puo_gestire_socio(id))
  with check (public.puo_gestire_socio(id));

-- PARTE D — tabelle con circolo_id diretto -----------------------------------

-- campi
drop policy if exists "Gli admin modificano i campi" on public.campi;
drop policy if exists "admin modifica campi" on public.campi;
create policy "gestore modifica campi"
  on public.campi for update to authenticated
  using (public.e_admin(circolo_id))
  with check (public.e_admin(circolo_id));

drop policy if exists "admin crea campi" on public.campi;
create policy "gestore crea campi"
  on public.campi for insert to authenticated
  with check (public.e_admin(circolo_id));

drop policy if exists "admin elimina campi" on public.campi;
create policy "gestore elimina campi"
  on public.campi for delete to authenticated
  using (public.e_admin(circolo_id));

drop policy if exists "I soci attivi vedono i campi" on public.campi;
create policy "i membri del circolo vedono i campi"
  on public.campi for select to authenticated
  using (socio_attivo() and public.e_membro(circolo_id));

-- prenotazioni
drop policy if exists "Annullamento proprio o da admin" on public.prenotazioni;
create policy "Annullamento proprio o da admin"
  on public.prenotazioni for delete to authenticated
  using (
    (socio_id = auth.uid() and socio_attivo() and inizio > now())
    or public.e_admin(circolo_id)
  );

drop policy if exists "I soci attivi leggono le prenotazioni" on public.prenotazioni;
create policy "I soci attivi leggono le prenotazioni"
  on public.prenotazioni for select to authenticated
  using (socio_attivo() and public.e_membro(circolo_id));

drop policy if exists "I soci attivi prenotano per sé" on public.prenotazioni;
create policy "I soci attivi prenotano per sé"
  on public.prenotazioni for insert to authenticated
  with check (
    socio_id = auth.uid()
    and socio_attivo()
    and public.e_membro(circolo_id)
    and inizio > now()
    and (((inizio at time zone 'Europe/Rome'))::date <= (((now() at time zone 'Europe/Rome'))::date + giorni_anticipo()))
    and exists (
      select 1 from public.campi c
      where c.id = prenotazioni.campo_id
        and c.in_servizio
        and c.circolo_id = prenotazioni.circolo_id
    )
  );

drop policy if exists "admin aggiorna prenotazioni" on public.prenotazioni;
create policy "admin aggiorna prenotazioni"
  on public.prenotazioni for update to authenticated
  using (public.e_admin(circolo_id))
  with check (public.e_admin(circolo_id));

drop policy if exists "admin prenota sempre" on public.prenotazioni;
create policy "admin prenota sempre"
  on public.prenotazioni for insert to authenticated
  with check (public.e_admin(circolo_id));

drop policy if exists "prenotazioni_gestori_incontri_del" on public.prenotazioni;
create policy "prenotazioni_gestori_incontri_del"
  on public.prenotazioni for delete to authenticated
  using (public.puo_gestire_tornei(circolo_id) and incontro_id is not null);

drop policy if exists "prenotazioni_gestori_incontri_ins" on public.prenotazioni;
create policy "prenotazioni_gestori_incontri_ins"
  on public.prenotazioni for insert to authenticated
  with check (public.puo_gestire_tornei(circolo_id) and incontro_id is not null);

drop policy if exists "staff cancella prenotazioni" on public.prenotazioni;
create policy "staff cancella prenotazioni"
  on public.prenotazioni for delete to authenticated
  using (public.puo_gestire_prenotazioni(circolo_id));

drop policy if exists "staff inserisce prenotazioni" on public.prenotazioni;
create policy "staff inserisce prenotazioni"
  on public.prenotazioni for insert to authenticated
  with check (public.puo_gestire_prenotazioni(circolo_id));

drop policy if exists "staff modifica prenotazioni" on public.prenotazioni;
create policy "staff modifica prenotazioni"
  on public.prenotazioni for update to authenticated
  using (public.puo_gestire_prenotazioni(circolo_id))
  with check (public.puo_gestire_prenotazioni(circolo_id));

-- tornei
drop policy if exists "admin gestisce tornei" on public.tornei;
create policy "admin gestisce tornei"
  on public.tornei for all to public
  using (public.e_admin(circolo_id))
  with check (public.e_admin(circolo_id));

drop policy if exists "leggi tornei" on public.tornei;
create policy "leggi tornei"
  on public.tornei for select to public
  using (socio_attivo() and public.e_membro(circolo_id) and (public.e_admin(circolo_id) or stato <> 'bozza'));

drop policy if exists "tornei_gestori_all" on public.tornei;
create policy "tornei_gestori_all"
  on public.tornei for all to authenticated
  using (public.puo_gestire_tornei(circolo_id))
  with check (public.puo_gestire_tornei(circolo_id));

-- premi
drop policy if exists "premi_admin" on public.premi;
create policy "premi_admin"
  on public.premi for all to authenticated
  using (public.e_admin(circolo_id))
  with check (public.e_admin(circolo_id));

drop policy if exists "premi_lettura" on public.premi;
create policy "premi_lettura"
  on public.premi for select to authenticated
  using (public.e_membro(circolo_id));

-- richieste_partner
drop policy if exists "richieste_partner select" on public.richieste_partner;
create policy "richieste_partner select"
  on public.richieste_partner for select to authenticated
  using (public.e_membro(circolo_id));

drop policy if exists "richieste_partner insert" on public.richieste_partner;
create policy "richieste_partner insert"
  on public.richieste_partner for insert to authenticated
  with check (socio_id = auth.uid() and public.e_membro(circolo_id));

-- annunci
drop policy if exists "admin crea annunci" on public.annunci;
create policy "admin crea annunci"
  on public.annunci for insert to authenticated
  with check (public.e_admin(circolo_id));

drop policy if exists "admin elimina annunci" on public.annunci;
create policy "admin elimina annunci"
  on public.annunci for delete to authenticated
  using (public.e_admin(circolo_id));

drop policy if exists "admin modifica annunci" on public.annunci;
create policy "admin modifica annunci"
  on public.annunci for update to authenticated
  using (public.e_admin(circolo_id))
  with check (public.e_admin(circolo_id));

drop policy if exists "tutti leggono annunci" on public.annunci;
create policy "tutti leggono annunci"
  on public.annunci for select to authenticated
  using (public.e_membro(circolo_id));

-- disponibilita_maestri
drop policy if exists "disponibilita select" on public.disponibilita_maestri;
create policy "disponibilita select"
  on public.disponibilita_maestri for select to authenticated
  using (public.e_membro(circolo_id));

drop policy if exists "disponibilita insert" on public.disponibilita_maestri;
create policy "disponibilita insert"
  on public.disponibilita_maestri for insert to authenticated
  with check (istruttore_id = auth.uid() and public.puo_dare_lezioni(circolo_id));

-- impostazioni
drop policy if exists "Gli admin modificano le impostazioni" on public.impostazioni;
create policy "Gli admin modificano le impostazioni"
  on public.impostazioni for update to authenticated
  using (public.e_admin(circolo_id))
  with check (public.e_admin(circolo_id));

drop policy if exists "I soci attivi leggono le impostazioni" on public.impostazioni;
create policy "I soci attivi leggono le impostazioni"
  on public.impostazioni for select to authenticated
  using (socio_attivo() and public.e_membro(circolo_id));

drop policy if exists "super admin crea impostazioni" on public.impostazioni;
create policy "super admin crea impostazioni"
  on public.impostazioni for insert to authenticated
  with check (public.e_super_admin());

-- richieste_lezione
drop policy if exists "richieste_lezione insert" on public.richieste_lezione;
create policy "richieste_lezione insert"
  on public.richieste_lezione for insert to authenticated
  with check (
    socio_id = auth.uid()
    and public.e_membro(circolo_id)
    and exists (
      select 1 from public.soci_circoli sc
      where sc.socio_id = richieste_lezione.istruttore_id
        and sc.circolo_id = richieste_lezione.circolo_id
        and sc.puo_dare_lezioni = true
    )
  );

-- richieste_premio: aggiunta circolo_id (premio_id è nullable, non ci si
-- può affidare solo alla FK per derivare il circolo).
alter table public.richieste_premio add column if not exists circolo_id uuid references public.circoli(id);
update public.richieste_premio set circolo_id = '00000000-0000-0000-0000-000000000001' where circolo_id is null;
alter table public.richieste_premio alter column circolo_id set not null;

drop policy if exists "richieste_lettura" on public.richieste_premio;
create policy "richieste_lettura"
  on public.richieste_premio for select to authenticated
  using (socio_id = auth.uid() or public.e_admin(circolo_id));

-- PARTE E — tabelle con circolo_id ereditato dal genitore --------------------

-- americano_partite (-> tornei)
drop policy if exists "staff_gestisce" on public.americano_partite;
create policy "staff_gestisce"
  on public.americano_partite for all to public
  using (exists (select 1 from public.tornei t where t.id = americano_partite.torneo_id and public.puo_gestire(t.circolo_id)))
  with check (exists (select 1 from public.tornei t where t.id = americano_partite.torneo_id and public.puo_gestire(t.circolo_id)));

drop policy if exists "tutti_leggono" on public.americano_partite;
create policy "tutti_leggono"
  on public.americano_partite for select to public
  using (exists (select 1 from public.tornei t where t.id = americano_partite.torneo_id and public.e_membro(t.circolo_id)));

-- incontri (-> tornei)
drop policy if exists "admin gestisce incontri" on public.incontri;
create policy "admin gestisce incontri"
  on public.incontri for all to public
  using (exists (select 1 from public.tornei t where t.id = incontri.torneo_id and public.e_admin(t.circolo_id)))
  with check (exists (select 1 from public.tornei t where t.id = incontri.torneo_id and public.e_admin(t.circolo_id)));

drop policy if exists "incontri_gestori_all" on public.incontri;
create policy "incontri_gestori_all"
  on public.incontri for all to authenticated
  using (exists (select 1 from public.tornei t where t.id = incontri.torneo_id and public.puo_gestire_tornei(t.circolo_id)))
  with check (exists (select 1 from public.tornei t where t.id = incontri.torneo_id and public.puo_gestire_tornei(t.circolo_id)));

drop policy if exists "leggi incontri" on public.incontri;
create policy "leggi incontri"
  on public.incontri for select to public
  using (
    socio_attivo() and exists (
      select 1 from public.tornei t
      where t.id = incontri.torneo_id
        and public.e_membro(t.circolo_id)
        and (public.e_admin(t.circolo_id) or t.stato <> 'bozza')
    )
  );

-- squadre (-> tornei)
drop policy if exists "admin gestisce squadre" on public.squadre;
create policy "admin gestisce squadre"
  on public.squadre for all to public
  using (exists (select 1 from public.tornei t where t.id = squadre.torneo_id and public.e_admin(t.circolo_id)))
  with check (exists (select 1 from public.tornei t where t.id = squadre.torneo_id and public.e_admin(t.circolo_id)));

drop policy if exists "squadre_gestori_all" on public.squadre;
create policy "squadre_gestori_all"
  on public.squadre for all to authenticated
  using (exists (select 1 from public.tornei t where t.id = squadre.torneo_id and public.puo_gestire_tornei(t.circolo_id)))
  with check (exists (select 1 from public.tornei t where t.id = squadre.torneo_id and public.puo_gestire_tornei(t.circolo_id)));

drop policy if exists "leggi squadre" on public.squadre;
create policy "leggi squadre"
  on public.squadre for select to public
  using (
    socio_attivo() and exists (
      select 1 from public.tornei t
      where t.id = squadre.torneo_id
        and public.e_membro(t.circolo_id)
        and (public.e_admin(t.circolo_id) or t.stato <> 'bozza')
    )
  );

-- squadra_componenti (-> tornei)
drop policy if exists "admin gestisce componenti" on public.squadra_componenti;
create policy "admin gestisce componenti"
  on public.squadra_componenti for all to public
  using (exists (select 1 from public.tornei t where t.id = squadra_componenti.torneo_id and public.e_admin(t.circolo_id)))
  with check (exists (select 1 from public.tornei t where t.id = squadra_componenti.torneo_id and public.e_admin(t.circolo_id)));

drop policy if exists "squadra_componenti_gestori_all" on public.squadra_componenti;
create policy "squadra_componenti_gestori_all"
  on public.squadra_componenti for all to authenticated
  using (exists (select 1 from public.tornei t where t.id = squadra_componenti.torneo_id and public.puo_gestire_tornei(t.circolo_id)))
  with check (exists (select 1 from public.tornei t where t.id = squadra_componenti.torneo_id and public.puo_gestire_tornei(t.circolo_id)));

drop policy if exists "leggi componenti" on public.squadra_componenti;
create policy "leggi componenti"
  on public.squadra_componenti for select to public
  using (
    socio_attivo() and exists (
      select 1 from public.tornei t
      where t.id = squadra_componenti.torneo_id
        and public.e_membro(t.circolo_id)
        and (public.e_admin(t.circolo_id) or t.stato <> 'bozza')
    )
  );

-- partecipanti_amichevole (-> prenotazioni)
drop policy if exists "aggiungi partecipanti amichevole" on public.partecipanti_amichevole;
create policy "aggiungi partecipanti amichevole"
  on public.partecipanti_amichevole for insert to public
  with check (
    exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.e_admin(p.circolo_id))
    or (
      socio_attivo() and confermato = false
      and exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and p.socio_id = auth.uid())
      and socio_attivo_id(socio_id)
      and (socio_id = auth.uid() or sono_amici(auth.uid(), socio_id))
    )
  );

drop policy if exists "conferma partecipanti amichevole" on public.partecipanti_amichevole;
create policy "conferma partecipanti amichevole"
  on public.partecipanti_amichevole for update to public
  using (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.e_admin(p.circolo_id)))
  with check (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.e_admin(p.circolo_id)));

drop policy if exists "leggi partecipanti amichevole" on public.partecipanti_amichevole;
create policy "leggi partecipanti amichevole"
  on public.partecipanti_amichevole for select to public
  using (
    socio_attivo() and (
      socio_id = auth.uid()
      or exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and (p.socio_id = auth.uid() or public.e_admin(p.circolo_id)))
    )
  );

drop policy if exists "rimuovi partecipanti amichevole" on public.partecipanti_amichevole;
create policy "rimuovi partecipanti amichevole"
  on public.partecipanti_amichevole for delete to public
  using (
    exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.e_admin(p.circolo_id))
    or (
      socio_attivo() and confermato = false
      and exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and p.socio_id = auth.uid())
    )
  );

drop policy if exists "staff aggiorna partecipanti" on public.partecipanti_amichevole;
create policy "staff aggiorna partecipanti"
  on public.partecipanti_amichevole for update to authenticated
  using (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.puo_gestire_prenotazioni(p.circolo_id)))
  with check (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.puo_gestire_prenotazioni(p.circolo_id)));

drop policy if exists "staff aggiunge partecipanti" on public.partecipanti_amichevole;
create policy "staff aggiunge partecipanti"
  on public.partecipanti_amichevole for insert to authenticated
  with check (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.puo_gestire_prenotazioni(p.circolo_id)));

drop policy if exists "staff rimuove partecipanti" on public.partecipanti_amichevole;
create policy "staff rimuove partecipanti"
  on public.partecipanti_amichevole for delete to authenticated
  using (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.puo_gestire_prenotazioni(p.circolo_id)));

drop policy if exists "staff vede partecipanti" on public.partecipanti_amichevole;
create policy "staff vede partecipanti"
  on public.partecipanti_amichevole for select to authenticated
  using (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and public.puo_gestire_prenotazioni(p.circolo_id)));

-- superate dalle policy "staff ..." qui sopra (is_allenatore = collaboratore
-- ora già coperto da puo_gestire_prenotazioni scoping per circolo).
drop policy if exists "allenatore aggiunge partecipanti" on public.partecipanti_amichevole;
drop policy if exists "allenatore toglie partecipanti" on public.partecipanti_amichevole;

drop policy if exists "istruttore aggiorna propri partecipanti" on public.partecipanti_amichevole;
create policy "istruttore aggiorna propri partecipanti"
  on public.partecipanti_amichevole for update to authenticated
  using (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and p.allenatore_id = auth.uid() and public.puo_dare_lezioni(p.circolo_id)))
  with check (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and p.allenatore_id = auth.uid() and public.puo_dare_lezioni(p.circolo_id)));

drop policy if exists "istruttore aggiunge ai propri allenamenti" on public.partecipanti_amichevole;
create policy "istruttore aggiunge ai propri allenamenti"
  on public.partecipanti_amichevole for insert to authenticated
  with check (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and p.allenatore_id = auth.uid() and public.puo_dare_lezioni(p.circolo_id)));

drop policy if exists "istruttore rimuove propri partecipanti" on public.partecipanti_amichevole;
create policy "istruttore rimuove propri partecipanti"
  on public.partecipanti_amichevole for delete to authenticated
  using (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and p.allenatore_id = auth.uid() and public.puo_dare_lezioni(p.circolo_id)));

drop policy if exists "istruttore vede propri partecipanti" on public.partecipanti_amichevole;
create policy "istruttore vede propri partecipanti"
  on public.partecipanti_amichevole for select to authenticated
  using (exists (select 1 from public.prenotazioni p where p.id = partecipanti_amichevole.prenotazione_id and p.allenatore_id = auth.uid() and public.puo_dare_lezioni(p.circolo_id)));

-- amichevoli_confermate (-> prenotazioni)
drop policy if exists "admin chiude amichevole" on public.amichevoli_confermate;
create policy "admin chiude amichevole"
  on public.amichevoli_confermate for insert to public
  with check (
    exists (select 1 from public.prenotazioni p where p.id = amichevoli_confermate.prenotazione_id and public.e_admin(p.circolo_id))
    and confermata_da = auth.uid()
  );

drop policy if exists "admin legge amichevoli confermate" on public.amichevoli_confermate;
create policy "admin legge amichevoli confermate"
  on public.amichevoli_confermate for select to public
  using (exists (select 1 from public.prenotazioni p where p.id = amichevoli_confermate.prenotazione_id and public.e_admin(p.circolo_id)));

drop policy if exists "admin riapre amichevole" on public.amichevoli_confermate;
create policy "admin riapre amichevole"
  on public.amichevoli_confermate for delete to public
  using (exists (select 1 from public.prenotazioni p where p.id = amichevoli_confermate.prenotazione_id and public.e_admin(p.circolo_id)));

-- richieste_iscrizione (-> tornei)
drop policy if exists "richiesta delete" on public.richieste_iscrizione;
create policy "richiesta delete"
  on public.richieste_iscrizione for delete to authenticated
  using (
    richiedente_id = auth.uid()
    or exists (select 1 from public.tornei t where t.id = richieste_iscrizione.torneo_id and public.puo_gestire_prenotazioni(t.circolo_id))
  );

drop policy if exists "richiesta select" on public.richieste_iscrizione;
create policy "richiesta select"
  on public.richieste_iscrizione for select to authenticated
  using (
    richiedente_id = auth.uid()
    or exists (select 1 from public.tornei t where t.id = richieste_iscrizione.torneo_id and public.puo_gestire_prenotazioni(t.circolo_id))
  );
