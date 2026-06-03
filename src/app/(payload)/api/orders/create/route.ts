import { NextResponse } from 'next/server';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';
import { isAllowedOrigin } from '@/lib/security/allowed-origins';
import { ipHashFromHeaders, rateLimitInMemory } from '@/lib/security/rate-limit-memory';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

type IncomingItem = {
  productSlug: string;
  variantSize: string;
  quantity: number;
  printConfig?: unknown;
};

type IncomingBody = {
  customer?: { name?: string; phone?: string; email?: string; note?: string; roistatVisit?: string };
  delivery?: {
    type?: 'cdek_pvz' | 'cdek_door' | 'self_pickup';
    cityCode?: string;
    cityName?: string;
    address?: string;
    pvzCode?: string;
    cost?: number;
  };
  items?: IncomingItem[];
  promoCode?: string;
};

export const POST = async (req: Request) => {
  if (!isPayloadConfigured()) {
    return NextResponse.json({ error: 'payload_not_configured' }, { status: 503 });
  }

  // Audit B4 — endpoint был fully open + unrate-limited. Same-origin check блокирует
  // CSRF / cross-origin DoS из любого браузера за пределами whitelist'а.
  const origin = req.headers.get('origin') ?? req.headers.get('referer')?.match(/^https?:\/\/[^/]+/)?.[0] ?? null;
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  // Rate-limit по IP-hash. Глобальный лимит за окно (in-memory, per-instance).
  const ipHash = ipHashFromHeaders(req.headers as Headers);
  const limited = rateLimitInMemory(`orders:${ipHash}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', retryAfterMs: limited.retryAfterMs },
      { status: 429, headers: { 'retry-after': String(Math.ceil(limited.retryAfterMs / 1000)) } },
    );
  }

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { customer, delivery, items, promoCode } = body;

  if (!customer?.name || !customer?.phone) {
    return NextResponse.json({ error: 'customer_required' }, { status: 422 });
  }
  if (!items?.length) {
    return NextResponse.json({ error: 'items_required' }, { status: 422 });
  }

  const payload = await getPayloadClient();

  const resolvedItems: {
    product: number;
    variant: number;
    quantity: number;
    pricePerUnit: number;
    lineTotal: number;
    printConfig?: unknown;
  }[] = [];
  let subtotal = 0;

  for (const item of items) {
    if (!item.productSlug || !item.variantSize || !item.quantity || item.quantity < 1) {
      return NextResponse.json({ error: 'invalid_item', item }, { status: 422 });
    }

    const productRes = await payload.find({
      collection: 'products',
      where: { slug: { equals: item.productSlug } },
      limit: 1,
    });
    const product = productRes.docs[0];
    if (!product) {
      return NextResponse.json(
        { error: 'product_not_found', slug: item.productSlug },
        { status: 422 },
      );
    }

    const variantRes = await payload.find({
      collection: 'variants',
      where: {
        and: [
          { product: { equals: product.id } },
          { size: { equals: item.variantSize } },
        ],
      },
      limit: 1,
    });
    const variant = variantRes.docs[0] as
      | { id: number; sku: string; stockQty: number }
      | undefined;
    if (!variant) {
      return NextResponse.json(
        { error: 'variant_not_found', slug: item.productSlug, size: item.variantSize },
        { status: 422 },
      );
    }
    if (variant.stockQty < item.quantity) {
      return NextResponse.json(
        {
          error: 'out_of_stock',
          sku: variant.sku,
          available: variant.stockQty,
          requested: item.quantity,
        },
        { status: 422 },
      );
    }

    const priceRes = await payload.find({
      collection: 'prices',
      where: { variant: { equals: variant.id } },
      limit: 1,
      sort: '-createdAt',
    });
    const price = priceRes.docs[0] as { amount: number } | undefined;
    if (!price) {
      return NextResponse.json(
        { error: 'price_not_found', sku: variant.sku },
        { status: 422 },
      );
    }

    const lineTotal = price.amount * item.quantity;
    subtotal += lineTotal;
    resolvedItems.push({
      product: product.id,
      variant: variant.id,
      quantity: item.quantity,
      pricePerUnit: price.amount,
      lineTotal,
      printConfig: item.printConfig,
    });
  }

  let discount = 0;
  let promoId: number | undefined;
  let promoUsageCount = 0;
  if (promoCode) {
    const promoRes = await payload.find({
      collection: 'promos',
      where: { code: { equals: promoCode } },
      limit: 1,
    });
    const promo = promoRes.docs[0] as
      | {
          id: number;
          discountType: 'percent' | 'fixed';
          discountValue: number;
          validFrom?: string | null;
          validUntil?: string | null;
          usageLimit?: number | null;
          usageCount?: number | null;
        }
      | undefined;
    if (promo) {
      const now = new Date();
      const validFrom = promo.validFrom ? new Date(promo.validFrom) : null;
      const validUntil = promo.validUntil ? new Date(promo.validUntil) : null;
      const withinWindow = (!validFrom || validFrom <= now) && (!validUntil || validUntil >= now);
      const usageCount = promo.usageCount ?? 0;
      const underLimit = promo.usageLimit == null || usageCount < promo.usageLimit;
      if (withinWindow && underLimit) {
        if (promo.discountType === 'percent') {
          const pct = Math.min(100, Math.max(0, promo.discountValue));
          discount = Math.floor((subtotal * pct) / 100);
        } else {
          discount = Math.max(0, promo.discountValue);
        }
        // Скидка не может превышать сумму товаров — иначе total схлопывается в 0.
        discount = Math.min(discount, subtotal);
        promoId = promo.id;
        promoUsageCount = usageCount;
      }
    }
  }

  // delivery.cost приходит от клиента — доверять нельзя. Серверного CDEK-пересчёта
  // пока нет, поэтому минимум защищаемся от отрицательных значений (которые иначе
  // занижают total). TODO(cdek): пересчитывать стоимость доставки server-side.
  const shippingCost = Math.max(0, Math.round(delivery?.cost ?? 0));
  const total = Math.max(0, subtotal - discount + shippingCost);

  // Audit B5 — раньше Order + order-items создавались без транзакции.
  // Mid-loop failure → orphan Order + partial items. Payload local API
  // поддерживает транзакции через `payload.db.beginTransaction()` + req-объект.
  // На success — commit, на любую ошибку — rollback и 500.
  const transactionID = await payload.db.beginTransaction?.();
  const reqContext = transactionID ? { transactionID } : undefined;

  try {
    const order = await payload.create({
      collection: 'orders',
      req: reqContext as never,
      data: {
        channel: 'b2c',
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          note: customer.note,
          roistatVisit: customer.roistatVisit,
        },
        ...(delivery
          ? {
              delivery: {
                type: delivery.type,
                cityCode: delivery.cityCode,
                cityName: delivery.cityName,
                address: delivery.address,
                pvzCode: delivery.pvzCode,
                cost: shippingCost,
              },
            }
          : {}),
        ...(promoId ? { promoCode: promoId } : {}),
        subtotal,
        discount,
        shippingCost,
        total,
        status: 'draft',
        paymentStatus: 'unpaid',
      } as never,
    });

    for (const it of resolvedItems) {
      await payload.create({
        collection: 'order-items',
        req: reqContext as never,
        data: { ...it, order: order.id } as never,
      });
    }

    if (promoId) {
      await payload.update({
        collection: 'promos',
        id: promoId,
        req: reqContext as never,
        data: { usageCount: promoUsageCount + 1 } as never,
      });
    }

    if (transactionID && payload.db.commitTransaction) {
      await payload.db.commitTransaction(transactionID);
    }

    return NextResponse.json(
      {
        id: order.id,
        orderNumber: (order as { orderNumber?: string }).orderNumber ?? null,
        total: order.total,
        paymentUrl: null,
      },
      { status: 201 },
    );
  } catch (err) {
    if (transactionID && payload.db.rollbackTransaction) {
      await payload.db.rollbackTransaction(transactionID).catch(() => undefined);
    }
    payload.logger.error({ err }, 'orders/create: failed to create order — transaction rolled back');
    return NextResponse.json({ error: 'order_create_failed' }, { status: 500 });
  }
};
