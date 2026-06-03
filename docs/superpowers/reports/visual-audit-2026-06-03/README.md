# Visual audit — pnhd-studio-clone — 2026-06-03

Полный визуальный + функционально-визуальный аудит сайта печати на одежде PINHEAD STUDIO по промпту [pnhd_visual_testing_prompt.md].

## Окружение

| Параметр | Значение |
|---|---|
| Базовый URL | `http://localhost:3000` (см. caveat ниже) |
| Дата прогона | 2026-06-03 |
| Браузер | Chromium (Playwright 1.60) headless |
| Viewports (interactive) | 375×812, 768×1024, 1280×800 |
| Viewports (tour) | 375×812, 390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080 |
| Build mode | `next dev` (production build не прогонялся) |

### Caveat — почему localhost, не prod URL

`https://pnhd-studio-clone.vercel.app/` отдаёт **HTTP 403 + `x-vercel-mitigated: challenge`** на headless Chromium — Vercel DDoS Mitigation срабатывает на curl/headless-IP. Это launch-blocker по CLAUDE.md («Vercel Hobby DDoS Mitigation — нужен Pro upgrade ($20/mo) или custom domain cutover»). Поэтому аудит прогнан против локальной копии того же кода + продовой базы (Payload + Supabase prod, тот же `DATABASE_URI`).

### Caveat — dev-mode + параллельность

Прогон выполнен на `next dev` с 3 worker'ами Playwright. Под нагрузкой Next dev отдавал `/cart`, `/futbolki`, `/hudi` за >30 секунд, многие тесты упали по `goto Timeout 30000ms`. Скриншоты на этих pages **не сохранились**. Полное покрытие 7 viewports × 21 страница в tour прервано после ~110/147 тестов. Для production-уровня coverage нужно перепрогонять на `next build && next start` (или против custom domain без DDoS challenge).

Несмотря на caveat — собрано **24 скриншота** + **5 evidence-screenshots** из failure traces. Все ключевые баги воспроизведены и задокументированы.

## Артефакты

- [bugs/](bugs/) — баги, один файл на находку (с воспроизводимыми шагами + предложением фикса)
- [tests/visual-audit-2026-06-03/screenshots/](../../../../tests/visual-audit-2026-06-03/screenshots/) — скриншоты `<viewport>/<scenario>.png` + `tour/<viewport>/<page>.png`
- [tests/visual-audit-2026-06-03/specs/](../../../../tests/visual-audit-2026-06-03/specs/) — Playwright specs:
  - `01-catalog.spec.ts` — фильтры/сортировка/empty/breadcrumbs/NoModel
  - `02-product.spec.ts` — галерея/размеры/CTA/404
  - `03-cart.spec.ts` — пустая/populated/checkout
  - `04-common.spec.ts` — header/footer/menu/FAQ/категории
  - `05-home-other.spec.ts` — home + static pages
  - `99-tour.spec.ts` — fullPage screenshot pass на 7 viewports
  - `zz-filter-probe.spec.ts` — targeted probe BUG-007
- [tests/visual-audit-2026-06-03/playwright.config.ts](../../../../tests/visual-audit-2026-06-03/playwright.config.ts) (interactive) и [playwright.tour.config.ts](../../../../tests/visual-audit-2026-06-03/playwright.tour.config.ts) (7-viewport tour)

## Запуск

```bash
# 1) В одном окне поднять dev-server
npm run dev

# 2) В другом — interactive (3 viewports)
AUDIT_BASE_URL=http://localhost:3000 \
  npx playwright test --config tests/visual-audit-2026-06-03/playwright.config.ts

# 3) Tour (7 viewports × 21 страница) — на dev-mode упирается в timeout,
#    рекомендуется поднимать `npm run build && npm run start` сначала
AUDIT_BASE_URL=http://localhost:3000 \
  npx playwright test --config tests/visual-audit-2026-06-03/playwright.tour.config.ts
```

## Сводка по severity

| Severity | Кол-во | Описание |
|---|---|---|
| 🔴 Critical (блокирует funnel / основная фича не работает) | **4** | BUG-001, BUG-002, BUG-006, BUG-007 |
| 🟠 Major (заметный UX-сбой, dead UI) | **1** | BUG-003 |
| 🟡 Minor (вёрстка/полишь) | **3** | BUG-004, BUG-005, BUG-009 |
| 🔵 Cosmetic (decorative) | **1** | BUG-008 |
| **Всего** | **9** | |

## Топ-проблемы ёком-воронки (приоритет #1 по промпту)

> Это блокеры на пути «каталог → фильтр → товар → корзина → оформить»:

