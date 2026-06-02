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
    // The unique slug in the collection is "parentSlug__typeSlug" — but the page
    // route uses the original slug (e.g. "shelkografiya") + typeSlug. We search by
    // typeSlug because that is unique within a parent and matches the route.
    try {
      const payload = await getPayloadClient();
      const result = await payload.find({
        collection: 'print-type-items',
        where: {
          and: [
            // The original data's slug field maps to what we stored as parentSlug's
            // related URL segment. We match by typeSlug since it is the [type] param.
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
