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
  order?: Array<ICartOrderElement>;
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
      return { ...initialState };
    },
    restoreCart: (state, action: PayloadAction<Array<ICartOrderElement>>) => {
      state.order = action.payload;
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
