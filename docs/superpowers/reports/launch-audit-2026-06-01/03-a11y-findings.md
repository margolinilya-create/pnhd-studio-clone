# Accessibility Findings

axe-core scan против production (https://pnhd-studio-clone.vercel.app) на 5 страницах, WCAG 2.1 A + AA. Home timed out на `networkidle` (Three.js / трекеры держат коннекшен) — у нас 4 чистые скана: shop, product, cart, blog. Также 8 mobile screenshot'ов с Pixel 7.

> **Note:** этот отчёт написан вручную из raw axe JSON, поскольку a11y-subagent оборвался преждевременно (35 tool uses, не дописал output). Покрытие чек-листа — частичное, см. Verification log.

## axe summary

| Page | Critical | Serious | Moderate | Minor | Total |
|---|---|---|---|---|---|
| /shop | 1 | 2 | 0 | 0 | 3 |
| /shop/futbolka-classic-belaya-man | 1 | 3 | 0 | 0 | 4 |
| /cart | 1 | 2 | 0 | 0 | 3 |
| /blog | 1 | 1 | 0 | 0 | 2 |
| / (home) | — | — | — | — | TIMEOUT (Three.js networkidle) |

## Top rule violations (across 4 pages)

| Rule | Impact | Count | Help |
|---|---|---|---|
| `button-name` | critical | 4 | Buttons must have discernible text |
| `link-name` | serious | 4 | Links must have discernible text |
| `color-contrast` | serious | 3 | Elements must meet minimum color contrast ratio thresholds |
| `scrollable-region-focusable` | serious | 1 | Scrollable region must have keyboard access |

## 🔴 BLOCKERS

### A1. `button-name` критический violation на КАЖДОЙ странице — contacts widget без accessible name
**Severity:** 🔴
**Location:** `src/components/.../contacts-widget/*` (`contactsWidget_contactsWidget_icon__m2gIK`)
**Affected pages:** все 4 проверенные (shop, product, cart, blog)
**Sample HTML:**
```html
<button class="contactsWidget_contactsWidget_icon__m2gIK">
```
**Issue:** Кнопка контактов (плавающий floating-widget справа?) не имеет ни text content, ни `aria-label`, ни `title`. Screen reader announce: "button" без контекста — невозможно понять что это.
**Fix:** `<button aria-label="Открыть контакты">`. Если кнопок несколько — каждой свой label (телефон, мессенджеры).
**Verification:** axe re-run → 0 button-name violations.

## 🟡 WARNINGS

### A2. `link-name` — логотип `<a href="/">` без accessible text
**Severity:** 🟡 (близко к 🔴 — главная навигация недоступна для screen reader, но компенсируется наличием других ссылок)
**Location:** header logo
**Affected pages:** все 4
**Sample HTML:**
```html
<a style="text-decoration:none" href="/">
  <!-- логотип-картинка без alt? или SVG без role=img + aria-label? -->
</a>
```
**Issue:** Логотип-ссылка не имеет текста для screen reader. Пользователю NV/JAWS непонятно куда ведёт.
**Fix:** Один из вариантов:
- `<a href="/" aria-label="ПЙНХ’Д СТУДИЯ — на главную">`
- внутрь `<img alt="ПЙНХ’Д СТУДИЯ">` или `<svg role="img"><title>ПЙНХ’Д СТУДИЯ</title></svg>`
**Verification:** axe re-run → 0 link-name violations.

### A3. `color-contrast` — контраст breadcrumbs / sizesEyebrow ниже 4.5:1
**Severity:** 🟡
**Location:**
- `<a href="/">Главная</a>` — `#9a9a9a` на `#ffffff` = 2.81:1 (требуется 4.5:1)
- `<span class="product-info_sizesEyebrow__53m0y">Размер · видно, сколько осталось</span>` — `#8a8a8a` на `#ffffff` = 3.45:1
**Issue:** Light gray текст не читается людьми с low vision.
**Fix:** Затемнить hint-text до `#6b6b6b` (4.5:1) минимум.
**Verification:** axe re-run + Lighthouse a11y score.

### A4. Cookie consent banner перекрывает контент на мобильном
**Severity:** 🟡
**Location:** Mobile screenshots — `pixel7-product.png`, `pixel7-shop.png` etc. На каждом экране cookie banner с "МЫ СОБИРАЕМ КУКИ!" перекрывает середину viewport.
**Issue:** На product page banner наезжает на size grid и блокирует возможность выбрать размер пока юзер не нажмёт "Понял, согласен!". UX-проблема + a11y если banner не имеет focus trap.
**Fix:** Сделать banner либо bottom-sticky (не покрывать main content), либо modal с proper focus trap. Сейчас он, судя по картинке, в position: absolute поверх контента — bad pattern.
**Verification:** screenshot mobile после fix'а; банер не overlap'ает main content.

### A5. Quantity "0 шт." на product page + активная "В КОРЗИНУ" кнопка
**Severity:** 🟡 (UX-bug с a11y хвостом)
**Location:** `pixel7-product.png` — селектор количества показывает "0 шт.", при этом "В КОРЗИНУ" CTA выглядит enabled.
**Issue:** Если кнопка активна на 0 — что происходит при клике? Если ничего — disabled state нужен (`disabled` или `aria-disabled="true"`). Если добавляет 1 — название "В корзину" misleading при quantity=0.
**Fix:** Либо инициализировать quantity на 1, либо disable кнопку при quantity=0 (proper `<button disabled>`).
**Verification:** keyboard tab на кнопку при quantity=0 — она должна скипаться (или быть aria-disabled).

## 🟢 NICE-TO-HAVE

- `scrollable-region-focusable` нарушение (1 page) — скроллящаяся область без `tabindex="0"`. Низкая частота, не блокирует core flow.
- Mobile screenshots выглядят readable, touch targets визуально OK на CTA (~44px высота). Не верифицировано через DevTools metrics.
- Skip-link (`<a href="#main">`) — не проверял на наличие, рекомендуется добавить для keyboard users.
- Phone input (mui-tel-input) — не верифицировал aria-labels на каждом флаге select'е.

## Verification log

- ✅ axe scan: 4 of 5 pages (home — timeout)
- ✅ Mobile screenshots: 7 Pixel 7 экранов + 1 desktop checkout-state
- ⚠️ Manual code review keyboard nav на ProductInfo (size-grid / print-selector / upload-slot) — НЕ выполнен (subagent оборвался). Рекомендуется отдельный pass перед launch'ем
- ⚠️ Focus trap в MUI Dialog — не верифицирован interactively
- ❌ Home page axe — timeout, нужен retry с `domcontentloaded` strategy
- ❌ iPhone 14 (webkit) screenshots — не сработали (требуется `npx playwright install webkit`)
- ❌ Sentry test event — не отправлен (вместо неудачной попытки можно: проверить `window.Sentry` в Playwright `page.evaluate`)
- ❌ Cross-browser keyboard nav — только Chromium
