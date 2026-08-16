-- RLS
alter table public.chat_messages enable row level security;

-- Grants
grant select, insert, update, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.chat_messages to service_role;

create policy chat_messages_select on public.chat_messages
  for select using (owner_id = (select auth.uid()));

create policy chat_messages_insert on public.chat_messages
  for insert with check (owner_id = (select auth.uid()));

create policy chat_messages_update on public.chat_messages
  for update using (owner_id = (select auth.uid()))
              with check (owner_id = (select auth.uid()));

create policy chat_messages_delete on public.chat_messages
  for delete using (owner_id = (select auth.uid()));
