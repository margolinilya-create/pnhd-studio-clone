import 'server-only';

import { cache } from 'react';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';

export type TextilePage = {
  id: string | number;
  slug: string;
  title?: string | null;
  subtitle?: string | null;
  mainText?: string | null;
  pros?: string | null;
  cons?: string | null;
  bodyHtml?: string | null;
  coverPath?: string | null;
  gallery?: Array<{ path?: string | null }> | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
};

export const getTextilePage = cache(async (slug: string): Promise<TextilePage | null> => {
  if (!isPayloadConfigured()) return null;
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'textile-pages',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    if (result.docs.length === 0) return null;
    return result.docs[0] as unknown as TextilePage;
  } catch (err) {
    console.error('[getTextilePage] Failed:', err);
    return null;
  }
});

export const getAllTextileSlugs = cache(async (): Promise<string[]> => {
  if (!isPayloadConfigured()) return [];
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'textile-pages',
      limit: 100,
      depth: 0,
    });
    return result.docs.map((doc) => (doc as unknown as TextilePage).slug);
  } catch (err) {
    console.error('[getAllTextileSlugs] Failed:', err);
    return [];
  }
});
