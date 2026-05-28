/**
 * ETL: переносит каталог из Supabase public.* таблиц в Payload коллекции.
 *
 * Идемпотентен:
 * - Existing Payload products (по slug) → skip + переход к variants/photos.
 * - Existing variants (по sku) → skip.
 * - Existing categories (по slug) → reuse.
 * - Media: загружается если ещё нет в Payload (по filename).
 *
 * Запуск:
 *   1. Заполни .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      DATABASE_URI, PAYLOAD_SECRET, S3_* (см. .env.example).
 *   2. npm run etl:catalog
 *
 * Что переносит:
 * - public.products → payload products + categories
 * - public.product_sizes → payload variants + prices
 * - public.product_gallery_photos → payload media (tag=product) + galleryMedia[]
 * - public.product_links → payload products.friendsProducts[] (второй проход)
 */
import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import { getPayload } from 'payload';

import config from '../src/payload.config';

const CATEGORY_LABELS: Record<string, string> = {
  man: 'Мужское',
  woman: 'Женское',
  kids: 'Детское',
  accesorize: 'Аксессуары',
  accessories: 'Аксессуары',
};

type SupabaseProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  stock: string | null;
  color: string | null;
  stage_color: string | null;
  category: string | null;
  is_sale: boolean | null;
  is_for_printing: boolean | null;
  image_url: string | null;
  editor_front_view: string | null;
  editor_back_view: string | null;
  editor_lsleeve_view: string | null;
  editor_rsleeve_view: string | null;
  shipping_weight: number | null;
  shipping_width: number | null;
  shipping_length: number | null;
  shipping_depth: number | null;
};

type SupabaseSizeRow = {
  product_id: string;
  name: string;
  qty: number;
  sort_order: number;
};

type SupabasePhotoRow = {
  product_id: string;
  url: string;
};

type SupabaseLinkRow = {
  product_id: string;
  linked_product_id: string;
};

const lexicalParagraph = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    children: text
      ? [
          {
            type: 'paragraph',
            format: '',
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            textFormat: 0,
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text,
                type: 'text',
                version: 1,
              },
            ],
          },
        ]
      : [],
    direction: 'ltr' as const,
  },
});

