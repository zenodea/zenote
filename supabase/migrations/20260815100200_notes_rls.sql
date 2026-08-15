-- RLS
alter table public.notes enable row level security;

-- Grants
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.notes to service_role;

create policy notes_select on public.notes
  for select using (owner_id = (select auth.uid()));

create policy notes_insert on public.notes
  for insert with check (owner_id = (select auth.uid()));

create policy notes_update on public.notes
  for update using (owner_id = (select auth.uid()))
              with check (owner_id = (select auth.uid()));

create policy notes_delete on public.notes
  for delete using (owner_id = (select auth.uid()));
