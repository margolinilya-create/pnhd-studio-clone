# Mobile UX Findings

Mobile screenshots полным fullPage'ом через Playwright device emulation Pixel 7 (Chrome Mobile, 412×915). 7 экранов + smoke artifacts. iPhone 14 не сработал (требуется `npx playwright install webkit` — задеплоено только chromium).

## Coverage

| Page | Pixel 7 | iPhone 14 |
|---|---|---|
| / (home) | ✅ pixel7-home.png | ❌ webkit not installed |
| /shop | ✅ pixel7-shop.png | ❌ |
| /shop/futbolka-classic-belaya-man | ✅ pixel7-product.png | ❌ |
| /cart | ✅ pixel7-cart.png | ❌ |
| /checkout | ⚠️ pixel7-checkout.png (показывает /shop — sessionStorage не сохраняется между navigations в Playwright test isolation) | ❌ |
| /blog | ✅ pixel7-blog.png | ❌ |
| /contacts | ✅ pixel7-contacts.png | ❌ |
| /checkout с seeded cart | ✅ checkout-state.png (desktop, smoke spec) | — |

## 🔴 BLOCKERS

### M1. `/checkout` ловит client-side exception когда корзина не пуста
**Severity:** 🔴
**Location:** `/checkout` page (`src/app/(storefront)/checkout/checkoutClient.tsx`)
**Evidence:** Smoke test #9 (`checkout reachable from cart with item`) сидил sessionStorage `order_v3` с тестовым item'ом, навигировал на /checkout. Скриншот `raw/screenshots/checkout-state.png` показывает:
```
Application error: a client-side exception has occurred while loading
pnhd-studio-clone.vercel.app (see the browser console for more information).
```
**Issue:** На полу-валидном cart-item (минимальный shape `{itemCartId, item, quantity, size, printConfig}`) checkout client crash'ит. Это значит когда юзер реально добавит товар и пойдёт оплатить — белый экран ошибки.
**Impact:** Прод-checkout полностью BROKEN. Подтверждается code-review C3+C4: checkoutClient делает реальный `createOrder` call, и/или один из middleware (RTK Query baseURL = мёртвый `pnhdstudioapi.ru` per CLAUDE.md §11) кидает throw на render path.
**Fix:**
1. Открыть Sentry / открыть `/checkout` в browser локально с seeded sessionStorage, прочитать stack trace
2. Перевести зависимости checkout на работающий backend (Payload `/api/orders/create` судя по code review)
3. Защитить render через ErrorBoundary с понятным fallback'ом
**Verification:** Playwright smoke #9 → screenshot не содержит "Application error" текст; реальный flow добавить → проверить переход на /thanks или confirmation.

## 🟡 WARNINGS

### M2. Cookie banner перекрывает main content на мобильном
**Severity:** 🟡 (см. также A4 в a11y findings)
**Location:** На каждом экране (home, shop, product, cart, blog) cookie banner с "МЫ СОБИРАЕМ КУКИ! ... ПОНЯЛ, СОГЛАСЕН!" центрирован поверх viewport.
**Evidence:** `pixel7-product.png` — banner физически лежит на середине экрана, перекрывая size-grid и chips «На рукаве / С двух сторон / Без принта». Пользователь обязан сначала принять cookies — только потом сможет выбрать товар.
**Issue:** Conversion-killer на мобильном. Особенно болезненно если banner закрывает CTA «В корзину».
**Fix:** Перевести banner на bottom-sticky (`position: fixed; bottom: 0; left: 0; right: 0;`) с минимальной высотой ~80-120px. Либо anchored в bottom-corner мини-toast.

### M3. Битые product images (`cdn.pnhd.ru` 404) видны на каталоге
**Severity:** 🟡 (известный долг — CLAUDE.md §11)
**Location:** /shop, /cart — chess-pattern placeholder вместо реальной картинки на ~15 из 25 товаров.
**Evidence:** `pixel7-shop.png` — на каталоге видны транспарентные шахматные плейсхолдеры на свитшотах и кепках.
**Issue:** Невзрачный каталог снижает trust. Эстетика — пользователь думает "проект сломан / не закончен".
**Fix:** Либо залить файлы в `product-images` bucket (есть исходники?), либо подставить хороший placeholder через `next/image` `onError` (custom component), либо помечать товар как unavailable если фото missing.

### M4. На product page `0 шт.` + активная CTA «В корзину»
**Severity:** 🟡 (см. также A5)
**Location:** `pixel7-product.png` — справа от размеров счётчик «0 шт.», слева CTA «В корзину» (зелёная, как activated).
**Issue:** При quantity=0 «В корзину» должна быть disabled или инициализация на 1.
**Fix:** В local state product page инициализировать `quantity: 1`. Либо disable CTA при `quantity === 0`.

## 🟢 NICE-TO-HAVE

- Touch targets на size buttons (XS/S/M) визуально ≥ 44px — выглядят OK на screenshot.
- Footer не отрезает CTA на product page.
- Текст читается, шрифт adequate size на мобильном.
- /contacts mobile layout — Yandex Maps integration на мобильном работает читаемо.
- /blog mobile — карточки постов читаются хорошо.

## Cross-browser

- **iPhone 14 (WebKit):** не покрыто, требует `npx playwright install webkit`. Safari iOS — большой % трафика для RU e-commerce. **Рекомендуется отдельный pass перед launch'ем.**
- **Firefox / Edge:** не покрыто.

## Verification log

- ✅ Pixel 7 emulation: 7 screenshots fullPage
- ✅ Manual screenshot review: home, product, shop, cart, blog, checkout (desktop seeded)
- ⚠️ /checkout с реальным workflow (добавить товар через UI → перейти на checkout) не верифицирован в этом audit'е, но smoke seeded sessionStorage flow exposed crash
- ❌ iPhone 14 / WebKit: не запущено
- ❌ Тач-таргеты через DevTools metrics: визуальная оценка только
- ❌ Mobile keyboard usability (виртуальная клавиатура наезжает на input?): не проверено
