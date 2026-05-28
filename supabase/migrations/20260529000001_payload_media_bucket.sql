-- Phase 1b Payload scaffold: bucket для Payload Media collection (через @payloadcms/storage-s3).
-- Payload пишет через S3-совместимый endpoint Supabase с service-role ключами,
-- поэтому write RLS не нужен. Read public — изображения раздаются напрямую.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payload-media',
  'payload-media',
  TRUE,
  20971520, -- 20 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Public read policy.
DROP POLICY IF EXISTS "payload-media: public read" ON storage.objects;
CREATE POLICY "payload-media: public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'payload-media');

-- Write идёт через S3 protocol с service-role ключами — anon write закрыт.
-- (Также можно дать admin write через role check, но в Phase 1b это не требуется —
-- Payload использует S3 keys, обходя RLS.)
