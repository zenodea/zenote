create table public.chats (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  note_id    uuid references public.notes(id) on delete cascade,
  title      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One thread per note for now; drop this to allow free-standing threads.
create unique index chats_note_id_key on public.chats (note_id) where note_id is not null;

create trigger chats_updated_at
  before update on public.chats
  for each row execute function public.set_updated_at();
