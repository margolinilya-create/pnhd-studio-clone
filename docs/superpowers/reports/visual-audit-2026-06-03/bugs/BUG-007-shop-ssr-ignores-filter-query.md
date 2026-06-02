# BUG-007 — Каталог не фильтруется ни на SSR, ни на клиенте (filters totally broken)

| Поле | Значение |
|---|---|
| Severity | 🔴 **Critical** (фильтры — основная фича каталога; не работает функционально) |
| Страница | `/shop?category=…`, `/shop?type=…`, `/shop?priceSort=…` |
| Viewport | Воспроизводится на desktop-1280 (probe), вероятно везде |
| Скриншоты | [BUG-007-evidence-hoodie-filter-not-applied.png](BUG-007-evidence-hoodie-filter-not-applied.png), [BUG-007-evidence-kids-filter-not-applied.png](BUG-007-evidence-kids-filter-not-applied.png) |

## Что увидел

Запустил отдельный targeted probe [tests/visual-audit-2026-06-03/specs/zz-filter-probe.spec.ts](../../../../tests/visual-audit-2026-06-03/specs/zz-filter-probe.spec.ts). Он:

1. Открывает `/shop?<filter>`
2. Ждёт `networkidle` + 3 секунды + скролл к bottom + 1.5 сек
3. Подсчитывает `document.querySelectorAll('a[href^="/shop/"]').length` после client hydration

**Результаты**:

| URL | Реально | Ожидание | Pill активен? |
|---|---|---|---|
| `?category=accesorize` | 8 | 11 | **нет** |
| `?category=kids` | 8 | 2 | **нет** |
| `?category=accesorize&type=tshirt` | 8 | 0 | **нет** |
| `?type=hoodie` | 8 | 3 | **нет** |

На failure screenshot ([BUG-007-evidence-hoodie-filter-not-applied.png](BUG-007-evidence-hoodie-filter-not-applied.png)) при URL `?type=hoodie`:

- Pill «ХУДИ» **не подсвечен** (т.е. UI не знает что фильтр активен)
- В выдаче: 3 свитшота + 1 чёрная футболка с моделью — это **базовая дефолтная выдача** `/shop` без фильтра
- Ни один фильтр не активен (НИ Категория, НИ Тип, НИ Цена)

## SSR

```bash
$ curl -s http://localhost:3000/shop | grep -oE 'href="/shop/[^"]+"' | sort -u | wc -l
8
$ curl -s "http://localhost:3000/shop?category=accesorize" | grep -oE 'href="/shop/[^"]+"' | sort -u | wc -l
8     # те же 8 ссылок, включая 3 свитшота (man category)
```

SSR не учитывает `searchParams`.

## Client

Проверка через `evaluate` после full hydration + scroll-load: тоже **8** и **pill не активен**. Это значит:

- `ProductFilterComp` инициируется с `useState({category:'', type:'', priceSort:''})`
- `useEffect` либо **не срабатывает** (Suspense boundary problem, либо `useSearchParams()` возвращает stale), либо `setFilterState` отрабатывает, но pill не подсвечивается, и `setFilteredData` не вызывается

В DB категории/типы соответствуют значениям URL (`category=accesorize` существует, 11 продуктов). Проверено через Supabase MCP.

## Почему критично

Фильтры — **основная навигационная фича** каталога. Без них пользователь не может:

- Найти только женскую одежду
- Найти только футболки
- Отсортировать по цене

E-commerce без фильтров = unusable catalog для большинства сессий.

## Гипотеза

[src/components/pages-components/shop-page/products-filter/products-filter.tsx](../../../../src/components/pages-components/shop-page/products-filter/products-filter.tsx) использует `useSearchParams()` без обёртки в Suspense (на самом верхнем уровне страницы Suspense есть, но он оборачивает `ProductFilterComp` вместе с children — это правильно для Next.js 15).

Возможные причины:

1. **Next.js 15.4 + React 19 hydration timing**: `useSearchParams()` мог стать `null`/empty в client во время hydration. После hydration не пересчитывается. Стоит проверить `console.log` внутри useEffect.

2. **`ProductCardsBlock` не пересоздаёт state** при изменении `shopData` prop. После того как `setFilteredData(filtered)` срабатывает, `<ProductCardsBlock shopData={filtered}>` рендерится со старым `endIndex`. Если `filtered.length < 8`, должно показать `filtered.length` карточек. Видимо НЕ показывает (показывает 8 из base).

3. **Условный рендеринг сломан**:
   ```tsx
   {isFiltered && filteredData ? (
     <ProductCardsBlock shopData={filteredData} />
   ) : (
     <>{children}</>
   )}
   ```
   Если `isFiltered` остаётся `false` (useEffect не сработал) — рендерится `children` (default SSR с 8 карточками).

4. **Suspense streaming** — `useSearchParams` в Suspense boundary заставляет React откатиться на client-only рендеринг, что может вызвать что-то странное в combinations с RSC.

## Как воспроизвести вручную

```bash
npm run dev
```

В браузере:

1. Открыть `http://localhost:3000/shop?type=hoodie`
2. Посмотреть на pill «ХУДИ» — должен быть active (с крестиком ×). По факту — не active.
3. Посчитать карточки — 8 (а не 3).
4. Открыть DevTools → Console — добавить console.log в useEffect ProductFilterComp и обновить страницу.

## Что сделать

1. **Срочно** — добавить SSR-фильтр в `getAllProducts(filters)` (уже есть `type`, добавить `category`, `priceSort`):
   ```tsx
   export default async function ShopPage({ searchParams }) {
     const sp = await searchParams
     const shopData = await getAllProducts({ category: sp.category, type: sp.type })
     // ... + applyPriceSort
   }
   ```
2. **Debug client-side**: добавить `console.log` в useEffect, проверить, срабатывает ли он на client-нав.
3. **Fallback**: если useEffect не срабатывает в Next.js 15 + RSC контексте — переписать на `usePathname()` + парсить `window.location.search` (грубо, но работает).

## Связано

- [BUG-004](BUG-004-filtered-catalog-lazy-image.md) — lazy-load на мобильном (после починки фильтров не пропадёт).
