# Launch Readiness Report — pnhd-studio-clone

**Date:** 2026-06-01
**Production URL:** https://pnhd-studio-clone.vercel.app
**Auditor:** Claude Opus 4.7 + 6 parallel subagents + Playwright/Lighthouse/axe tooling

---

## Verdict: 🔴 **NO-GO** for public launch

> **2026-06-01 17:17 UTC** — B1 RESOLVED. Payload form-builder migrations applied to prod + 5 forms seeded. `POST /api/form-submissions` → 201 (verified). Remaining: **15 🔴 blockers**.

**16 🔴 blockers across 6 доменов.** Несколько из них критичны прямо для core revenue flow:
- **Lead capture полностью сломан на проде** (form-submissions endpoint = 500) → каждая заполненная форма теряется
- **Checkout client-side crash'ит** на странице оплаты при наличии товара в корзине → юзер не может купить
- **Stored XSS** в Pages collection (`bodyHtml` без DOMPurify) → доступ к user-session через blog/privacy/oferta
- **Orders endpoint unauthenticated** + non-transactional → DoS + orphan-rows + payload bypass
- **Mobile performance:** Lighthouse perf=11 на /shop mobile, LCP=20s на home — Google search ranking penalty + катастрофический UX на 3G

Rejoin после фикса blocker'ов + smoke-revalidation. ETA фиксов: оценочно 1-2 рабочие недели на blocker'ы + 1 неделя на warnings.

---

## TL;DR

| Severity | Count | Action |
|---|---|---|
| 🔴 BLOCKER | **16** | Должны быть пофикшены до launch |
| 🟡 WARNING | ~50 | Фиксить в первую неделю post-launch |
| 🟢 NICE-TO-HAVE | ~35 | Backlog |

**Топ-5 must-fix перед launch (порядок по ROI):**
1. **DB-B1 / CMS1 / F1** — Apply Payload form-builder migration + seed forms. **Без этого даже не имеет смысла остальное фиксить — лиды не падают**. ETA: 30 мин.
2. **M1** — Открыть `/checkout` локально с seeded sessionStorage cart-item, прочитать stack trace, починить (вероятно связано с code-review C3). ETA: 1-3 часа.
3. **SEC-S1 + SEC-S4** — Применить DOMPurify к `bodyHtml`-рендеру, использовать `markup-script.tsx` helper для JSON-LD. ETA: 1 час.
4. **PERF-B1 + PERF-B2 + PERF-B3** — Сжать `Glitch2.jpg` (cwebp), перенести fonts на `next/font/local`, dynamic-import Yandex Maps. ETA: 2-4 часа. Mobile perf score должен подскочить с 11-27 в 50+.
5. **CODE-C2** — Добавить Vercel-aliases в `ALLOWED_ORIGINS` env var (или fallback whitelist в `payload.config.ts`). ETA: 5 мин.

После этих 5 фиксов re-run audit'а → ожидается ≤ 4 blocker'ов осталось.

---

## 🔴 BLOCKERS (16)

### Lead capture / forms

#### ~~B1. Lead capture endpoint возвращает 500~~ ✅ **RESOLVED 2026-06-01 17:17 UTC**
- **Detail:** [06-db-rls-findings.md → B1](./06-db-rls-findings.md) + [07-functional-smoke.md → F1](./07-functional-smoke.md) + [09-cms-payload-sanity.md → CMS1](./09-cms-payload-sanity.md)
- **Action taken:** `npm run payload migrate` applied 3 pending migrations (import_export, form_builder, form_submissions_extra_fields). `scripts/seed-forms.ts` создал 5 форм (Footer Lead, Popup Lead, Shop — нет модели, Product Page Consultation, Methods — консультация)
- **Verification:** `curl -X POST .../api/form-submissions` → 201 с proper submission doc; `ipHash` + `userAgent` populated по hook'ам; `bitrixLeadId: null` (BITRIX_WEBHOOK_URL не выставлен на prod — лиды НЕ загажены в CRM)
- **Gotcha:** Payload `bin/loadEnv.js` имеет ESM-interop bug с новой `@next/env` версией (нет default export) — `import nextEnvImport from '@next/env'` → `undefined`. Workaround: patch `loadEnv.js` строку 1 на `import * as nextEnvImport from '@next/env'`. Patch временный (восстанавливается при `npm install`). **TODO:** upstream PR в Payload, или wrap workaround в `scripts/seed-forms.ts`.

