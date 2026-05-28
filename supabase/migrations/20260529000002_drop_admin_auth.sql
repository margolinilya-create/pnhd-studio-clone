-- Phase 2b cutover: дроп Supabase admin auth — Payload теперь сам пасёт /admin
-- через свою users collection + cookie session.

-- 1. RLS policies на admin write для storage buckets (заменены S3 service-role
-- ключами Payload — он обходит RLS).
DROP POLICY IF EXISTS "admin write product-images" ON storage.objects;
DROP POLICY IF EXISTS "admin write blog-images" ON storage.objects;
DROP POLICY IF EXISTS "admin write gallery-images" ON storage.objects;

-- 2. Admin write policies на content tables (если были).
DROP POLICY IF EXISTS "admin write products" ON public.products;
DROP POLICY IF EXISTS "admin write product_sizes" ON public.product_sizes;
DROP POLICY IF EXISTS "admin write product_gallery_photos" ON public.product_gallery_photos;
DROP POLICY IF EXISTS "admin write product_links" ON public.product_links;
DROP POLICY IF EXISTS "admin write blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "admin write gallery_images" ON public.gallery_images;
DROP POLICY IF EXISTS "admin read leads" ON public.leads;
DROP POLICY IF EXISTS "admin update leads" ON public.leads;

-- 3. is_admin() function — больше не используется.
DROP FUNCTION IF EXISTS public.is_admin();

-- 4. admin_users table — Payload Users collection полностью её замещает.
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- Note: legacy public.{products, blog_posts, gallery_images, leads} остаются
-- как archival backup до Phase 8 (Yandex cutover). После Phase 2b storefront
-- читает каталог только из payload_products через payload-types.
