-- Defence in depth against unrelated permissive Storage policies.
create policy admin_client_files_staff_only on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id <> 'admin-client-documents')
with check (bucket_id <> 'admin-client-documents');
