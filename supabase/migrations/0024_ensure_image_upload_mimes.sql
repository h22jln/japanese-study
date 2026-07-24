update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]
where id = 'documents';

drop policy if exists "users upload own pdf documents" on storage.objects;
drop policy if exists "users upload own study documents" on storage.objects;

create policy "users upload own study documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.extension(name) = any (array['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])
);
