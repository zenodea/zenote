-- RLS
alter table public.chats enable row level security;

-- Grants
grant select, insert, update, delete on public.chats to authenticated;
grant select, insert, update, delete on public.chats to service_role;

create policy chats_select on public.chats
  for select using (owner_id = (select auth.uid()));

create policy chats_insert on public.chats
  for insert with check (owner_id = (select auth.uid()));

create policy chats_update on public.chats
  for update using (owner_id = (select auth.uid()))
              with check (owner_id = (select auth.uid()));

create policy chats_delete on public.chats
  for delete using (owner_id = (select auth.uid()));
