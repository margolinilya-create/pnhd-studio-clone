import 'server-only';

import { cache } from 'react';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';

export type PrintTypeItem = {
  id: string | number;
  slug: string;
  parentSlug: string;
  typeSlug: string;
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

export const getPrintTypeItemsByParent = cache(
  async (parentSlug: string): Promise<PrintTypeItem[]> => {
    if (!isPayloadConfigured()) return [];
    try {
      const payload = await getPayloadClient();
      const result = await payload.find({
        collection: 'print-type-items',
        where: { parentSlug: { equals: parentSlug } },
        limit: 50,
        depth: 0,
      });
      return result.docs as unknown as PrintTypeItem[];
    } catch (err) {
      console.error('[getPrintTypeItemsByParent] Failed:', err);
      return [];
    }
  },
);

export const getPrintTypeItem = cache(
  async (slug: string, typeSlug: string): Promise<PrintTypeItem | null> => {
    if (!isPayloadConfigured()) return null;
    // The unique slug in the collection is "parentSlug__typeSlug". The page route
    // passes both segments (slug == parentSlug, typeSlug == [type]). We must match
    // BOTH — иначе любой родительский сегмент отрендерит страницу метода
    // (дубли-контент / неверный canonical), а при неуникальном typeSlug вернётся
    // произвольная первая строка.
    try {
      const payload = await getPayloadClient();
      const result = await payload.find({
        collection: 'print-type-items',
        where: {
          and: [
            { parentSlug: { equals: slug } },
            { typeSlug: { equals: typeSlug } },
          ],
        },
        limit: 1,
        depth: 0,
      });
      if (result.docs.length === 0) return null;
      return result.docs[0] as unknown as PrintTypeItem;
    } catch (err) {
      console.error('[getPrintTypeItem] Failed:', err);
      return null;
    }
  },
);
