# Functional Smoke Findings

Playwright smoke tests против production (https://pnhd-studio-clone.vercel.app), desktop Chromium project. 9 сценариев.

## Результаты

| # | Сценарий | Status | Notes |
|---|---|---|---|
| 1 | home renders without console errors | ✘ FAIL | `pageerror: Cannot read properties of undefined (reading 'app_key')` + `console: Failed to load resource: net::ERR_CONNECTION_CLOSED` — оба от стороннего uiscom-трекера (`https://app.uiscom.ru/static/cs.min.js`). Не блокер для функциональности, но мусорит console для legitimate users |
| 2 | shop list renders products | ✓ PASS | 2.6s |
| 3 | product page (futbolka-classic-belaya-man) renders | ✓ PASS | 3.8s, h1 + размеры видны |
| 4 | footer lead form submits | - SKIP | Селектор `footer input[name="name"]` не нашёл inputs — `lead-form.tsx` использует MUI `TextField` без явного `name` атрибута. Test was test.skip(), not failure |
| 5 | cart hydration after refresh | ✓ PASS | 4.6s, корзина либо рендерится либо редиректит на /shop ПОСЛЕ hydration — race-fix работает |
| 6 | admin login (Payload) returns 200 | ✓ PASS | 3.3s |
| 7 | blog list renders | ✓ PASS | 4.3s |
| 8 | static pages (/contacts, /oferta, /privacy, /loyalty) | ✓ PASS | 7.9s — все 4 страницы 200 |
| 9 | checkout reachable from cart (with seeded sessionStorage item) | ✓ PASS | 4.7s, страница рендерится. Скриншот → `raw/screenshots/checkout-state.png` |

**Сводка:** 7 pass / 1 fail (3rd-party tracker error) / 1 skip (selector mismatch — не функциональный fail)

## 🔴 BLOCKERS

### F1. POST /api/form-submissions возвращает 500 на prod — lead capture broken
**Severity:** 🔴
**Location:** /api/form-submissions endpoint
**Evidence:**
```bash
$ curl -X POST -H "Content-Type: application/json" -d '{}' https://pnhd-studio-clone.vercel.app/api/form-submissions
500 {"errors":[{"message":"Something went wrong."}]}
```
**Issue:** Payload form-builder migrations (`payload_plugin_form_builder`, `payload_plugin_import_export`, `payload_form_submissions_extra_fields`) НЕ применены на prod БД. Таблицы `payload.forms` и `payload."form-submissions"` отсутствуют — любая попытка submission падает 500. Подтверждено DB subagent'ом в [06-db-rls-findings.md](./06-db-rls-findings.md) (B1).
**Impact:** Все 5 lead-форм (footer, popup, NoModelBlock на /shop, product-page, methods-consultation) НЕ работают на проде. Юзеры заполнивают форму — получают error toast. Бизнес теряет каждый входящий лид.
**Fix:**
1. С production-`DATABASE_URI` в `.env.local`: `npm run payload migrate`
2. Запустить `npx tsx --env-file=.env.production scripts/seed-forms.ts` чтобы создать 5 seeded форм
3. Re-test: `curl -X POST ...` → ожидается 400 (валидация payload) или 200 (если payload корректный)
**Verification:** smoke test #4 не skip'нется (форма submit'нет успешно), Payload admin `/admin/collections/form-submissions` показывает test-запись с `ipHash`

## 🟡 WARNINGS

### F2. uiscom tracker JS error spam в console
**Severity:** 🟡
**Location:** `src/app/(storefront)/layout.tsx:98` — `<Script async src="https://app.uiscom.ru/static/cs.min.js?k=...">`
**Issue:** При загрузке главной uiscom скрипт выкидывает `Cannot read properties of undefined (reading 'app_key')` + `net::ERR_CONNECTION_CLOSED` на одну из его XHR-запросов. Очевидно у нас в проекте не выставлен какой-то required глобал для uiscom widget (`comagicConfig`?), либо API-key `79obNG5YrzIplUgKXZYSiPbK7agWm7Dk` не подходит для текущего домена.
**Impact:** Console мусорит ошибками — мешает debug юзерам если они откроют DevTools. Sentry может ловить эти ошибки и тратить квоту (если init Sentry до `<Script>` загрузки). Не блокер для функциональности.
**Fix:** либо настроить uiscom правильно (передать `comagicConfig` глобал), либо отключить виджет если он не нужен, либо обновить ключ для нашего домена.
**Verification:** consoleerror'ы исчезают на главной после fix'а.

### F3. Footer lead-form НЕ имеет нативного `name` атрибута на inputs
**Severity:** 🟡
**Location:** `src/components/shared-components/lead-form/lead-form.tsx` (MUI TextField + MuiTelInput)
**Issue:** Form inputs полагаются только на MUI internal labels и Redux store вместо form-level state. Без `name` атрибутов:
- Browser autofill менее надёжен (autofill попадает по `autocomplete` + типу + рядом стоящему label, но без `name` reliability ниже)
- E2E тесты не могут навигировать по `[name="..."]` (что и поймал smoke)
- Native form serialization / form-data сборка не работает
**Fix:** Добавить `name`-атрибут на каждый TextField: `<TextField name="name" />`, `<MuiTelInput name="phone" />`.
**Verification:** smoke test #4 (footer lead form) пройдёт; DevTools console: `new FormData(form).get('name')` → не null.

### F4. Selector mismatch на смоке — не обнаружили реальный submit
**Severity:** 🟡 (test methodology, not feature)
**Location:** `tests/e2e/launch-smoke.spec.ts:34-63`
**Issue:** Скрытое следствие F3 — не успели проверить реальный submit footer формы на проде. Test skip'нулся. Учитывая F1 (form-submissions endpoint падает 500) — реальный submit в любом случае пошёл бы в ошибку.
**Fix:** После F1+F3 фикса — переделать selector в smoke на `data-testid="lead-form-name"` (или эквивалент). Re-run.

## 🟢 NICE-TO-HAVE

- Smoke против localhost не запускался (приоритет: prod findings важнее). Если разработчик хочет — задокументированы команды в плане выполнения, можно прогнать в любой момент.
- Сценарий E2E «реальный flow: главная → каталог → продукт → корзина → checkout → submit» — после F1 фикса полезно добавить как regression net.

## Verification log
- ✅ Главная: рендер OK, 1 tracker-side JS error
- ✅ /shop: 25 карточек рендерятся
- ✅ /shop/[slug]: full page renders (futbolka-classic-belaya-man)
- ❌ Footer lead-form submit: не верифицирован (selector mismatch + endpoint 500)
- ✅ /cart hydration race fix: подтверждён работает
- ✅ /admin (Payload): 200 на login
- ✅ /blog: 200 рендер
- ✅ 4 статические страницы: все 200
- ✅ /checkout reachable: рендерится при наличии item в cart
- ❌ Smoke против localhost: не запускался (deprioritized)
- ❌ Cross-browser (Safari/Firefox/Edge): не запускался — только Chromium
