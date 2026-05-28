import { NextResponse } from 'next/server';

import { getPayloadClient, isPayloadConfigured } from '@/lib/payload/client';

type IncomingItem = {
  productSlug: string;
  variantSize: string;
  quantity: number;
  printConfig?: unknown;
};

type IncomingBody = {
  customer?: { name?: string; phone?: string; email?: string; roistatVisit?: string };
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
    product: string;
    variant: string;
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
      | { id: string; sku: string; stockQty: number }
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
  let promoId: string | undefined;
  if (promoCode) {
    const promoRes = await payload.find({
      collection: 'promos',
      where: { code: { equals: promoCode } },
      limit: 1,
    });
    const promo = promoRes.docs[0] as
      | {
          id: string;
          discountType: 'percent' | 'fixed';
          discountValue: number;
          validFrom?: string | null;
          validUntil?: string | null;
        }
      | undefined;
    if (promo) {
      const now = new Date();
      const validFrom = promo.validFrom ? new Date(promo.validFrom) : null;
      const validUntil = promo.validUntil ? new Date(promo.validUntil) : null;
      if ((!validFrom || validFrom <= now) && (!validUntil || validUntil >= now)) {
        if (promo.discountType === 'percent') {
          discount = Math.floor((subtotal * promo.discountValue) / 100);
        } else {
          discount = promo.discountValue;
        }
        promoId = promo.id;
      }
    }
  }

  const shippingCost = delivery?.cost ?? 0;
  const total = Math.max(0, subtotal - discount + shippingCost);

  const order = await payload.create({
    collection: 'orders',
    data: {
      channel: 'b2c',
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
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
              cost: delivery.cost ?? 0,
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
    },
  });

  for (const it of resolvedItems) {
    await payload.create({
      collection: 'order-items',
      data: { ...it, order: order.id },
    });
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
};
