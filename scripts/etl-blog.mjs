/**
 * ETL: переносит public.blog_posts (Supabase) → payload pages (pageType=blog).
 *
 * Идемпотентен: skip-if-exists по slug.
 * Cover URL → upload в Media (tag=blog), id связывается в Page.cover.
 *
 * Запуск:
 *   node --env-file=.env.local scripts/etl-blog.mjs
 *   PAYLOAD_URL=http://localhost:3000 node --env-file=.env.local scripts/etl-blog.mjs
 *
 * Требует в env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PAYLOAD_BOOTSTRAP_EMAIL
 *   PAYLOAD_BOOTSTRAP_PASSWORD
 *
 * Этот скрипт — REST-based замена tsx-варианта etl-blog.ts (tsx ломается
 * на Payload's loadEnv, см. memory reference_payload_production.md п.6).
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

// 1. Login → JWT
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

const authJson = { 'Content-Type': 'application/json', Authorization: `JWT ${token}` };
const authOnly = { Authorization: `JWT ${token}` };

const apiJson = async (path, opts = {}) => {
  const res = await fetch(`${PAYLOAD_URL}/api${path}`, {
    ...opts,
    headers: { ...authJson, ...(opts.headers ?? {}) },
  });
  const txt = await res.text();
  try {
    return { status: res.status, body: JSON.parse(txt) };
  } catch {
    return { status: res.status, body: txt };
  }
};

// 2. Supabase read
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: posts, error: readErr } = await supabase
  .from('blog_posts')
  .select('post_id, slug, title, subtitle, cover, author, likes, hashtags, body_html, created_at')
  .order('created_at', { ascending: true });

if (readErr) {
  console.error('Supabase read error:', readErr);
  process.exit(1);
}
if (!posts?.length) {
  console.log('Нет blog_posts в Supabase — нечего переносить.');
  process.exit(0);
}
console.log(`Read ${posts.length} blog posts from Supabase`);

// 3. Per post: ensure cover media, then create page
const uploadCover = async (url, title) => {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    console.warn(`  ! Skip cover ${url}: ${err.message}`);
    return null;
  }
  if (!res.ok) {
    console.warn(`  ! Skip cover ${url}: HTTP ${res.status}`);
    return null;
  }
  const arr = await res.arrayBuffer();
  const buffer = Buffer.from(arr);
  const filename = url.split('/').pop()?.split('?')[0] ?? `cover-${Date.now()}.jpg`;
  const mimetype = res.headers.get('content-type') ?? 'image/jpeg';

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimetype }), filename);
  form.append('_payload', JSON.stringify({ alt: title, tag: 'blog' }));

  const uploadRes = await fetch(`${PAYLOAD_URL}/api/media`, {
    method: 'POST',
    headers: authOnly,
    body: form,
  });
  const uploadBody = await uploadRes.json();
  if (!uploadRes.ok) {
    console.warn(`  ! Media upload failed for ${filename}:`, uploadBody);
    return null;
  }
  return uploadBody.doc.id;
};

let created = 0;
let skipped = 0;
let mediaUploaded = 0;

for (const post of posts) {
  const slugEnc = encodeURIComponent(post.slug);
  const existing = await apiJson(`/pages?where[slug][equals]=${slugEnc}&limit=1`);
  if (existing.body?.docs?.length > 0) {
    skipped++;
    console.log(`= page (exists): ${post.slug}`);
    continue;
  }

  let coverId;
  if (post.cover) {
    coverId = await uploadCover(post.cover, post.title);
    if (coverId) mediaUploaded++;
  }

  const created_ = await apiJson('/pages', {
    method: 'POST',
    body: JSON.stringify({
      title: post.title,
      slug: post.slug,
      pageType: 'blog',
      subtitle: post.subtitle ?? undefined,
      ...(coverId ? { cover: coverId } : {}),
      author: post.author ?? 'PNHD STUDIO',
      hashtags: (post.hashtags ?? []).map((t) => ({ tag: t })),
      bodyHtml: post.body_html ?? '',
      likes: post.likes ?? 0,
      legacyPostId: post.post_id,
      publishedAt: post.created_at,
      status: 'published',
    }),
  });
  if (created_.status >= 400) {
    console.warn(`! page failed: ${post.slug}`, created_.body);
    continue;
  }
  created++;
  console.log(`+ page: ${post.slug}`);
}

console.log(`\nDone. + ${created} pages, = ${skipped} existing, + ${mediaUploaded} media`);
