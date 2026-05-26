import { configureStore } from '@reduxjs/toolkit';
import { reducer as utilsReducer } from './utils-slice/utils.slice';
import { reducer as cartReducer } from './cart-slice/cart.slice';
import { reducer as leadReducer } from './lead-slice/lead.slice';
import { cartPersistMiddleware } from './middleware/cart-persist';
import { api } from '@/api/api';
import { setupListeners } from '@reduxjs/toolkit/query';

export const store = configureStore({
  reducer: {
    utils: utilsReducer,
    cart: cartReducer,
    leads: leadReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(cartPersistMiddleware.middleware)
      .concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
