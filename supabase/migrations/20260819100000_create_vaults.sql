create table public.vaults (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (name <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create trigger vaults_updated_at
  before update on public.vaults
  for each row execute function public.set_updated_at();

alter table public.vaults enable row level security;

grant select, insert, update, delete on public.vaults to authenticated;
grant select, insert, update, delete on public.vaults to service_role;

create policy vaults_select on public.vaults
  for select using (owner_id = (select auth.uid()));

create policy vaults_insert on public.vaults
  for insert with check (owner_id = (select auth.uid()));

create policy vaults_update on public.vaults
  for update using (owner_id = (select auth.uid()))
              with check (owner_id = (select auth.uid()));

create policy vaults_delete on public.vaults
  for delete using (owner_id = (select auth.uid()));

insert into public.vaults (owner_id, name)
select owner_id, 'Initial Vault' from (
  select owner_id from public.notes
  union
  select owner_id from public.folders
  union
  select owner_id from public.chats
) owners;

alter table public.notes add column vault_id uuid;
update public.notes n set vault_id = v.id from public.vaults v where v.owner_id = n.owner_id;
alter table public.notes alter column vault_id set not null;
alter table public.notes
  add constraint notes_vault_fk foreign key (vault_id, owner_id)
  references public.vaults (id, owner_id) on delete cascade;
alter table public.notes drop constraint notes_owner_id_slug_key;
alter table public.notes add unique (vault_id, slug);
create index notes_vault_id_idx on public.notes (vault_id);

alter table public.folders add column vault_id uuid;
update public.folders f set vault_id = v.id from public.vaults v where v.owner_id = f.owner_id;
alter table public.folders alter column vault_id set not null;
alter table public.folders
  add constraint folders_vault_fk foreign key (vault_id, owner_id)
  references public.vaults (id, owner_id) on delete cascade;
alter table public.folders drop constraint folders_owner_id_path_key;
alter table public.folders add unique (vault_id, path);
create index folders_vault_id_idx on public.folders (vault_id);

alter table public.chats add column vault_id uuid;
update public.chats c set vault_id = v.id from public.vaults v where v.owner_id = c.owner_id;
alter table public.chats alter column vault_id set not null;
alter table public.chats
  add constraint chats_vault_fk foreign key (vault_id, owner_id)
  references public.vaults (id, owner_id) on delete cascade;
create index chats_vault_id_idx on public.chats (vault_id);
