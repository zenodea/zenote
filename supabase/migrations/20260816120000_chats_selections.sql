-- A selection chat keeps its subject as note ids, so renames cannot orphan it.
alter table public.chats add column note_ids uuid[];