#### B2. `LeadForm` не отправляет required `agreement` field
- **Detail:** [05-code-review-findings.md → C1](./05-code-review-findings.md)
- **Impact:** работает сегодня только потому что form-builder не валидирует submissionData. Лидит compliance/audit risk; breaks как только включим server validation

### Checkout / orders

#### B3. `/checkout` crash'ит client-side exception при наличии item в корзине
- **Detail:** [08-mobile-ux.md → M1](./08-mobile-ux.md) + screenshot `raw/screenshots/checkout-state.png`
- **Impact:** пользователь видит "Application error" вместо корзины → не может оплатить
- **Likely cause:** связано с code-review C3 (orders endpoint non-transactional) + stale RTK Query baseUrl (CLAUDE.md §11 — мёртвый pnhdstudioapi.ru)

#### B4. `/api/orders/create` unauthenticated + unrate-limited + bypasses access via Local API
- **Detail:** [01-security-findings.md → S2](./01-security-findings.md)
- **Impact:** DoS + DB pollution vector. Любой может POST'ить orders без auth

#### B5. `/api/orders/create` создаёт Order + line items вне transaction
- **Detail:** [05-code-review-findings.md → C3](./05-code-review-findings.md)
- **Impact:** mid-loop failure оставляет orphan Order + partial line items

### Security / XSS

#### B6. Stored XSS via `bodyHtml` на `/blog/*`, `/privacy`, `/oferta`
- **Detail:** [01-security-findings.md → S1](./01-security-findings.md)
- **Impact:** admin/marketing roles могут писать raw HTML, рендерится без sanitize. `isomorphic-dompurify` в deps, но не импортится

#### B7. `rateLimitFormSubmissions` читает `x-forwarded-for[0]` — attacker-controlled на Vercel
- **Detail:** [01-security-findings.md → S3](./01-security-findings.md)
- **Impact:** 3/min rate-limit обходится header rotation → unlimited spam в Telegram/Bitrix

#### B8. JSON-LD `</script>` breakout via product `name` / blog `title`
- **Detail:** [01-security-findings.md → S4](./01-security-findings.md)
- **Impact:** XSS injection через любое строковое поле в JSON-LD. Существует safe helper `markup-script.tsx`, но не используется

### Code reliability

#### B9. CSRF whitelist не включает Vercel-aliases
- **Detail:** [05-code-review-findings.md → C2](./05-code-review-findings.md)
- **Impact:** без `ALLOWED_ORIGINS` env var все form-submission'ы и order-create'ы с `*.vercel.app` → 403
- **Quick fix:** добавить `ALLOWED_ORIGINS=https://pnhd-studio-clone.vercel.app,https://pnhd-studio-clone-margolinilya-creates-projects.vercel.app` в Vercel env

#### B10. `notifyBitrix` + `notifyTelegram` блокируют ответ до Vercel timeout (~60s)
- **Detail:** [05-code-review-findings.md → C4](./05-code-review-findings.md)
- **Impact:** слабый upstream → юзер ждёт 60s после submit form-а
- **Fix:** AbortController с timeout 5-10s

### Database / schema

#### B11. `is_admin()` callable by `anon` role
- **Detail:** [06-db-rls-findings.md → B2](./06-db-rls-findings.md) + [09-cms-payload-sanity.md → CMS3](./09-cms-payload-sanity.md)
- **Repro:** `POST /rest/v1/rpc/is_admin` → 200 `false`
- **Fix:** `REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;` или применить `drop_admin_auth` миграцию

