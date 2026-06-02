import 'server-only';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { Page } from '@/payload-types';

export type StaticPage = {
  title: string;
  bodyHtml: string;
  subtitle: string | null;
  loyaltyLevels: Page['loyaltyLevels'];
  howtoSteps: Page['howtoSteps'];
  sizeChartItems: Page['sizeChartItems'];
};

const lexicalToHtml = (input: unknown): string => {
  if (!input || typeof input !== 'object') return '';
  const root = (input as { root?: { children?: unknown[] } }).root;
  if (!root || !Array.isArray(root.children)) return '';
  const renderNode = (node: unknown): string => {
    if (!node || typeof node !== 'object') return '';
    const n = node as {
      type?: string;
      text?: string;
      children?: unknown[];
      tag?: string;
      listType?: string;
    };
    if (n.type === 'text' && typeof n.text === 'string') {
      return n.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    const inner = Array.isArray(n.children) ? n.children.map(renderNode).join('') : '';
    if (n.type === 'paragraph') return `<p>${inner}</p>`;
    if (n.type === 'heading') return `<${n.tag ?? 'h2'}>${inner}</${n.tag ?? 'h2'}>`;
    if (n.type === 'list') {
      const ordered = n.listType === 'number' || n.tag === 'ol';
      const tagName = ordered ? 'ol' : 'ul';
      return `<${tagName}>${inner}</${tagName}>`;
    }
    if (n.type === 'listitem') return `<li>${inner}</li>`;
    if (n.type === 'linebreak') return '<br>';
    return inner;
  };
  return root.children.map(renderNode).join('');
};

export const getStaticPage = async (
  slug: string,
  options: { preview?: boolean } = {},
): Promise<StaticPage | null> => {
  if (!isPayloadConfigured()) return null;
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'pages',
    draft: options.preview === true,
    where: {
      slug: { equals: slug },
      ...(options.preview ? {} : { _status: { equals: 'published' } }),
    },
    limit: 1,
  });
  const page = res.docs[0] as Page | undefined;
  if (!page) return null;
  const html = page.bodyHtml && page.bodyHtml.trim().length > 0
    ? page.bodyHtml
    : lexicalToHtml(page.body);
  return {
    title: page.title,
    bodyHtml: sanitizeHtml(html),
    subtitle: page.subtitle ?? null,
    loyaltyLevels: page.loyaltyLevels ?? null,
    howtoSteps: page.howtoSteps ?? null,
    sizeChartItems: page.sizeChartItems ?? null,
  };
};

/**
 * Helper для рендеринга Lexical-richText в простую HTML-строку.
 * Используется только на статичных страницах (howto step body) — пользовательский
 * ввод санитайзится через bodyHtml ветку выше.
 */
export const lexicalRichTextToHtml = (input: unknown): string => lexicalToHtml(input);