1. **🔴 [BUG-007] Фильтры каталога полностью не работают** — `?category=...`, `?type=...`, `?priceSort=...` не применяются ни на SSR, ни на клиенте. Pill не подсвечивается. Пользователь не может отфильтровать «футболки», «детское», «отсортировать по цене». **Критичнее всего для воронки.**
2. **🔴 [BUG-001] Пустая корзина показывает лид-форму** — без empty-state «корзина пуста», без CTA «вернуться в каталог». Пользователь застревает.
3. **🔴 [BUG-006] /checkout с пустой корзиной — header → footer**, ни заголовка, ни empty-state, ни редиректа.
4. **🔴 [BUG-002] 404 страница товара — полностью белая** — пользователь по битой ссылке (закладка, share) попадает в тупик.
5. **🟡 [BUG-004] На мобильном первый paint каталога = 1 фото + 7 пустых карточек** — lazy-load + 1 колонка = слабый first impression.

## Список багов

| ID | Severity | Страница | Резюме | Статус |
|---|---|---|---|---|
| [BUG-001](bugs/BUG-001-empty-cart-shows-lead-form.md) | 🔴 Critical | `/cart` (пустая) | Пустая корзина показывает лид-форму без объяснения «корзина пуста» + без CTA «вернуться в каталог» | ✅ **FIXED** (branch `fix/visual-audit-2026-06-03`) |
| [BUG-002](bugs/BUG-002-product-404-blank-page.md) | 🔴 Critical | `/shop/<nonexistent>` | 404 на product slug — полностью белый экран без header/footer/CTA | ✅ **FIXED** |
| [BUG-003](bugs/BUG-003-dead-constructor-button.md) | 🟠 Major | `/contacts` + главная | Кнопка «ПЕРЕЙТИ В КОНСТРУКТОР» в `map-screen.tsx` (видна и в /contacts и на главной) + текст «Добавь в конструктор» в `stages-screen.tsx` — legacy после удаления 3D-конструктора | ✅ **FIXED** |
| [BUG-004](bugs/BUG-004-filtered-catalog-lazy-image.md) | 🟡 Minor | `/shop` mobile | Из 8 первых карточек только 1 в-viewport получает изображение; остальные lazy-load | ✅ **FIXED** |
| [BUG-005](bugs/BUG-005-thanks-page-still-shows-lead-form.md) | 🟡 Minor | `/thanks` | После успешной отправки заявки внизу страницы повторяется та же лид-форма «Заполните форму» | ✅ **FIXED** |
| [BUG-006](bugs/BUG-006-checkout-empty-cart-blank.md) | 🔴 Critical | `/checkout` (пустой) | Без позиций в корзине checkout — header→footer, без заголовка, без empty-state, без редиректа | ✅ **FIXED** |
| [BUG-007](bugs/BUG-007-shop-ssr-ignores-filter-query.md) | 🔴 Critical | `/shop?<filter>` | Фильтры не применяются ни на SSR, ни на клиенте; pills не активируются. Подтверждено targeted probe | ✅ **FIXED** |
| [BUG-008](bugs/BUG-008-footer-form-everywhere.md) | 🔵 Cosmetic | layout | Одна и та же лид-форма перед футером на каждой странице — дубль на /contacts, /shop, /thanks, /cart | ✅ **FIXED** (через BUG-005 fix, форма скрыта на /thanks/cart/checkout/shop) |
| [BUG-009](bugs/BUG-009-cart-seed-rejected.md) | 🟡 Test caveat | `/cart` | Test-side: seedCart() shape отвергается валидатором — `cart-populated` скриншоты не отражают real-state | 📝 documented |

## Проверка фиксов (SSR-probe)

```
$ curl -s "http://localhost:3000/shop?category=kids"                  → 2 ссылок ✓
$ curl -s "http://localhost:3000/shop?type=hoodie"                    → 3 ссылок ✓
$ curl -s "http://localhost:3000/shop?category=accesorize&type=tshirt" → 0 ссылок ✓
$ curl -s "http://localhost:3000/cart"      → "Корзина пуста" + "Перейти в каталог" ✓
$ curl -s "http://localhost:3000/checkout"  → "Нечего оформлять" + "Перейти в каталог" ✓
$ curl -s "http://localhost:3000/shop/non-existent" → 404 + "Страница не найдена" ✓
$ curl -s "http://localhost:3000/thanks"    → footer form скрыта ✓
$ curl -s "http://localhost:3000/"          → footer form видна ✓
```

## Что не успели / требует ручной перепроверки

Из-за timeout'ов на dev-mode эти tour-страницы **не получили скриншот** ни на одном viewport (либо часть viewports):

