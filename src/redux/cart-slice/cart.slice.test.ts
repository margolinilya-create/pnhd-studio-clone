import { describe, it, expect } from 'vitest';
import { actions, reducer, type TCartState } from './cart.slice';
import type {
  ICartOrderElement,
  IPrintFileRef,
  IProduct,
} from '@/app/utils/types';

// Минимальный валидный IProduct для построения cart-элементов в тестах.
// Все поля заполнены plausible-значениями, чтобы кейсы можно было сравнивать
// через toEqual без сюрпризов.
const makeProduct = (overrides: Partial<IProduct> = {}): IProduct => ({
  _id: 'p1',
  slug: 'futbolka-classic-belaya-man',
  name: 'Футболка Classic белая',
  description: '',
  links: [],
  type: 'tshirt',
  price: 1200,
  shippingParams: { weight: 0, width: 0, length: 0, depth: 0 },
  stock: 'in_stock',
  color: 'white',
  stageColor: '#fff',
  category: 'tshirt',
  isSale: false,
  isForPrinting: true,
  image_url: 'https://example.com/p1.jpg',
  galleryPhotos: [],
  editor_front_view: '',
  editor_back_view: '',
  editor_lsleeve_view: '',
  editor_rsleeve_view: '',
  sizes: [{ name: 'M', qty: 5 }],
  friends: '',
  ...overrides,
});

const makeFileRef = (overrides: Partial<IPrintFileRef> = {}): IPrintFileRef => ({
  url: 'https://supabase.co/storage/v1/object/public/user-uploads/prints/abc.png',
  filename: 'logo.png',
  sizeBytes: 12345,
  path: 'prints/abc.png',
  ...overrides,
});

const makeEntry = (
  overrides: Partial<ICartOrderElement> = {},
): ICartOrderElement => ({
  itemCartId: 'cart-1',
  item: makeProduct(),
  printConfig: { location: 'none', files: {} },
  ...overrides,
});

const seedState = (entries: ICartOrderElement[]): TCartState => ({
  ...(reducer(undefined, { type: '@@INIT' }) as TCartState),
  order: entries,
});

describe('cart-slice / addToCart', () => {
  it('добавляет элемент в пустую корзину', () => {
    const next = reducer(seedState([]), actions.addToCart(makeEntry()));
    expect(next.order).toHaveLength(1);
    expect(next.order[0].itemCartId).toBe('cart-1');
  });

  it('добавляет несколько разных позиций без дедупа (это контракт)', () => {
    const s1 = reducer(seedState([]), actions.addToCart(makeEntry({ itemCartId: 'a' })));
    const s2 = reducer(s1, actions.addToCart(makeEntry({ itemCartId: 'b' })));
    expect(s2.order.map((e) => e.itemCartId)).toEqual(['a', 'b']);
  });
});

describe('cart-slice / setPrintLocation', () => {
  it('меняет location у нужного элемента', () => {
    const s = seedState([
      makeEntry({ itemCartId: 'a' }),
      makeEntry({ itemCartId: 'b' }),
    ]);
    const next = reducer(
      s,
      actions.setPrintLocation({ itemCartId: 'b', location: 'front' }),
    );
    expect(next.order[0].printConfig.location).toBe('none');
    expect(next.order[1].printConfig.location).toBe('front');
  });

  it('игнорирует несуществующий itemCartId', () => {
    const s = seedState([makeEntry({ itemCartId: 'a' })]);
    const next = reducer(
      s,
      actions.setPrintLocation({ itemCartId: 'ghost', location: 'back' }),
    );
    expect(next.order[0].printConfig.location).toBe('none');
  });
});

describe('cart-slice / setPrintFile', () => {
  it('записывает файл по нужной стороне', () => {
    const s = seedState([makeEntry({ itemCartId: 'a' })]);
    const file = makeFileRef();
    const next = reducer(
      s,
      actions.setPrintFile({ itemCartId: 'a', side: 'front', file }),
    );
    expect(next.order[0].printConfig.files.front).toEqual(file);
  });

  it('перезаписывает уже существующий файл на той же стороне', () => {
    const initial: ICartOrderElement = makeEntry({
      printConfig: {
        location: 'front',
        files: { front: makeFileRef({ filename: 'old.png' }) },
      },
    });
    const next = reducer(
      seedState([initial]),
      actions.setPrintFile({
        itemCartId: 'cart-1',
        side: 'front',
        file: makeFileRef({ filename: 'new.png' }),
      }),
    );
    expect(next.order[0].printConfig.files.front?.filename).toBe('new.png');
  });
});

