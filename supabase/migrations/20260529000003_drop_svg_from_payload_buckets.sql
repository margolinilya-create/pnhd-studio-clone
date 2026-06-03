-- Убирает image/svg+xml из публичных bucket'ов payload-media и gallery-images.
-- SVG — stored-XSS surface (публичный bucket отдаёт атакерский SVG с supabase.co
-- origin). Ранее это применялось ТОЛЬКО out-of-band через Supabase MCP
-- (drop_svg_mime_from_buckets) и отсутствовало в version-controlled миграциях →
-- на fresh-rebuild (DR / новое окружение) SVG возвращался, реоткрывая уязвимость.
--
-- Эта миграция фиксирует фикс в истории. Идемпотентно: UPDATE приводит bucket
-- к нужному состоянию в любом окружении (на prod, где svg уже убран, — no-op).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('payload-media', 'gallery-images')
  AND 'image/svg+xml' = ANY (allowed_mime_types);
