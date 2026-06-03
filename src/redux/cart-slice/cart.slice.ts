import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ICartOrderElement,
  ICdekCitySearchResponse,
  ICdekPointsResponse,
  IPrintConfig,
  IPrintFileRef,
  IProduct,
  TPrintLocation,
  TPrintSide,
} from '@/app/utils/types';

interface IInitialState {
  order: Array<ICartOrderElement>;
  isHydrated: boolean;
  userData: {
    name: string;
    surname: string;
    phone: string;
    email: string;
  };
  paymentUrl: string;
  user_promocode: string;
  isPromocodeLoading?: boolean;
  promocodeFail?: boolean;
  isDelivery: boolean;
  deliveryParams: {
    userCitySearchQuery: string;
    validCityFrom?: ICdekCitySearchResponse;
    validCityTo?: ICdekCitySearchResponse;
    validDeliveryPoint?: ICdekPointsResponse;
    deliveryPrice: number;
  };
  validPromoCode: {
    discount_ratio: number;
    discounted_item: string;
    mechanic: string;
    message: string;
    name: string;
    qty?: number;
    discount: string;
    _id: string;
  };
  orderPrice?: {};
}

export type TCartState = IInitialState;

const initialState: IInitialState = {
  order: [],
  isHydrated: false,
  userData: {
    name: '',
    surname: '',
    phone: '',
    email: '',
  },
  user_promocode: '',
  paymentUrl: '',
  orderPrice: {},
  isDelivery: false,
  deliveryParams: {
    userCitySearchQuery: '',
    deliveryPrice: 0,
  },
  validPromoCode: {
    discount_ratio: 1,
    discounted_item: 'all',
    mechanic: 'discount',
    message: '',
    name: '',
    qty: 0,
    discount: '',
    _id: '',
  },
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{
        itemCartId: string;
        item: IProduct;
        printConfig: IPrintConfig;
      }>,
    ) => {
      state.order?.push(action.payload);
    },
    // Заменяет существующий cart-entry по itemCartId. Используется flow'ом
    // «Изменить размер»: product page открыт в edit-mode (?edit=<id>), пользователь
    // меняет размеры/принт, на «Сохранить» — заменяем item целиком.
    updateCartItem: (
      state,
      action: PayloadAction<{
        itemCartId: string;
        item: IProduct;
        printConfig: IPrintConfig;
      }>,
    ) => {
      const idx = state.order?.findIndex((e) => e.itemCartId === action.payload.itemCartId);
      if (idx !== undefined && idx >= 0) {
        state.order[idx] = action.payload;
      }
    },
    setPrintLocation: (
      state,
      action: PayloadAction<{ itemCartId: string; location: TPrintLocation }>,
    ) => {
      state.order?.forEach((elem) => {
        if (elem.itemCartId === action.payload.itemCartId) {
          elem.printConfig.location = action.payload.location;
        }
      });
    },
    setPrintFile: (
      state,
      action: PayloadAction<{ itemCartId: string; side: TPrintSide; file: IPrintFileRef }>,
    ) => {
      const { itemCartId, side, file } = action.payload;
      state.order?.forEach((elem) => {
        if (elem.itemCartId === itemCartId) {
          elem.printConfig.files[side] = file;
        }
      });
    },
    clearPrintFile: (
      state,
      action: PayloadAction<{ itemCartId: string; side: TPrintSide }>,
    ) => {
      const { itemCartId, side } = action.payload;
      state.order?.forEach((elem) => {
        if (elem.itemCartId === itemCartId) {
          delete elem.printConfig.files[side];
          // Если все файлы убрали — нормализуем location в 'none', иначе checkout-payload
          // отправит "С двух сторон" без файлов и менеджер запутается.
          const filesLeft = Object.keys(elem.printConfig.files).length;
          if (filesLeft === 0) {
            elem.printConfig.location = 'none';
          }
        }
      });
    },
    clearAllPrints: (state, action: PayloadAction<{ itemCartId: string }>) => {
      state.order?.forEach((elem) => {
        if (elem.itemCartId === action.payload.itemCartId) {
          elem.printConfig = { location: 'none', files: {} };
        }
      });
    },
    deleteItemFromCart: (state, action: PayloadAction<{ itemCartId: string }>) => {
      state.order = state.order?.filter((item) => item.itemCartId !== action.payload.itemCartId);
    },
    setDelivery: (state, action: PayloadAction<boolean>) => {
      state.isDelivery = action.payload;
    },
    setCdekCitySearchUserQuery: (state, action: PayloadAction<string>) => {
      state.deliveryParams.userCitySearchQuery = action.payload;
    },
    setValidCity: (
      state,
      action: PayloadAction<{
        validCityFrom: ICdekCitySearchResponse;
        validCityTo: ICdekCitySearchResponse;
      }>,
    ) => {
      state.deliveryParams.validCityFrom = action.payload.validCityFrom;
      state.deliveryParams.validCityTo = action.payload.validCityTo;
    },
    resetValidCity: (state) => {
      state.deliveryParams.validCityTo = undefined;
    },
    setValidDeliveryPoint: (state, action: PayloadAction<ICdekPointsResponse>) => {
      state.deliveryParams.validDeliveryPoint = action.payload;
    },
    resetValidDeliveryPoint: (state) => {
      state.deliveryParams.validDeliveryPoint = undefined;
    },
    setUserData: (state, action: PayloadAction<{ id: string; value: string }>) => {
      const { id, value } = action.payload;
      //@ts-ignore — id is the dynamic field key; runtime-safe per form inputs.
      state.userData[id] = value;
    },
    setDeliveryPrice: (state, action: PayloadAction<number>) => {
      state.deliveryParams.deliveryPrice = action.payload;
    },
    setPaymentURL: (state, action: PayloadAction<string>) => {
      state.paymentUrl = action.payload;
    },
    resetCart: () => {
      return { ...initialState, isHydrated: true };
    },
    restoreCart: (state, action: PayloadAction<Array<ICartOrderElement>>) => {
      // Гонка гидрации: если до dispatch(restoreCart) пользователь успел нажать
      // «В корзину», state.order уже содержит свежий элемент. Не затираем его
      // старым снимком — мержим по itemCartId, текущие записи в приоритете.
      const existingIds = new Set(state.order.map((e) => e.itemCartId));
      const restored = action.payload.filter((e) => !existingIds.has(e.itemCartId));
      state.order = [...state.order, ...restored];
      state.isHydrated = true;
    },
    markHydrated: (state) => {
      state.isHydrated = true;
    },
    setUserPromocode: (state, action: PayloadAction<string>) => {
      state.user_promocode = action.payload;
    },
    setValidPromocode: (state, action: PayloadAction<typeof initialState.validPromoCode>) => {
      state.validPromoCode = action.payload;
    },
    resetValidPromocode: (state) => {
      state.validPromoCode = initialState.validPromoCode;
    },
  },
});

export const { actions, reducer } = cartSlice;
