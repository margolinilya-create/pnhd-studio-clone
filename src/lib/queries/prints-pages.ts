import 'server-only';

import { cache } from 'react';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';

export type PrintsPage = {
  id: string | number;
  slug: string;
  title?: string | null;
  subtitle?: string | null;
  mainText?: string | null;
  bodyHtml?: string | null;
  coverPath?: string | null;
  gallery?: Array<{ path?: string | null }> | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
};

export const getPrintsPage = cache(async (slug: string): Promise<PrintsPage | null> => {
  if (!isPayloadConfigured()) return null;
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'prints-pages',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    });
    if (result.docs.length === 0) return null;
    return result.docs[0] as unknown as PrintsPage;
  } catch (err) {
    console.error('[getPrintsPage] Failed:', err);
    return null;
  }
});

export const getAllPrintsSlugs = cache(async (): Promise<string[]> => {
  if (!isPayloadConfigured()) return [];
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'prints-pages',
      limit: 100,
      depth: 0,
    });
    return result.docs.map((doc) => (doc as unknown as PrintsPage).slug);
  } catch (err) {
    console.error('[getAllPrintsSlugs] Failed:', err);
    return [];
  }
});
