import {
  ICartOrderElement,
  ICreateOrderPayload,
  IPrintConfig,
  IPrintFileRef,
  TPrintSide,
  TPrintLocation,
} from './types';
import { TCartState } from '@/redux/cart-slice/cart.slice';

const SIDES_FOR_LOCATION: Record<TPrintLocation, TPrintSide[]> = {
  none: [],
  front: ['front'],
  back: ['back'],
  sleeve: ['sleeve'],
  both: ['front', 'back'],
};

export const getActiveSides = (printConfig: IPrintConfig | undefined): TPrintSide[] => {
  if (!printConfig) return [];
  return SIDES_FOR_LOCATION[printConfig.location] ?? [];
};

export const getPrintFilesArray = (
  printConfig: IPrintConfig | undefined,
): Array<{ side: TPrintSide; file: IPrintFileRef }> => {
  if (!printConfig) return [];
  const sides = getActiveSides(printConfig);
  return sides
    .map((side) => ({ side, file: printConfig.files[side] }))
    .filter((entry): entry is { side: TPrintSide; file: IPrintFileRef } => Boolean(entry.file));
};

export const ruPrintPlace = (side: TPrintSide): string => {
  if (side === 'front') return 'Грудь';
  if (side === 'back') return 'Спина';
  if (side === 'sleeve') return 'Рукав';
  return '';
};

export const cartSummaryFunc = (order: Array<ICartOrderElement>): number => {
  if (!order) return 0;
  return order.reduce((acc, elem) => {
    const itemQty = elem.item.sizes.reduce((sizesAcc, size) => sizesAcc + (size.userQty ?? 0), 0);
    return acc + itemQty * elem.item.price;
  }, 0);
};

export const packagesWeightCalcFunc = (
  order: Array<ICartOrderElement>,
): Array<{ weight: number }> => {
  return order.map((elem) => {
    const qty = elem.item.sizes.reduce((acc, curr) => acc + (curr.userQty ?? 0), 0);
    return {
      weight: elem.item.shippingParams.weight * qty,
    };
  });
};

// Раскладывает cart-state в payload для POST /api/orders/create.
// Каждый размер с userQty>0 становится отдельным item'ом (endpoint резолвит
// productSlug+variantSize → product.id + variant.id).
export const buildOrderPayload = (
  cart: TCartState,
  options: {
    customer: { name: string; phone: string; email?: string };
    roistatVisit?: string;
  },
): ICreateOrderPayload => {
  const { order, validPromoCode, deliveryParams, isDelivery } = cart;

  const items: ICreateOrderPayload['items'] = [];
  for (const elem of order ?? []) {
    for (const size of elem.item.sizes) {
      const qty = size.userQty ?? 0;
      if (qty < 1) continue;
      items.push({
        productSlug: elem.item.slug,
        variantSize: size.name,
        quantity: qty,
        printConfig: elem.printConfig,
      });
    }
  }

  return {
    customer: {
      name: options.customer.name,
      phone: options.customer.phone,
      email: options.customer.email,
      roistatVisit: options.roistatVisit,
    },
    delivery: isDelivery
      ? {
          type: deliveryParams.validDeliveryPoint ? 'cdek_pvz' : 'cdek_door',
          cityCode: deliveryParams.validCityTo?.code
            ? String(deliveryParams.validCityTo.code)
            : undefined,
          cityName: deliveryParams.validCityTo?.city ?? undefined,
          pvzCode: deliveryParams.validDeliveryPoint?.code ?? undefined,
          cost: deliveryParams.deliveryPrice ?? 0,
        }
      : { type: 'self_pickup', cost: 0 },
    items,
    promoCode: validPromoCode?.name || undefined,
  };
};
