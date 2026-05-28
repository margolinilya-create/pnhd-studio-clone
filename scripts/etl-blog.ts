/**
 * ETL: переносит public.blog_posts → payload pages (pageType=blog).
 *
 * Идемпотентен: skip-if-exists по slug.
 * Сохраняет body_html в Page.bodyHtml — рендеринг через
 * dangerouslySetInnerHTML сохраняется (lossless для legacy постов).
 * Cover URL → upload в Media с tag=blog.
 *
 * Запуск: npm run etl:blog
 */
import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import { getPayload } from 'payload';

import config from '../src/payload.config';

type BlogPostRow = {
  post_id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  cover: string | null;
  author: string | null;
  likes: number | null;
  hashtags: string[] | null;
  body_html: string | null;
  created_at: string;
};

const fetchAsBuffer = async (
  url: string,
): Promise<{ buffer: Buffer; filename: string; mimetype: string } | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const filename = url.split('/').pop()?.split('?')[0] ?? `cover-${Date.now()}.jpg`;
    const mimetype = res.headers.get('content-type') ?? 'image/jpeg';
    return { buffer: Buffer.from(arr), filename, mimetype };
  } catch (err) {
    console.warn(`  ! Skip cover ${url}: ${(err as Error).message}`);
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

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('post_id, slug, title, subtitle, cover, author, likes, hashtags, body_html, created_at')
    .returns<BlogPostRow[]>();

  if (!posts?.length) {
    console.log('Нет blog_posts в Supabase — нечего переносить.');
    process.exit(0);
  }

  let created = 0;
  let skipped = 0;
  let mediaUploaded = 0;

  for (const post of posts) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: post.slug } },
      limit: 1,
    });
    if (existing.totalDocs > 0) {
      skipped++;
      console.log(`= page (exists): ${post.slug}`);
      continue;
    }

    let coverId: string | undefined;
    if (post.cover) {
      const img = await fetchAsBuffer(post.cover);
      if (img) {
        const media = await payload.create({
          collection: 'media',
          data: { alt: post.title, tag: 'blog' },
          file: {
            data: img.buffer,
            mimetype: img.mimetype,
            name: img.filename,
            size: img.buffer.length,
          },
        });
        coverId = media.id;
        mediaUploaded++;
      }
    }

    await payload.create({
      collection: 'pages',
      data: {
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
      },
    });
    created++;
    console.log(`+ page: ${post.slug}`);
  }

  console.log(`\nDone. + ${created} pages, = ${skipped} existing, + ${mediaUploaded} media`);
  process.exit(0);
};

main().catch((err) => {
  console.error('ETL blog failed:', err);
  process.exit(1);
});
