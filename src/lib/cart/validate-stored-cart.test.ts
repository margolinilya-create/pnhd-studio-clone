import { describe, it, expect } from 'vitest';
import { isValidStoredCart } from './validate-stored-cart';

const validEntry = () => ({
  itemCartId: 'cart-1',
  item: {
    _id: 'p1',
    slug: 'foo',
    name: 'Foo',
    sizes: [{ name: 'M', qty: 10, userQty: 1 }],
  },
  printConfig: {
    location: 'front',
    files: {
      front: {
        url: 'https://x/y.png',
        filename: 'y.png',
        sizeBytes: 1,
        path: 'prints/y.png',
      },
    },
  },
});

describe('isValidStoredCart', () => {
  it('принимает пустой массив (явно очищенная корзина)', () => {
    expect(isValidStoredCart([])).toBe(true);
  });

  it('принимает валидный массив с одним элементом', () => {
    expect(isValidStoredCart([validEntry()])).toBe(true);
  });

  it('принимает несколько валидных элементов', () => {
    const e1 = validEntry();
    const e2 = { ...validEntry(), itemCartId: 'cart-2' };
    expect(isValidStoredCart([e1, e2])).toBe(true);
  });

  it('принимает все 5 валидных значений location', () => {
    const locations = ['none', 'front', 'back', 'sleeve', 'both'];
    for (const location of locations) {
      const e = validEntry();
      e.printConfig.location = location;
      expect(isValidStoredCart([e])).toBe(true);
    }
  });

  it('принимает пустой files-объект (location=none)', () => {
    const e = validEntry();
    e.printConfig.location = 'none';
    e.printConfig.files = {} as never;
    expect(isValidStoredCart([e])).toBe(true);
  });

  // --- Негативные сценарии ---

  it('отвергает не-массив', () => {
    expect(isValidStoredCart(null)).toBe(false);
    expect(isValidStoredCart(undefined)).toBe(false);
    expect(isValidStoredCart({})).toBe(false);
    expect(isValidStoredCart('order')).toBe(false);
    expect(isValidStoredCart(42)).toBe(false);
  });

  it('отвергает массив с примитивами', () => {
    expect(isValidStoredCart(['x'])).toBe(false);
    expect(isValidStoredCart([null])).toBe(false);
    expect(isValidStoredCart([42])).toBe(false);
  });

  it('отвергает элемент без itemCartId', () => {
    const e = validEntry() as Record<string, unknown>;
    delete e.itemCartId;
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает элемент, где itemCartId не строка', () => {
    const e = { ...validEntry(), itemCartId: 42 };
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает элемент без item', () => {
    const e = validEntry() as Record<string, unknown>;
    delete e.item;
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает элемент без printConfig (legacy v1 schema)', () => {
    // Регрессия: legacy order_v1 без printConfig вообще не должен восстанавливаться
    const e = validEntry() as Record<string, unknown>;
    delete e.printConfig;
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает невалидное значение location', () => {
    const e = validEntry();
    (e.printConfig as { location: string }).location = 'left-chest';
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает location не строкой', () => {
    const e = validEntry();
    (e.printConfig as { location: unknown }).location = 42;
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает files=null', () => {
    const e = validEntry();
    (e.printConfig as { files: unknown }).files = null;
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает files не объектом', () => {
    const e = validEntry();
    (e.printConfig as { files: unknown }).files = 'front:x';
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает если хотя бы один элемент массива невалиден', () => {
    const good = validEntry();
    const bad = validEntry() as Record<string, unknown>;
    delete bad.itemCartId;
    expect(isValidStoredCart([good, bad])).toBe(false);
  });

  it('отвергает повреждённый JSON-форматный объект (не массив, как top-level)', () => {
    // Если кто-то случайно сохранил { order: [...] } вместо самого массива
    expect(isValidStoredCart({ order: [validEntry()] })).toBe(false);
  });

  // Регрессия audit B3: legacy / corrupted item без `sizes` ломал /checkout
  // (`elem.item.sizes.reduce(...)` → "Application error: client-side exception").
  it('отвергает item без массива sizes', () => {
    const e = validEntry();
    delete (e.item as Record<string, unknown>).sizes;
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает item где sizes не массив', () => {
    const e = validEntry();
    (e.item as Record<string, unknown>).sizes = 'M' as unknown as never;
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает item без name (минимум полей для render не выполнен)', () => {
    const e = validEntry();
    delete (e.item as Record<string, unknown>).name;
    expect(isValidStoredCart([e])).toBe(false);
  });

  it('отвергает size без name или qty', () => {
    const e = validEntry();
    (e.item as Record<string, unknown>).sizes = [{ name: 'M' }];
    expect(isValidStoredCart([e])).toBe(false);
  });
});
