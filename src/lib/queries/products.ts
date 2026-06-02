import 'server-only';

import type { Where } from 'payload';

import type { IProduct } from '@/app/utils/types';
import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';
import type { Category, Media, Price, Product, Variant } from '@/payload-types';

const lexicalToPlain = (input: unknown): string => {
  if (!input || typeof input !== 'object') return '';
  const root = (input as { root?: { children?: unknown[] } }).root;
  if (!root || !Array.isArray(root.children)) return '';
  const collect = (nodes: unknown[]): string[] => {
    const out: string[] = [];
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as { text?: string; children?: unknown[] };
      if (typeof n.text === 'string') out.push(n.text);
      if (Array.isArray(n.children)) out.push(...collect(n.children));
    }
    return out;
  };
  return collect(root.children).join('\n').trim();
};

const mediaUrl = (m: number | Media | null | undefined): string => {
  if (!m || typeof m === 'number') return '';
  return m.url ?? '';
};

type Expanded = Product & {
  category?: number | Category | null;
  coverMedia?: number | Media | null;
  galleryMedia?: { image: number | Media; id?: string | null }[] | null;
  editorViews?: Product['editorViews'];
  friendsProducts?: { product: number | Product; id?: string | null }[] | null;
};

const friendsCsv = (p: Expanded): string => {
  const list = p.friendsProducts ?? [];
  return list
    .map((f) => (typeof f.product === 'number' ? '' : f.product?.slug ?? ''))
    .filter(Boolean)
    .join(',');
};

const mapVariantToSize = (
  variant: Variant,
): { name: string; qty: number; sortOrder: number } => ({
  name: variant.size,
  qty: variant.stockQty ?? 0,
  sortOrder: variant.sortOrder ?? 0,
});

const mapProduct = (
  product: Expanded,
  variants: Variant[],
  prices: Price[],
): IProduct => {
  const price = prices[0]?.amount ? prices[0].amount / 100 : 0;
  const category =
    product.category && typeof product.category !== 'number'
      ? product.category.slug
      : '';

  const galleryPhotos = (product.galleryMedia ?? [])
    .map((g) => mediaUrl(g.image))
    .filter(Boolean);

  return {
    _id: String(product.id),
    slug: product.slug,
    name: product.name,
    description: lexicalToPlain(product.description),
    links: [],
    type: product.type,
    price,
    shippingParams: {
      weight: Number(product.shippingParams?.weight ?? 0),
      width: Number(product.shippingParams?.width ?? 0),
      length: Number(product.shippingParams?.length ?? 0),
      depth: Number(product.shippingParams?.depth ?? 0),
    },
    stock: '',
    color: product.color ?? '',
    stageColor: product.stageColor ?? '',
    category,
    isSale: Boolean(product.isSale),
    isForPrinting: Boolean(product.isForPrinting),
    image_url: mediaUrl(product.coverMedia),
    galleryPhotos,
    editor_front_view: mediaUrl(product.editorViews?.frontView),
    editor_back_view: mediaUrl(product.editorViews?.backView),
    editor_lsleeve_view: mediaUrl(product.editorViews?.lsleeveView),
    editor_rsleeve_view: mediaUrl(product.editorViews?.rsleeveView),
    sizes: variants
      .map(mapVariantToSize)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ name, qty }) => ({ name, qty })),
    friends: friendsCsv(product),
    badge: product.badge ?? null,
    salePercent: product.salePercent ?? null,
  };
};

const fetchVariantsAndPrices = async (
  productIds: number[],
): Promise<{ variantsByProduct: Map<number, Variant[]>; pricesByVariant: Map<number, Price[]> }> => {
  if (productIds.length === 0) {
    return { variantsByProduct: new Map(), pricesByVariant: new Map() };
  }
  const payload = await getPayloadClient();

  const variantsRes = await payload.find({
    collection: 'variants',
    where: { product: { in: productIds } },
    limit: 5000,
    pagination: false,
  });
  const variants = variantsRes.docs as Variant[];

  const variantIds = variants.map((v) => v.id);
  const pricesRes =
    variantIds.length > 0
      ? await payload.find({
          collection: 'prices',
          where: { variant: { in: variantIds } },
          limit: 5000,
          pagination: false,
        })
      : { docs: [] as Price[] };
  const prices = pricesRes.docs as Price[];

  const variantsByProduct = new Map<number, Variant[]>();
  for (const v of variants) {
    const pid = typeof v.product === 'number' ? v.product : v.product.id;
    if (!variantsByProduct.has(pid)) variantsByProduct.set(pid, []);
    variantsByProduct.get(pid)!.push(v);
  }

  const pricesByVariant = new Map<number, Price[]>();
  for (const pr of prices) {
    const vid = typeof pr.variant === 'number' ? pr.variant : pr.variant.id;
    if (!pricesByVariant.has(vid)) pricesByVariant.set(vid, []);
    pricesByVariant.get(vid)!.push(pr);
  }

  return { variantsByProduct, pricesByVariant };
};

export const getAllProducts = async (filters?: { type?: string }): Promise<IProduct[]> => {
  if (!isPayloadConfigured()) return [];
  const payload = await getPayloadClient();
  const where: Where = {
    status: { equals: 'published' },
    channels: { contains: 'b2c' },
  };
  if (filters?.type) where.type = { equals: filters.type };

  const res = await payload.find({
    collection: 'products',
    where,
    depth: 2,
    limit: 500,
    pagination: false,
  });
  const products = res.docs as Expanded[];
  const { variantsByProduct, pricesByVariant } = await fetchVariantsAndPrices(
    products.map((p) => p.id),
  );

  return products.map((p) => {
    const variants = variantsByProduct.get(p.id) ?? [];
    const variantIds = variants.map((v) => v.id);
    const prices = variantIds.flatMap((vid) => pricesByVariant.get(vid) ?? []);
    return mapProduct(p, variants, prices);
  });
};

export const getProductBySlug = async (slug: string): Promise<IProduct | null> => {
  if (!isPayloadConfigured()) return null;
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  });
  const product = (res.docs[0] as Expanded | undefined) ?? null;
  if (!product) return null;
  const { variantsByProduct, pricesByVariant } = await fetchVariantsAndPrices([product.id]);
  const variants = variantsByProduct.get(product.id) ?? [];
  const prices = variants.flatMap((v) => pricesByVariant.get(v.id) ?? []);
  return mapProduct(product, variants, prices);
};

export type ProductSeo = {
  name: string;
  meta?: Product['meta'];
};

export const getProductSeoBySlug = async (slug: string): Promise<ProductSeo | null> => {
  if (!isPayloadConfigured()) return null;
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
  });
  const product = res.docs[0] as Product | undefined;
  if (!product) return null;
  return { name: product.name, meta: product.meta };
};

export const getAllProductSlugs = async (): Promise<string[]> => {
  if (!isPayloadConfigured()) return [];
  const payload = await getPayloadClient();
  const res = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    limit: 1000,
    pagination: false,
    select: { slug: true },
  });
  return res.docs.map((d) => (d as { slug: string }).slug);
};
