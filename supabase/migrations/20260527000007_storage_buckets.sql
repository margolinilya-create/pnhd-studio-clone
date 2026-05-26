-- Три новых bucket'а под админскую заливку картинок.
-- Все public-read, write — только для is_admin() (политика ниже).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('product-images', 'product-images', true, 10485760,
        array['image/png','image/jpeg','image/webp','image/avif']),
    ('blog-images',    'blog-images',    true,  5242880,
        array['image/png','image/jpeg','image/webp','image/avif']),
    ('gallery-images', 'gallery-images', true,  5242880,
        array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Write-политики (insert/update/delete) на storage.objects.
drop policy if exists "admin write product-images" on storage.objects;
create policy "admin write product-images" on storage.objects
    for all to authenticated
    using (bucket_id = 'product-images' and public.is_admin())
    with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin write blog-images" on storage.objects;
create policy "admin write blog-images" on storage.objects
    for all to authenticated
    using (bucket_id = 'blog-images' and public.is_admin())
    with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "admin write gallery-images" on storage.objects;
create policy "admin write gallery-images" on storage.objects
    for all to authenticated
    using (bucket_id = 'gallery-images' and public.is_admin())
    with check (bucket_id = 'gallery-images' and public.is_admin());

-- Public read на все три новых bucket'а (user-uploads уже имеет свою политику из миграции 0001).
drop policy if exists "public read admin image buckets" on storage.objects;
create policy "public read admin image buckets" on storage.objects
    for select to public
    using (bucket_id in ('product-images','blog-images','gallery-images'));
