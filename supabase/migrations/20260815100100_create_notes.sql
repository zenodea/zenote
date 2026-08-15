create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug       text not null check (
               slug <> ''
               and slug not like '/%'
               and slug not like '%/'
               and slug !~ '(^|/)\.\.(/|$)'
             ),
  title      text not null default '',
  tags       text[] not null default '{}',
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();
