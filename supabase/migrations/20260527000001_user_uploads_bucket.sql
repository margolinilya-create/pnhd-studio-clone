-- Bucket для пользовательских принтов из product-page right panel.
-- Public-read, anon-insert, до 20 МБ, только image/*.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'user-uploads',
    'user-uploads',
    true,
    20971520, -- 20 MB
    array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Политики на storage.objects ограничены этим bucket'ом.
drop policy if exists "user-uploads anon insert" on storage.objects;
create policy "user-uploads anon insert"
    on storage.objects for insert
    to anon
    with check (bucket_id = 'user-uploads');

drop policy if exists "user-uploads public read" on storage.objects;
create policy "user-uploads public read"
    on storage.objects for select
    to public
    using (bucket_id = 'user-uploads');
