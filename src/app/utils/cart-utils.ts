import {
  ICartOrderElement,
  IPrintConfig,
  IPrintFileRef,
  TPrintSide,
  TPrintLocation,
  TUserOrderItem,
  IOrderBody,
} from './types';
import { TCartState } from '@/redux/cart-slice/cart.slice';
import { v4 as uuidv4 } from 'uuid';

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

export const checkoutOrderObjectCreateFunc = (cart: TCartState, roistat: string): IOrderBody => {
  const { order, validPromoCode, deliveryParams, userData, isDelivery } = cart;
  const orderTotalPrice = cartSummaryFunc(order ?? []);

  const data: IOrderBody = {
    order_total_price: orderTotalPrice,
    order_discounted_price: validPromoCode.name
      ? orderTotalPrice * validPromoCode.discount_ratio
      : orderTotalPrice,
    order_promocode: validPromoCode,
    owner_name: `${userData.surname} ${userData.name}`,
    owner_phone: userData.phone.substring(1, userData.phone.length),
    owner_email: userData.email,
    order_key: uuidv4(),
    items: [],
    isShipping: isDelivery,
    shipping_city: deliveryParams.validCityTo,
    shipping_point: deliveryParams.validDeliveryPoint,
    shipping_price: deliveryParams.deliveryPrice,
    packages: [],
    roistat,
  };

  order?.forEach((elem) => {
    const itemQty = elem.item.sizes.reduce((acc, { userQty }) => acc + (userQty ?? 0), 0);
    const sizesString = elem.item.sizes
      .filter((s) => (s.userQty ?? 0) > 0)
      .map((s) => `,размер:${s.name}`)
      .join('') + '.';

    const printDescription = (side: TPrintSide, title: string): string => {
      const file = elem.printConfig?.files[side];
      return file ? `${title}. Файл: ${file.url}` : '';
    };

    const itemToAdd: TUserOrderItem = {
      ...elem.item,
      textile: elem.item.name.concat(sizesString),
      item_price: itemQty * elem.item.price,
      printPrice: 0,
      qty: elem.item.sizes,
      qtyAll: itemQty,
      front_print: printDescription('front', 'Печать на груди'),
      back_print: printDescription('back', 'Печать на спине'),
      lsleeve_print: printDescription('sleeve', 'Печать на рукаве'),
      rsleeve_print: '',
    };

    data.items.push(itemToAdd);
    data.packages.push({
      height: '10',
      length: '10',
      weight: '1000',
      width: '10',
    });
  });

  return data;
};
