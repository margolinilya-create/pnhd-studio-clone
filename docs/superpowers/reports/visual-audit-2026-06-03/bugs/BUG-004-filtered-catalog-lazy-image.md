# BUG-004 — На мобильном каталоге картинки подгружаются только для первой карточки

| Поле | Значение |
|---|---|
| Severity | 🟡 Minor (визуальная пустота при first paint) |
| Страница | `/shop` и `/shop?<filter>` |
| Viewport | 375×812 (заметно), 768×1024 (заметно), 1280×800 (не воспроизводится) |
| Браузер | Chromium 1.60 headless (`next dev`) |
| Скриншоты | [mobile-375/catalog-cat-man.png](../../../../tests/visual-audit-2026-06-03/screenshots/mobile-375/catalog-cat-man.png), [mobile-375/catalog-sort-asc.png](../../../../tests/visual-audit-2026-06-03/screenshots/mobile-375/catalog-sort-asc.png), [tour/t-768/shop.png](../../../../tests/visual-audit-2026-06-03/screenshots/tour/t-768/shop.png) |

## Что видно

На мобильном (1 колонка) при открытии `/shop` или любого фильтра:

- 1-я карточка имеет фото
- 2-я … 8-я карточка отрисованы (есть `title + price`), но **место под фото пустое** — `<img>` не подгружен
- При скролле вниз фото подгружаются (`loading="lazy"` + IntersectionObserver in `ProductCardsBlock`)

На desktop 1280 (4 колонки, 8 карточек в первом «экране») — все 8 фото подгружены сразу.

## Почему так

В [src/components/pages-components/shop-page/product-card/product-card.tsx](../../../../src/components/pages-components/shop-page/product-card/product-card.tsx) `<Image loading="lazy">`. Браузер не подгружает off-viewport картинки до того как они станут видны. На mobile с 1 колонкой это означает, что only 1-я карточка in-viewport — она получает image, остальные нет.

## Что это значит для пользователя

- На реальном устройстве пользователь увидит **1 фото + 7 «текстовых пустышек»** в первом экране при scroll position = 0
- Дальше при скролле фото догружаются — OK
- Но first impression на мобильном **проседает**: каталог выглядит «полуразобранным»

## Что предложить

Вариант 1 — eager на первые N карточек:
```tsx
<Image loading={index < 3 ? 'eager' : 'lazy'} priority={index === 0} ... />
```
Это требует пропуска `index` через `ProductCardsBlock → ProductCard`.

Вариант 2 — расширить root margin наблюдателя:
В [src/components/pages-components/shop-page/product-cards-block/product-cards-block.tsx](../../../../src/components/pages-components/shop-page/product-cards-block/product-cards-block.tsx#L11) поменять `rootMargin: '0px 0px 50px 0px'` → `'0px 0px 600px 0px'`. Это начнёт догружать раньше скролла.

Вариант 3 — `loading="eager"` для первых 4 (PAGE_SIZE/2) карточек. Меньше JS, проще.

## Caveat

Прогон выполнен на `next dev`. В prod билде `next/image` может вести себя иначе (preload-hints). Перепроверить на `next start`.
