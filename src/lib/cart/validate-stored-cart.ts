import type { ICartOrderElement, TPrintLocation } from '@/app/utils/types';

const PRINT_LOCATIONS: ReadonlyArray<TPrintLocation> = [
  'none',
  'front',
  'back',
  'sleeve',
  'both',
];

/**
 * Проверяет восстановленный из sessionStorage массив на соответствие текущей схеме
 * `ICartOrderElement[]` (printConfig v3). Полезно при загрузке legacy/повреждённого
 * состояния — если форма не валидна, корзина сбрасывается, а не падает в рантайме.
 */
export function isValidStoredCart(
  parsed: unknown,
): parsed is Array<ICartOrderElement> {
  if (!Array.isArray(parsed)) return false;
  return parsed.every(isValidStoredCartEntry);
}

function isValidStoredCartEntry(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  if (typeof e.itemCartId !== 'string' || !e.item) return false;
  const pc = e.printConfig as Record<string, unknown> | undefined;
  if (!pc) return false;
  if (typeof pc.location !== 'string') return false;
  if (!PRINT_LOCATIONS.includes(pc.location as TPrintLocation)) return false;
  if (typeof pc.files !== 'object' || pc.files === null) return false;
  return true;
}