#### B12. Schema drift — `drop_admin_auth.sql` не применена на prod
- **Detail:** [06-db-rls-findings.md → B3](./06-db-rls-findings.md) + [09-cms-payload-sanity.md → CMS2](./09-cms-payload-sanity.md)
- **Impact:** dead code (admin_users + is_admin + admin policies) живёт. Cutover never happened

### Performance (mobile launch blocker)

#### B13. 3D-Tee преeagerly грузит 8.6 MB ассетов (texture + HDR + glb) на главной
- **Detail:** [02-performance-findings.md → B1](./02-performance-findings.md)
- **Impact:** LCP=20.6s mobile, TBT=24s mobile на home
- **Root cause:** `useTexture.preload`/`useGLTF.preload` дёргаются на module-import. `next/dynamic` правильно но preload eager
- **Quick fix:** `cwebp Glitch2.jpg` -q 80 → saves ~6.5 MB

#### B14. Custom fonts (NeueMachina, DrukTextWideCyr) вне `next/font/local` — CLS=0.71 на /shop mobile
- **Detail:** [02-performance-findings.md → B2](./02-performance-findings.md)
- **Fix:** mig на `next/font/local` с `display: swap` + `size-adjust`

#### B15. Yandex Maps `<MapComponent>` на главной статически импортирован — 706 KB на каждый home visit
- **Detail:** [02-performance-findings.md → B3](./02-performance-findings.md)
- **Fix:** `dynamic(() => import('@/components/.../map-component'), { ssr: false })` (паттерн уже применён в /checkout — скопировать)

### Accessibility

#### B16. `button-name` critical axe violation на каждой странице — contacts widget
- **Detail:** [03-a11y-findings.md → A1](./03-a11y-findings.md)
- **Impact:** screen reader не может объявить плавающую кнопку контактов
- **Fix:** `<button aria-label="...">`

---

## 🟡 WARNINGS (~50 — abbreviated по доменам)

### Security ([01-security-findings.md](./01-security-findings.md))
- CSP в `Report-Only` режиме с `unsafe-inline`/`unsafe-eval` (production бекенда не блокирует violations)
- HSTS отсутствует в `next.config.mjs`
- Any Payload user (любая role) → доступ в admin UI
- Sentry captures 429 → quota burn во время DoS
- `gallery-images`/`payload-media` Storage buckets разрешают SVG MIME (executable в supabase.co context)
- `marketing` role может писать в Media collection
- `referenceUrl` нет `http(s)://` whitelist

### Performance ([02-performance-findings.md](./02-performance-findings.md))
- `unoptimized` prop в `next/image` на `product-card.tsx`/`product-photos.tsx` — обходит resize/webp/avif
- CSS background-images (`main_screen_image.png` 896 KB) — raw PNG без webp
- Bundle-analyzer не подключён → нет visibility в vendor chunks
- HSTS отсутствует → 900ms redirect penalty per page (Lighthouse считает)
- Best-practices 73 везде из-за 3 console errors (Roistat counter ERR_CONNECTION_CLOSED, /favicon.ico 404, uiscom `app_key` undefined)
- `/shop` + `/shop/[slug]` нет `revalidate` (только /blog* /privacy /oferta — есть)

### A11y ([03-a11y-findings.md](./03-a11y-findings.md))
- `link-name` на logo `<a href="/">` — нет accessible text
- `color-contrast` на breadcrumbs (`#9a9a9a` = 2.81:1) + sizesEyebrow (`#8a8a8a` = 3.45:1) — норма 4.5:1
- Cookie consent banner перекрывает main content на мобильном
- Product page "0 шт." + активная CTA «В корзину» (UX confusion)

