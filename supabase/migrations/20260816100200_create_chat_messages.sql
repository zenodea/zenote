create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats(id) on delete cascade,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position   int  not null,
  role       text not null check (role in ('user', 'assistant')),
  status     text not null default 'complete'
               check (status in ('complete', 'aborted', 'failed')),
  message    jsonb not null,
  created_at timestamptz not null default now(),
  unique (chat_id, position)
);
