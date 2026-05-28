/**
 * ETL: переносит public.gallery_images → payload media (tag=gallery_prints).
 *
 * Идемпотентен: skip-if-exists по filename. Источник — Supabase `gallery_images`
 * (id, src, alt, sort_order).
 *
 * Запуск: npm run etl:gallery
 */
import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import { getPayload } from 'payload';

import config from '../src/payload.config';

type GalleryImageRow = {
  id: string;
  src: string;
  alt: string | null;
  sort_order: number | null;
};

const fetchAsBuffer = async (
  url: string,
): Promise<{ buffer: Buffer; filename: string; mimetype: string } | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const filename = url.split('/').pop()?.split('?')[0] ?? `gallery-${Date.now()}.jpg`;
    const mimetype = res.headers.get('content-type') ?? 'image/jpeg';
    return { buffer: Buffer.from(arr), filename, mimetype };
  } catch (err) {
    console.warn(`  ! Skip image ${url}: ${(err as Error).message}`);
    return null;
  }
};

const main = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: задай NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const payload = await getPayload({ config });

  const { data: images } = await supabase
    .from('gallery_images')
    .select('id, src, alt, sort_order')
    .order('sort_order', { ascending: true })
    .returns<GalleryImageRow[]>();

  if (!images?.length) {
    console.log('Нет gallery_images в Supabase — нечего переносить.');
    process.exit(0);
  }

  let created = 0;
  let skipped = 0;

  for (const img of images) {
    const filename = img.src.split('/').pop()?.split('?')[0];
    if (filename) {
      const existing = await payload.find({
        collection: 'media',
        where: { filename: { equals: filename } },
        limit: 1,
      });
      if (existing.totalDocs > 0) {
        skipped++;
        console.log(`= media (exists): ${filename}`);
        continue;
      }
    }

    const buf = await fetchAsBuffer(img.src);
    if (!buf) continue;

    await payload.create({
      collection: 'media',
      data: { alt: img.alt ?? '', tag: 'gallery_prints' },
      file: {
        data: buf.buffer,
        mimetype: buf.mimetype,
        name: buf.filename,
        size: buf.buffer.length,
      },
    });
    created++;
    console.log(`+ media: ${buf.filename}`);
  }

  console.log(`\nDone. + ${created} media, = ${skipped} existing`);
  process.exit(0);
};

main().catch((err) => {
  console.error('ETL gallery failed:', err);
  process.exit(1);
});