describe('cart-slice / clearPrintFile', () => {
  it('удаляет файл с указанной стороны, не трогая остальные', () => {
    const initial = makeEntry({
      printConfig: {
        location: 'both',
        files: {
          front: makeFileRef({ filename: 'f.png' }),
          back: makeFileRef({ filename: 'b.png' }),
        },
      },
    });
    const next = reducer(
      seedState([initial]),
      actions.clearPrintFile({ itemCartId: 'cart-1', side: 'front' }),
    );
    expect(next.order[0].printConfig.files.front).toBeUndefined();
    expect(next.order[0].printConfig.files.back?.filename).toBe('b.png');
  });

  it('нормализует location в "none", когда удалён последний файл', () => {
    // Регрессия: без этой логики checkout-payload отправлял
    // "С двух сторон" без файлов и менеджер запутывался.
    const initial = makeEntry({
      printConfig: {
        location: 'front',
        files: { front: makeFileRef() },
      },
    });
    const next = reducer(
      seedState([initial]),
      actions.clearPrintFile({ itemCartId: 'cart-1', side: 'front' }),
    );
    expect(next.order[0].printConfig.files).toEqual({});
    expect(next.order[0].printConfig.location).toBe('none');
  });

  it('НЕ сбрасывает location в "none", пока остаются другие файлы', () => {
    const initial = makeEntry({
      printConfig: {
        location: 'both',
        files: {
          front: makeFileRef(),
          back: makeFileRef(),
        },
      },
    });
    const next = reducer(
      seedState([initial]),
      actions.clearPrintFile({ itemCartId: 'cart-1', side: 'front' }),
    );
    expect(next.order[0].printConfig.location).toBe('both');
  });
});

describe('cart-slice / clearAllPrints', () => {
  it('сбрасывает printConfig к { location: none, files: {} }', () => {
    const initial = makeEntry({
      printConfig: {
        location: 'both',
        files: { front: makeFileRef(), back: makeFileRef() },
      },
    });
    const next = reducer(
      seedState([initial]),
      actions.clearAllPrints({ itemCartId: 'cart-1' }),
    );
    expect(next.order[0].printConfig).toEqual({ location: 'none', files: {} });
  });
});

describe('cart-slice / deleteItemFromCart', () => {
  it('удаляет элемент по itemCartId, не трогая остальные', () => {
    const s = seedState([
      makeEntry({ itemCartId: 'a' }),
      makeEntry({ itemCartId: 'b' }),
    ]);
    const next = reducer(s, actions.deleteItemFromCart({ itemCartId: 'a' }));
    expect(next.order.map((e) => e.itemCartId)).toEqual(['b']);
  });
});

describe('cart-slice / restoreCart', () => {
  it('заменяет order и выставляет isHydrated=true', () => {
    const s = seedState([]);
    expect(s.isHydrated).toBe(false);
    const restored = [makeEntry({ itemCartId: 'x' })];
    const next = reducer(s, actions.restoreCart(restored));
    expect(next.order).toEqual(restored);
    expect(next.isHydrated).toBe(true);
  });
});

describe('cart-slice / markHydrated', () => {
  it('выставляет isHydrated=true без изменения order', () => {
    const s = seedState([makeEntry()]);
    const next = reducer(s, actions.markHydrated());
    expect(next.isHydrated).toBe(true);
    expect(next.order).toHaveLength(1);
  });
});

describe('cart-slice / resetCart', () => {
  it('возвращает initialState, но isHydrated остаётся true', () => {
    // Регрессия: если resetCart возвращает initialState as-is (isHydrated=false),
    // CartClient/checkoutClient ушли бы редиректить ДО завершения hydration race fix.
    const s = seedState([makeEntry()]);
    const next = reducer(s, actions.resetCart());
    expect(next.order).toEqual([]);
    expect(next.isHydrated).toBe(true);
    expect(next.userData.name).toBe('');
    expect(next.deliveryParams.deliveryPrice).toBe(0);
  });
});

describe('cart-slice / setUserData', () => {
  it('обновляет произвольное поле userData по id', () => {
    const s = seedState([]);
    const s1 = reducer(s, actions.setUserData({ id: 'name', value: 'Илья' }));
    const s2 = reducer(s1, actions.setUserData({ id: 'phone', value: '+79991234567' }));
    expect(s2.userData.name).toBe('Илья');
    expect(s2.userData.phone).toBe('+79991234567');
  });
});

describe('cart-slice / initial state', () => {
  it('order=[], isHydrated=false', () => {
    const s = reducer(undefined, { type: '@@INIT' }) as TCartState;
    expect(s.order).toEqual([]);
    expect(s.isHydrated).toBe(false);
  });
});