- `/` (home) — все 7 viewports упали по timeout 30s на page.goto. Hero, calculator, отзывы, этапы, FAQ — **не проверены**.
- `/methods/dtg` — failed на большинстве viewports
- `/blog` — failed на большинстве
- `/oferta`, `/privacy`, `/howto`, `/size_chart` — частично failed
- `/hudi`, `/shoppery`, `/kepki`, `/longslivy`, `/svitshoty` (категорийные landing) — failed
- `/shop/<slug>` (product) — частично (tour снял m-375; нужно desktop+tablet)
- `/checkout` populated (с реальной корзиной) — failed из-за BUG-009 seed
- `/cart` populated — failed из-за BUG-009
- 404 страница на разных viewports — частично

Также **не покрыты** интерактивные сценарии (помимо catalog filters):
- Burger menu open/close на mobile (тест failed на goto timeout)
- Hover-состояния карточек товара (Playwright не делал hover-screenshots)
- Size Guide dialog open/close (тест прерван)
- Tablet-768 / Desktop-1280 каталог-фильтр sequence (только desktop probe для filters)

## Coverage matrix (что проверено)

| Сценарий | mobile-375 | tablet-768 | desktop-1280 | Tour (7vp) |
|---|---|---|---|---|
| `/shop` базовый | ✅ | ✅ | ✅ | partial |
| `/shop?category=<X>` | ✅ (cat-man) | — | — | — |
| `/shop?type=<X>` | ✅ (type-tshirt) | — | — | — |
| `/shop?priceSort=ASC` | ✅ | — | — | — |
| `/shop?<empty combo>` | — | — | — | partial (m-375, m-390, t-768) |
| Sort toggle off | — | — | — | — |
| Reset button | — | — | — | — |
| NoModel block | — | — | — | — |
| Catalog → product → back (URL state) | — | — | — | — |
| Product page (sample) | — | — | — | only m-375 |
| Product 404 | ✅ | — | — | — |
| Size guide dialog | — | — | — | — |
| Cart empty | ✅ | — | — | partial |
| Cart populated | — | — | seed broken | — |
| Checkout reachable | — | — | — | partial (m-375, d-1280, t-1024) |
| Checkout submit validation | — | — | — | — |
| Header / Footer / Burger | — | — | — | — |
| Categories landing | — | — | — | only m-375 futbolki (partial) |
| Static pages (/contacts, /loyalty) | ✅ | — | — | partial |
| /thanks | ✅ | — | — | — |
| /howto, /size_chart, /privacy, /oferta | — | — | — | partial |
| /methods/dtg, /blog | — | — | — | — |
| home | — | — | — | — |

## Рекомендуемые follow-ups

1. **Поднять `next build && next start`** локально → перепрогнать tour (получить полное покрытие 7 viewports × 21 страница).
2. **Альтернатива** — поднять production через Vercel (после Pro upgrade или custom domain) → перепрогнать с `AUDIT_BASE_URL=https://your-prod-url/`.
3. **Починить BUG-007** в первую очередь — это unlocks реальную выборку фильтров для аудита. Сейчас все скриншоты `?category=`, `?type=` показывают **default содержимое** = не имеют ценности для проверки.
4. **Переписать seed корзины** в [03-cart.spec.ts](../../../../tests/visual-audit-2026-06-03/specs/03-cart.spec.ts) через UI-flow (open product → add to cart) либо изучить `validateStoredCart` и подогнать payload.
5. **Manual smoke** на проде через настоящий браузер для подтверждения BUG-007 (фильтры) и BUG-002 (404) — headless может вести себя иначе.

## Заметки по архитектуре, не баги

- Header на desktop: «ежедневно 11:00-20:00 | лого ПИНХЭД СТУДИЯ | +7 (812) 904 61 56 | СДЕЛАТЬ ЗАКАЗ» + меню «КАТАЛОГ / МЕТОДЫ НАНЕСЕНИЯ / ЭТАПЫ РАБОТЫ / ОТЗЫВЫ / FAQ / КОНТАКТЫ / БОНУСЫ / ОПТОВЫЙ ОТДЕЛ»
- Footer на desktop: «МЕТОДЫ НАНЕСЕНИЯ / ЭТАПЫ РАБОТЫ / ОТЗЫВЫ / FAQ / КОНТАКТЫ» + штрих-код decoration + ИНН/КПП + © + большой logotype «ПИНХЭД СТУДИЯ»
- ContactsWidget (плавающая кнопка) — `<button aria-label>` в углу bottom-right, на всех страницах
- На mobile bottom-right тот же ContactsWidget виден на всех страницах
- Cart icon в header (бургер на mobile?) — counter после populated; visual не проверен из-за seed-issue
