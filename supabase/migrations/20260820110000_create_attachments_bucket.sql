insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array['image/png','image/jpeg','image/gif','image/webp','image/svg+xml','image/avif']
)
on conflict (id) do nothing;

create policy attachments_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.vaults v
      where v.id::text = (storage.foldername(name))[1]
        and v.owner_id = (select auth.uid())
    )
  );

create policy attachments_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.vaults v
      where v.id::text = (storage.foldername(name))[1]
        and v.owner_id = (select auth.uid())
    )
  );

create policy attachments_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.vaults v
      where v.id::text = (storage.foldername(name))[1]
        and v.owner_id = (select auth.uid())
    )
  );
