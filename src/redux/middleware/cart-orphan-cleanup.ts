// src/redux/middleware/cart-orphan-cleanup.ts
//
// Listens to cart mutations that могут drop файлы из corzina, diff'ит prev → next state
// и удаляет orphan-объекты из Supabase Storage bucket `user-uploads`.
//
// Best-effort: ошибки storage.remove() логируются, но не отменяют action.

import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { actions as cartActions, TCartState } from '@/redux/cart-slice/cart.slice';
import { ICartOrderElement } from '@/app/utils/types';
import { getSupabaseClient } from '@/lib/supabase/client';

const BUCKET = 'user-uploads';

function collectPaths(order: Array<ICartOrderElement>): Set<string> {
  const paths = new Set<string>();
  for (const item of order) {
    const files = item.printConfig?.files ?? {};
    for (const ref of Object.values(files)) {
      if (ref?.path) paths.add(ref.path);
    }
  }
  return paths;
}

export const cartOrphanCleanupMiddleware = createListenerMiddleware();

cartOrphanCleanupMiddleware.startListening({
  matcher: isAnyOf(
    cartActions.clearPrintFile,
    cartActions.clearAllPrints,
    cartActions.deleteItemFromCart,
    cartActions.resetCart,
  ),
  effect: async (_action, listenerApi) => {
    if (typeof window === 'undefined') return;

    const prev = (listenerApi.getOriginalState() as { cart: TCartState }).cart.order ?? [];
    const next = (listenerApi.getState() as { cart: TCartState }).cart.order ?? [];

    const prevPaths = collectPaths(prev);
    const nextPaths = collectPaths(next);

    const removed: string[] = Array.from(prevPaths).filter((p) => !nextPaths.has(p));
    if (removed.length === 0) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage.from(BUCKET).remove(removed);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[cart-orphan-cleanup] remove failed', error.message, removed);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[cart-orphan-cleanup] unexpected error', e);
    }
  },
});
