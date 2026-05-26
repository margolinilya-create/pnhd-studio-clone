-- Write-политики на все таблицы каталога/контента.
-- Read остаётся открытым для anon (как было), write — только для is_admin().
-- На leads: добавляем select+update для admin'а (anon-read закрыт миграцией 0003).

-- products
create policy "products admin write" on public.products
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- product_sizes
create policy "product_sizes admin write" on public.product_sizes
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- product_gallery_photos
create policy "product_gallery_photos admin write" on public.product_gallery_photos
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- product_links
create policy "product_links admin write" on public.product_links
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- blog_posts
create policy "blog_posts admin write" on public.blog_posts
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- gallery_images
create policy "gallery_images admin write" on public.gallery_images
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- leads: admin может читать и менять статус, но не удалять
create policy "leads admin read" on public.leads
    for select to authenticated
    using (public.is_admin());

create policy "leads admin update" on public.leads
    for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());
