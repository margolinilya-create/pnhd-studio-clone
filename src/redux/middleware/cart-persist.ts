import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { actions as cartActions, TCartState } from '@/redux/cart-slice/cart.slice';

export const CART_STORAGE_KEY = 'order_v3';

export const cartPersistMiddleware = createListenerMiddleware();

cartPersistMiddleware.startListening({
  // Намеренно НЕ слушаем restoreCart: иначе сразу после гидрации
  // переписываем sessionStorage тем же значением.
  matcher: isAnyOf(
    cartActions.addToCart,
    cartActions.setPrintLocation,
    cartActions.setPrintFile,
    cartActions.clearPrintFile,
    cartActions.clearAllPrints,
    cartActions.deleteItemFromCart,
    cartActions.resetCart,
  ),
  effect: (_action, listenerApi) => {
    if (typeof window === 'undefined') return;
    const state = listenerApi.getState() as { cart: TCartState };
    try {
      window.sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart.order ?? []));
    } catch {
      // sessionStorage quota / disabled — silent drop is fine here.
    }
  },
});
