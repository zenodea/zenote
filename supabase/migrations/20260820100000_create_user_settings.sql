create table public.user_settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.user_settings to service_role;

create policy user_settings_select on public.user_settings
  for select using (user_id = (select auth.uid()));

create policy user_settings_insert on public.user_settings
  for insert with check (user_id = (select auth.uid()));

create policy user_settings_update on public.user_settings
  for update using (user_id = (select auth.uid()))
              with check (user_id = (select auth.uid()));

create policy user_settings_delete on public.user_settings
  for delete using (user_id = (select auth.uid()));