const fetchAsBuffer = async (url: string): Promise<{ buffer: Buffer; filename: string; mimetype: string } | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const filename = url.split('/').pop()?.split('?')[0] ?? `image-${Date.now()}.jpg`;
    const mimetype = res.headers.get('content-type') ?? 'image/jpeg';
    return { buffer: Buffer.from(arr), filename, mimetype };
  } catch (err) {
    console.warn(`  ! Skip image ${url}: ${(err as Error).message}`);
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

  // 1. Categories: resolve from products.category strings.
  const { data: products } = await supabase
    .from('products')
    .select(
      'id, slug, name, description, type, price, stock, color, stage_color, category, is_sale, is_for_printing, image_url, editor_front_view, editor_back_view, editor_lsleeve_view, editor_rsleeve_view, shipping_weight, shipping_width, shipping_length, shipping_depth',
    )
    .returns<SupabaseProductRow[]>();

  if (!products?.length) {
    console.error('ERROR: в Supabase products нет данных');
    process.exit(1);
  }

  const categorySlugs = Array.from(
    new Set(products.map((p) => p.category).filter((s): s is string => Boolean(s))),
  );
  const categoryIdBySlug = new Map<string, string>();

  for (const slug of categorySlugs) {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: slug } },
      limit: 1,
    });
    if (existing.totalDocs > 0) {
      categoryIdBySlug.set(slug, existing.docs[0]!.id);
      continue;
    }
    const created = await payload.create({
      collection: 'categories',
      data: { name: CATEGORY_LABELS[slug] ?? slug, slug },
    });
    categoryIdBySlug.set(slug, created.id);
    console.log(`+ category: ${slug}`);
  }

  // 2. Sizes + photos + links — bulk fetch.
  const productIds = products.map((p) => p.id);

  const { data: sizes } = await supabase
    .from('product_sizes')
    .select('product_id, name, qty, sort_order')
    .in('product_id', productIds)
    .returns<SupabaseSizeRow[]>();

  const { data: photos } = await supabase
    .from('product_gallery_photos')
    .select('product_id, url')
    .in('product_id', productIds)
    .returns<SupabasePhotoRow[]>();

  const { data: links } = await supabase
    .from('product_links')
    .select('product_id, linked_product_id')
    .in('product_id', productIds)
    .returns<SupabaseLinkRow[]>();

  const sizesByProduct = new Map<string, SupabaseSizeRow[]>();
  for (const s of sizes ?? []) {
    if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
    sizesByProduct.get(s.product_id)!.push(s);
  }

  const photosByProduct = new Map<string, SupabasePhotoRow[]>();
  for (const p of photos ?? []) {
    if (!photosByProduct.has(p.product_id)) photosByProduct.set(p.product_id, []);
    photosByProduct.get(p.product_id)!.push(p);
  }

  const supabaseToPayloadProductId = new Map<string, string>();
  const slugToSupabaseId = new Map<string, string>();
  let createdProducts = 0;
  let createdVariants = 0;
  let createdMedia = 0;

  // 3. Products + Variants + Prices + Media (first pass; friendsProducts pass 2).
  for (const p of products) {
    slugToSupabaseId.set(p.slug, p.id);

    const existing = await payload.find({
      collection: 'products',
      where: { slug: { equals: p.slug } },
      limit: 1,
    });

    let productId: string;
    if (existing.totalDocs > 0) {
      productId = existing.docs[0]!.id;
      console.log(`= product (exists): ${p.slug}`);
    } else {
      // Cover image upload.
      let coverMediaId: string | undefined;
      if (p.image_url) {
        const img = await fetchAsBuffer(p.image_url);
        if (img) {
          const media = await payload.create({
            collection: 'media',
            data: { alt: p.name, tag: 'product' },
            file: { data: img.buffer, mimetype: img.mimetype, name: img.filename, size: img.buffer.length },
          });
          coverMediaId = media.id;
          createdMedia++;
        }
      }

      const categoryId = p.category ? categoryIdBySlug.get(p.category) : undefined;

      const created = await payload.create({
        collection: 'products',
        data: {
          slug: p.slug,
          name: p.name,
          description: lexicalParagraph(p.description ?? ''),
          type: p.type as 'tshirt' | 'hoodie' | 'longsleeve' | 'sweatshirt' | 'cap' | 'totebag',
          ...(categoryId ? { category: categoryId } : {}),
          channels: ['b2c'],
          status: 'published',
          ...(coverMediaId ? { coverMedia: coverMediaId } : {}),
          shippingParams: {
            weight: p.shipping_weight ?? undefined,
            width: p.shipping_width ?? undefined,
            length: p.shipping_length ?? undefined,
            depth: p.shipping_depth ?? undefined,
          },
          isSale: Boolean(p.is_sale),
          isForPrinting: Boolean(p.is_for_printing),
          color: p.color ?? undefined,
          stageColor: p.stage_color ?? undefined,
        },
      });
      productId = created.id;
      createdProducts++;
      console.log(`+ product: ${p.slug}`);
    }

    supabaseToPayloadProductId.set(p.id, productId);

    // Variants + Prices.
    const productSizes = sizesByProduct.get(p.id) ?? [];
    for (const sz of productSizes) {
      const sku = `${p.slug}__${sz.name.replace(/\s+/g, '-').toLowerCase()}`;
      const existingVariant = await payload.find({
        collection: 'variants',
        where: { sku: { equals: sku } },
        limit: 1,
      });
      if (existingVariant.totalDocs > 0) continue;

      const variant = await payload.create({
        collection: 'variants',
        data: {
          product: productId,
          size: sz.name,
          sku,
          stockQty: sz.qty,
          sortOrder: sz.sort_order,
        },
      });
      createdVariants++;

      await payload.create({
        collection: 'prices',
        data: {
          variant: variant.id,
          currency: 'RUB',
          amount: p.price * 100,
        },
      });
    }

    // Gallery media.
    const productPhotos = photosByProduct.get(p.id) ?? [];
    if (productPhotos.length > 0 && existing.totalDocs === 0) {
      const galleryMedia: { image: string }[] = [];
      for (const photo of productPhotos) {
        const img = await fetchAsBuffer(photo.url);
        if (!img) continue;
        const media = await payload.create({
          collection: 'media',
          data: { alt: `${p.name} (галерея)`, tag: 'product' },
          file: { data: img.buffer, mimetype: img.mimetype, name: img.filename, size: img.buffer.length },
        });
        galleryMedia.push({ image: media.id });
        createdMedia++;
      }
      if (galleryMedia.length > 0) {
        await payload.update({
          collection: 'products',
          id: productId,
          data: { galleryMedia },
        });
      }
    }
  }

  // 4. Second pass: friendsProducts.
  const linksByProduct = new Map<string, string[]>();
  for (const l of links ?? []) {
    if (!linksByProduct.has(l.product_id)) linksByProduct.set(l.product_id, []);
    linksByProduct.get(l.product_id)!.push(l.linked_product_id);
  }
  for (const [supabaseProductId, linkedSupabaseIds] of linksByProduct.entries()) {
    const productId = supabaseToPayloadProductId.get(supabaseProductId);
    if (!productId) continue;
    const friendsProducts = linkedSupabaseIds
      .map((id) => supabaseToPayloadProductId.get(id))
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ product: id }));
    if (friendsProducts.length === 0) continue;
    await payload.update({
      collection: 'products',
      id: productId,
      data: { friendsProducts },
    });
  }

  console.log(
    `\nDone. + ${createdProducts} products, + ${createdVariants} variants, + ${createdMedia} media`,
  );
  process.exit(0);
};

main().catch((err) => {
  console.error('ETL failed:', err);
  process.exit(1);
});
