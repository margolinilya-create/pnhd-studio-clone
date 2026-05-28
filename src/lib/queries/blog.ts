import 'server-only';

import type { TBlogPosts } from '@/app/utils/types';
import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';
import type { Media, Page } from '@/payload-types';

type Post = TBlogPosts['posts'][number];

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
};

const coverUrl = (cover: Page['cover']): string => {
  if (!cover || typeof cover === 'string') return '';
  return (cover as Media).url ?? '';
};

const lexicalToHtml = (input: unknown): string => {
  if (!input || typeof input !== 'object') return '';
  const root = (input as { root?: { children?: unknown[] } }).root;
  if (!root || !Array.isArray(root.children)) return '';
  const renderNode = (node: unknown): string => {
    if (!node || typeof node !== 'object') return '';
    const n = node as { type?: string; text?: string; children?: unknown[]; tag?: string };
    if (n.type === 'text' && typeof n.text === 'string') {
      return n.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    const inner = Array.isArray(n.children) ? n.children.map(renderNode).join('') : '';
    if (n.type === 'paragraph') return `<p>${inner}</p>`;
    if (n.type === 'heading') return `<${n.tag ?? 'h2'}>${inner}</${n.tag ?? 'h2'}>`;
    if (n.type === 'list') return `<ul>${inner}</ul>`;
    if (n.type === 'listitem') return `<li>${inner}</li>`;
    if (n.type === 'linebreak') return '<br>';
    return inner;
  };
  return root.children.map(renderNode).join('');
};

const mapPage = (page: Page, fallbackIndex: number): Post => {
  const bodyHtml = page.bodyHtml && page.bodyHtml.trim().length > 0
    ? page.bodyHtml
    : lexicalToHtml(page.body);
  return {
    post_id: page.legacyPostId ?? fallbackIndex,
    slug: page.slug,
    title: page.title,
    subtitle: page.subtitle ?? '',
    cover: coverUrl(page.cover),
    author: page.author ?? 'PNHD STUDIO',
    likes: page.likes ?? 0,
    hashtags: (page.hashtags ?? []).map((h) => h.tag),
    blog: { __html: bodyHtml },
    createdAt: formatDate(page.publishedAt ?? page.createdAt),
  };
};

export const getAllPosts = async (): Promise<TBlogPosts> => {
  if (!isPayloadConfigured()) return { posts: [] };
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'pages',
    where: {
      pageType: { equals: 'blog' },
      status: { equals: 'published' },
    },
    sort: '-publishedAt',
    depth: 1,
    limit: 500,
    pagination: false,
  });
  const pages = res.docs as Page[];
  return { posts: pages.map((p, i) => mapPage(p, i + 1)) };
};

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  if (!isPayloadConfigured()) return null;
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'pages',
    where: {
      slug: { equals: slug },
      pageType: { equals: 'blog' },
    },
    depth: 1,
    limit: 1,
  });
  const page = (res.docs[0] as Page | undefined) ?? null;
  if (!page) return null;
  return mapPage(page, 0);
};

export const getAllPostSlugs = async (): Promise<string[]> => {
  if (!isPayloadConfigured()) return [];
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'pages',
    where: {
      pageType: { equals: 'blog' },
      status: { equals: 'published' },
    },
    limit: 1000,
    pagination: false,
    select: { slug: true },
  });
  return res.docs.map((d) => (d as { slug: string }).slug);
};
