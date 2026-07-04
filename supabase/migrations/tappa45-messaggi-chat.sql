-- Fase 2: chat 1-a-1 tra amici.
-- Si può scrivere solo se esiste un'amicizia accettata tra mittente e
-- destinatario: verificato sia in RLS (qui) sia in UI (useChat.ts).

create or replace function public.sono_amici(a uuid, b uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.amicizie
    where stato = 'accettata'
      and ((richiedente = a and destinatario = b) or (richiedente = b and destinatario = a))
  );
$$;

create table if not exists public.messaggi_chat (
  id              bigint generated always as identity primary key,
  mittente_id     uuid not null references public.soci(id) on delete cascade,
  destinatario_id uuid not null references public.soci(id) on delete cascade,
  testo           text not null,
  creato_il       timestamptz not null default now(),
  letto           boolean not null default false
);

create index if not exists messaggi_chat_coppia_idx
  on public.messaggi_chat (mittente_id, destinatario_id, creato_il);
create index if not exists messaggi_chat_destinatario_idx
  on public.messaggi_chat (destinatario_id, mittente_id, creato_il);

alter table public.messaggi_chat enable row level security;

drop policy if exists "chat select" on public.messaggi_chat;
drop policy if exists "chat insert" on public.messaggi_chat;
drop policy if exists "chat update" on public.messaggi_chat;

create policy "chat select"
  on public.messaggi_chat for select to authenticated
  using (mittente_id = auth.uid() or destinatario_id = auth.uid());

create policy "chat insert"
  on public.messaggi_chat for insert to authenticated
  with check (mittente_id = auth.uid() and public.sono_amici(mittente_id, destinatario_id));

-- UPDATE: solo il destinatario, per segnare i messaggi ricevuti come letti.
create policy "chat update"
  on public.messaggi_chat for update to authenticated
  using (destinatario_id = auth.uid())
  with check (destinatario_id = auth.uid());
