-- RLS
alter table public.folders enable row level security;

-- Grants
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.folders to service_role;

create policy folders_select on public.folders
  for select using (owner_id = (select auth.uid()));

create policy folders_insert on public.folders
  for insert with check (owner_id = (select auth.uid()));

create policy folders_update on public.folders
  for update using (owner_id = (select auth.uid()))
              with check (owner_id = (select auth.uid()));

create policy folders_delete on public.folders
  for delete using (owner_id = (select auth.uid()));