### SEO ([04-seo-findings.md](./04-seo-findings.md))
- **W-SEO-01 (важный):** `SITE_INFO.domain = 'studio.pnhd.ru'` — все canonical/og:url/JSON-LD указывают на чужой домен → Vercel-deployment effectively un-indexable
- 6 категорийных страниц (`/futbolki`, `/hudi`, etc.) используют локальный stub `buildMetadata` без canonical/OG/Twitter
- `/admin/login` нет `X-Robots-Tag` header'а (не кооперативные боты могут проиндексировать)
- `error.tsx` / `global-error.tsx` отсутствует → дефолтный английский Next.js fallback
- `/prints` + `/textile` index-страницы пустые, но в sitemap.xml с priority 0.6 (soft-404)
- JSON-LD главной хардкодит `studio.pnhd.ru`
- `opengraph-image.jpg` 832 KB (slow preview)
- `/shop/page.tsx` `metadataBase` указан с trailing path

### Code review ([05-code-review-findings.md](./05-code-review-findings.md))
- `extractIp` возвращает client-controllable `x-forwarded-for[0]`
- Rate-limit check non-transactional → 2 concurrent requests оба проходят
- `UploadSlot` input.value не reset → upload same filename дважды = no-op
- Pre-cart orphan upload (replacing file in slot before "В корзину")
- `setPrintFile`/`setPrintLocation` reducers не в orphan-cleanup matcher
- UploadSlot unmount mid-upload leaks
- Mobile menu state не reset on programmatic navigation

### DB / RLS ([06-db-rls-findings.md](./06-db-rls-findings.md))
- Missing `>= 0` CHECK constraints на price/qty
- `payload-media` bucket public listing
- No leaked-password protection
- Cron job 2 success message misleading
- Legacy `cdn.pnhd.ru` whitelist
- Low-utility `leads_source_idx`

### Functional smoke ([07-functional-smoke.md](./07-functional-smoke.md))
- uiscom tracker JS error spam в console (`app_key undefined`)
- Footer lead-form НЕ имеет `name` атрибутов на inputs (autofill + E2E challenges)

### Mobile UX ([08-mobile-ux.md](./08-mobile-ux.md))
- Cookie banner перекрывает main content на каждой странице
- Битые product images (cdn.pnhd.ru 404)

### CMS / Payload ([09-cms-payload-sanity.md](./09-cms-payload-sanity.md))
- Payload migrations не в CI/CD pipeline (release-checklist manual)
- Latest production deployment основан на `feat/access-read-for-all-roles` (не на main)

### Sentry / Operational ([10-sentry-ops.md](./10-sentry-ops.md))
- Sentry активность не верифицирована (DSN status unknown)
- Vercel runtime logs partial results
- **CLAUDE.md context drift** — несколько утверждений устарели (Next.js версия, admin panel живой, checkout demo-alert, и др.)

---

## 🟢 NICE-TO-HAVE (~35)

Перечислены полностью в per-domain отчётах. Примеры:
- Удалить dead `admin-server.ts` + `rate_limit_log` table
- Удалить unused `isomorphic-dompurify` dep (или использовать)
- Drop `unsafe-eval` из CSP
- COOP / CORP headers
- `WebSite` schema с SearchAction
- `apple-touch-icon-180` + `manifest.json`
- Sitemap segmentation
- Sentry capture на checkout network failures
- Тест `validate-stored-cart` для rejection of malformed file refs

---

## Verification log

| Domain | Status | Coverage |
|---|---|---|
| Security | ✅ Done | RLS + secrets + XSS + CORS + rate-limit + CSP + auth |
| Performance | ✅ Done | 6 Lighthouse runs + bundle component analysis |
| Accessibility | ⚠️ Partial | 4 of 5 axe scans (home timed out), manual code review skipped (subagent оборвался) |
| SEO | ⚠️ Partial | static code analysis only; live HTTP headers / OG image accessibility не верифицированы curl'ом |
| Code review | ✅ Done | lead pipeline + cart + orders + edge cases |
| DB / RLS | ✅ Done | pg_policies + pg_tables + cron + indexes + Payload migrations |
| Functional smoke | ✅ Done | Playwright prod (9 scenarios) |
| Mobile UX | ⚠️ Partial | Pixel 7 only (webkit/iPhone 14 не запущен) |
| CMS readiness | ✅ Done | Payload migrations + forms + submissions |
| Sentry / Ops | ⚠️ Partial | Vercel logs done; Sentry DSN status unverified |

