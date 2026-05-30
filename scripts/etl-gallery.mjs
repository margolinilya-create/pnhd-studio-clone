/**
 * ETL: переносит public.gallery_images (Supabase) → payload media (tag=gallery_prints).
 *
 * Идемпотентен: skip-if-exists по filename.
 * Источник — Supabase gallery_images (id, src, alt, sort_order).
 *
 * Запуск:
 *   node --env-file=.env.local scripts/etl-gallery.mjs
 *   PAYLOAD_URL=http://localhost:3000 node --env-file=.env.local scripts/etl-gallery.mjs
 *
 * Требует в env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PAYLOAD_BOOTSTRAP_EMAIL
 *   PAYLOAD_BOOTSTRAP_PASSWORD
 *
 * REST-based замена tsx-варианта etl-gallery.ts.
 */

import { createClient } from '@supabase/supabase-js';

const PAYLOAD_URL = process.env.PAYLOAD_URL ?? 'https://pnhd-studio-clone.vercel.app';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.PAYLOAD_BOOTSTRAP_EMAIL;
const ADMIN_PASSWORD = process.env.PAYLOAD_BOOTSTRAP_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: задай NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local');
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: задай PAYLOAD_BOOTSTRAP_EMAIL и PAYLOAD_BOOTSTRAP_PASSWORD в .env.local');
  process.exit(1);
}

// 1. Login
const loginRes = await fetch(`${PAYLOAD_URL}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
});
const loginBody = await loginRes.json();
if (!loginRes.ok || !loginBody.token) {
  console.error('Login failed:', loginRes.status, loginBody);
  process.exit(1);
}
const token = loginBody.token;
console.log(`OK login as ${ADMIN_EMAIL} @ ${PAYLOAD_URL}`);

const authOnly = { Authorization: `JWT ${token}` };

// 2. Supabase read
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: images, error: readErr } = await supabase
  .from('gallery_images')
  .select('id, src, alt, sort_order')
  .order('sort_order', { ascending: true });

if (readErr) {
  console.error('Supabase read error:', readErr);
  process.exit(1);
}
if (!images?.length) {
  console.log('Нет gallery_images в Supabase — нечего переносить.');
  process.exit(0);
}
console.log(`Read ${images.length} gallery images from Supabase`);

// 3. Upload each
let created = 0;
let skipped = 0;

for (const img of images) {
  // Derive stable filename from Supabase row (URLs от placehold.co шарят filename).
  // Берём расширение из URL, имя из sort_order + short id.
  const urlExt = (img.src.split('/').pop()?.split('?')[0]?.split('.').pop() ?? 'png').toLowerCase();
  const ext = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(urlExt) ? urlExt : 'png';
  const shortId = img.id.slice(0, 8);
  const fname = `gallery-print-${img.sort_order ?? 0}-${shortId}.${ext}`;

  const fnEnc = encodeURIComponent(fname);
  const existingRes = await fetch(
    `${PAYLOAD_URL}/api/media?where[filename][equals]=${fnEnc}&limit=1`,
    { headers: authOnly },
  );
  const existing = await existingRes.json();
  if (existing?.docs?.length > 0) {
    skipped++;
    console.log(`= media (exists): ${fname}`);
    continue;
  }

  let res;
  try {
    res = await fetch(img.src);
  } catch (err) {
    console.warn(`  ! Skip image ${img.src}: ${err.message}`);
    continue;
  }
  if (!res.ok) {
    console.warn(`  ! Skip image ${img.src}: HTTP ${res.status}`);
    continue;
  }
  const arr = await res.arrayBuffer();
  const buffer = Buffer.from(arr);
  const mimetype = res.headers.get('content-type') ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimetype }), fname);
  form.append('_payload', JSON.stringify({ alt: img.alt ?? '', tag: 'gallery_prints' }));

  const uploadRes = await fetch(`${PAYLOAD_URL}/api/media`, {
    method: 'POST',
    headers: authOnly,
    body: form,
  });
  const uploadBody = await uploadRes.json();
  if (!uploadRes.ok) {
    console.warn(`! upload failed: ${fname}`, uploadBody);
    continue;
  }
  created++;
  console.log(`+ media: ${fname}`);
}

console.log(`\nDone. + ${created} media, = ${skipped} existing`);
