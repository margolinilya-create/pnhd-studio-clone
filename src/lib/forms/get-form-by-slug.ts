import 'server-only';
import { getPayload } from 'payload';
import config from '@/payload.config';

const TITLE_BY_SLUG: Record<string, string> = {
  'footer-lead': 'Footer Lead',
  'popup-lead': 'Popup Lead',
  'shop-no-model': 'Shop — нет модели',
  'product-page': 'Product Page Consultation',
  'methods-consultation': 'Methods — консультация',
};

const cache = new Map<string, string>();

export async function getFormIdBySlug(slug: keyof typeof TITLE_BY_SLUG): Promise<string> {
  if (cache.has(slug)) return cache.get(slug)!;

  const title = TITLE_BY_SLUG[slug];
  if (!title) throw new Error(`Unknown form slug: ${slug}`);

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'forms',
    where: { title: { equals: title } },
    limit: 1,
    depth: 0,
  });

  const id = result.docs[0]?.id;
  if (!id) throw new Error(`Form "${title}" not found — run seed-forms script`);

  cache.set(slug, String(id));
  return String(id);
}

export type FormSlug = keyof typeof TITLE_BY_SLUG;