**Не покрыто этим audit'ом (рекомендуется отдельный pass):**
- iPhone 14 / WebKit cross-browser
- Manual keyboard navigation through full checkout flow
- Real Sentry dashboard inspection
- Bitrix CRM + Telegram integration smoke (require env-var inspection)
- WebPageTest waterfall для Three.js / Yandex Maps timing
- Bundle-analyzer для main chunk composition

---

## Suggested fix order

**Sprint 1 (afternoon):** Lead capture + critical security
1. B1 (apply Payload form-builder migration) + B2 (agreement field)
2. B9 (CSRF whitelist Vercel aliases) — 5 min
3. B6 (DOMPurify bodyHtml) + B8 (JSON-LD safe helper)
4. B7 (`x-forwarded-for` → `x-vercel-forwarded-for`)
5. **Smoke-test:** form submit на проде, видим запись в form-submissions с правильным ipHash

**Sprint 2 (1-2 дня):** Checkout + orders
6. B3 (debug /checkout client crash) — открыть Sentry stack trace, починить
7. B4 (auth on orders endpoint)
8. B5 (transaction wrapper)
9. B10 (AbortController на Bitrix/Telegram)
10. **Smoke-test:** добавить товар → перейти /checkout → submit → /thanks

**Sprint 3 (1 день):** Performance + a11y critical
11. B13 (cwebp на Glitch2.jpg) → mobile perf 27→50+
12. B14 (next/font/local) → CLS 0.71→<0.1
13. B15 (dynamic Yandex Maps)
14. B16 (button-name aria-label на contacts widget)
15. **Smoke-test:** Lighthouse mobile home → perf ≥ 50

**Sprint 4 (0.5 дня):** DB cleanup
16. B11 + B12 — apply drop_admin_auth migration

**После Sprint 4:** **re-run этого audit'а**. Целевой verdict: 🟡 GO-WITH-CAVEATS.

---

## Re-audit cadence

Этот audit reproducible:
- Spec: [docs/superpowers/specs/2026-06-01-launch-readiness-audit.md](../../specs/2026-06-01-launch-readiness-audit.md)
- Plan: [docs/superpowers/plans/2026-06-01-launch-audit-execution.md](../../plans/2026-06-01-launch-audit-execution.md)

Playwright + Lighthouse + axe tooling сохранён в `tests/e2e/` + `playwright.config.ts`. Rerun:
```bash
AUDIT_BASE_URL=https://pnhd-studio-clone.vercel.app \
AUDIT_FIRST_SLUG=futbolka-classic-belaya-man \
  npx playwright test tests/e2e/launch-smoke.spec.ts
```

**Рекомендуется re-run перед каждым major release** (новая feature / схема change). После cutover'а на свой production domain — обновить `AUDIT_BASE_URL`.

---

## Appendices

- Per-domain findings: [01-security](./01-security-findings.md) · [02-perf](./02-performance-findings.md) · [03-a11y](./03-a11y-findings.md) · [04-seo](./04-seo-findings.md) · [05-code](./05-code-review-findings.md) · [06-db](./06-db-rls-findings.md) · [07-smoke](./07-functional-smoke.md) · [08-mobile](./08-mobile-ux.md) · [09-cms](./09-cms-payload-sanity.md) · [10-ops](./10-sentry-ops.md)
- Raw artifacts: `raw/` (gitignored — large files)
  - `lighthouse-*.json` × 6
  - `axe-*.json` × 4 (home timed out)
  - `screenshots/pixel7-*.png` × 7 + `checkout-state.png` + `footer-lead-after-submit.png`
  - `playwright-smoke-prod.txt`
  - `axe-scan-output.txt`
  - `mobile-screenshots-output.txt`
