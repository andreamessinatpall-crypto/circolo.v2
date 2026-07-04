-- Fase 2: le nuove tabelle non sono aggiunte automaticamente alla
-- pubblicazione realtime di Supabase — senza questo, i canali sottoscritti
-- in useRealtimeCircolo.ts/useNotifiche.ts non ricevono mai eventi per esse.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messaggi_chat'
  ) then
    alter publication supabase_realtime add table public.messaggi_chat;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifiche'
  ) then
    alter publication supabase_realtime add table public.notifiche;
  end if;
end $$;
