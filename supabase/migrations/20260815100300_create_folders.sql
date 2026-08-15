-- Only needed for EMPTY folders.
create table public.folders (
  id       uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path     text not null check (
             path <> ''
             and path not like '/%'
             and path not like '%/'
             and path !~ '(^|/)\.\.(/|$)'
           ),
  unique (owner_id, path)
);
