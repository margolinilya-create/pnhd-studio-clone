/**
 * Загружает product photos в Payload Media collection и связывает с уже
 * существующими products (cover_media_id + products_gallery_media).
 *
 * Идемпотентен:
 *   - Product с непустым `coverMedia` → пропускаем cover-upload.
 *   - Product с непустым `galleryMedia` → пропускаем gallery-upload.
 *
 * Источник URL'ов — Supabase `public.products.image_url` + `public.product_gallery_photos.url`
 * (после image-refresh 2026-06-01 указывают на product-images/imported/<slug>/<filename>).
 *
 * Запуск:
 *   npx tsx --env-file=.env.local scripts/fix-product-media.ts
 *
 * Что отличается от etl-catalog.ts:
 *   etl-catalog.ts при существующем product'е (`existing.totalDocs > 0`) пропускает
 *   media-upload полностью — поэтому 25 products там сидят без cover/gallery.
 *   Этот скрипт фиксит ТОЛЬКО медиа, не трогая остальные поля.
 */
import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import { getPayload } from 'payload';

import config from '../src/payload.config';

type SupabaseProductRow = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
};

type SupabasePhotoRow = {
  product_id: string;
  url: string;
  sort_order: number;
};

const fetchAsBuffer = async (
  url: string,
): Promise<{ buffer: Buffer; filename: string; mimetype: string } | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ! HTTP ${res.status} on ${url}`);
      return null;
    }
    const arr = await res.arrayBuffer();
    const filename = url.split('/').pop()?.split('?')[0] ?? `image-${Date.now()}.jpg`;
    const mimetype = res.headers.get('content-type') ?? 'image/jpeg';
    return { buffer: Buffer.from(arr), filename, mimetype };
  } catch (err) {
    console.warn(`  ! Fetch failed ${url}: ${(err as Error).message}`);
    return null;
  }
};

const main = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const payload = await getPayload({ config });

  // 1. Supabase data
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, slug, name, image_url')
    .returns<SupabaseProductRow[]>();
  if (pErr || !products) {
    console.error('Failed to fetch Supabase products:', pErr);
    process.exit(1);
  }

  const { data: photos, error: phErr } = await supabase
    .from('product_gallery_photos')
    .select('product_id, url, sort_order')
    .order('sort_order')
    .returns<SupabasePhotoRow[]>();
  if (phErr || !photos) {
    console.error('Failed to fetch gallery photos:', phErr);
    process.exit(1);
  }

  const photosByProduct = new Map<string, SupabasePhotoRow[]>();
  for (const ph of photos) {
    if (!photosByProduct.has(ph.product_id)) photosByProduct.set(ph.product_id, []);
    photosByProduct.get(ph.product_id)!.push(ph);
  }

  let coversAdded = 0;
  let galleriesAdded = 0;
  let mediaCreated = 0;
  let skipped = 0;

  for (const sp of products) {
    // Find matching Payload product
    const found = await payload.find({
      collection: 'products',
      where: { slug: { equals: sp.slug } },
      limit: 1,
      depth: 1,
    });
    if (found.totalDocs === 0) {
      console.warn(`  ! Payload product not found: ${sp.slug}`);
      continue;
    }
    const payloadProduct = found.docs[0]!;
    const payloadProductId = payloadProduct.id;

    const galleryPhotos = photosByProduct.get(sp.id) ?? [];

    const needsCover = !payloadProduct.coverMedia;
    const currentGallery = Array.isArray(payloadProduct.galleryMedia)
      ? payloadProduct.galleryMedia
      : [];
    const needsGallery = currentGallery.length === 0 && galleryPhotos.length > 0;

    if (!needsCover && !needsGallery) {
      skipped++;
      console.log(`= skip (full): ${sp.slug}`);
      continue;
    }

    console.log(`> ${sp.slug} — cover:${needsCover ? 'yes' : 'no'} gallery:${needsGallery ? `${galleryPhotos.length}` : 'no'}`);

    // ── Cover upload ────────────────────────────────────────────────
    let coverMediaId: number | undefined;
    if (needsCover && sp.image_url) {
      const img = await fetchAsBuffer(sp.image_url);
      if (img) {
        const media = await payload.create({
          collection: 'media',
          data: { alt: sp.name, tag: 'product' },
          file: {
            data: img.buffer,
            mimetype: img.mimetype,
            name: img.filename,
            size: img.buffer.length,
          },
        });
        coverMediaId = media.id;
        mediaCreated++;
        coversAdded++;
        console.log(`  + cover media id=${media.id} (${img.filename})`);
      }
    }

    // ── Gallery upload ──────────────────────────────────────────────
    const galleryMediaRefs: { image: number }[] = [];
    if (needsGallery) {
      for (const ph of galleryPhotos) {
        const img = await fetchAsBuffer(ph.url);
        if (!img) continue;
        const media = await payload.create({
          collection: 'media',
          data: { alt: `${sp.name} (галерея)`, tag: 'product' },
          file: {
            data: img.buffer,
            mimetype: img.mimetype,
            name: img.filename,
            size: img.buffer.length,
          },
        });
        galleryMediaRefs.push({ image: media.id });
        mediaCreated++;
        console.log(`  + gallery media id=${media.id} (${img.filename})`);
      }
      if (galleryMediaRefs.length > 0) galleriesAdded++;
    }

    // ── Patch product ───────────────────────────────────────────────
    const patch: Record<string, unknown> = {};
    if (coverMediaId !== undefined) patch.coverMedia = coverMediaId;
    if (galleryMediaRefs.length > 0) patch.galleryMedia = galleryMediaRefs;
    if (Object.keys(patch).length > 0) {
      await payload.update({
        collection: 'products',
        id: payloadProductId,
        data: patch,
      });
    }
  }

  console.log(
    `\nDone. covers:+${coversAdded} galleries:+${galleriesAdded} media:+${mediaCreated} skipped:${skipped}`,
  );
  process.exit(0);
};

main().catch((err) => {
  console.error('fix-product-media failed:', err);
  process.exit(1);
});
