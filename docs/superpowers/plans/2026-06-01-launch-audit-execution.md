# Launch Readiness Audit — Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Прогнать launch-readiness audit по спеку [2026-06-01-launch-readiness-audit.md](../specs/2026-06-01-launch-readiness-audit.md) и собрать единый go/no-go отчёт.

**Architecture:** 6 specialized subagent'ов в параллель делают статический анализ по своим доменам. Параллельно я ставлю Playwright/Lighthouse/axe и гоняю динамический smoke на проде + localhost + мобильную эмуляцию. Все артефакты складываются в `docs/superpowers/reports/launch-audit-2026-06-01/`. На финале — агрегирую findings в `README.md` с severity-классификацией.

**Tech Stack:** Playwright (smoke + mobile screenshots + Payload drive-by), Lighthouse CLI (Core Web Vitals), `@axe-core/playwright` (a11y scan), Supabase MCP (RLS/policies/cron SQL queries), Vercel MCP (deployment URLs + logs + env state), 6 параллельных Agent dispatches.

---

## Артефакт-структура

```
docs/superpowers/reports/launch-audit-2026-06-01/
├── README.md                       # финальный отчёт (severity-классификация)
├── 01-security-findings.md         # security-auditor subagent output
├── 02-performance-findings.md      # performance-engineer subagent output
├── 03-a11y-findings.md             # accessibility subagent output
├── 04-seo-findings.md              # seo-audit subagent output
├── 05-code-review-findings.md      # code-reviewer subagent output
├── 06-db-rls-findings.md           # database-admin subagent output
├── 07-functional-smoke.md          # Playwright smoke результаты (prod + local)
├── 08-mobile-ux.md                 # mobile screenshots + manual issues
├── 09-cms-payload-sanity.md        # Payload admin sanity-check
├── 10-sentry-ops.md                # Sentry event + Vercel logs spot-check
└── raw/
    ├── lighthouse-home-mobile.json
    ├── lighthouse-home-desktop.json
    ├── lighthouse-shop-mobile.json
    ├── lighthouse-shop-desktop.json
    ├── lighthouse-product-mobile.json
    ├── lighthouse-product-desktop.json
    ├── axe-home.json
    ├── axe-shop.json
    ├── axe-product.json
    ├── axe-cart.json
    ├── axe-blog.json
    ├── playwright-smoke-prod.txt
    ├── playwright-smoke-local.txt
    └── screenshots/
        ├── iphone14-home.png
        ├── iphone14-shop.png
        ├── ...
```

---

## Phase 0 — Preflight (sequential)

### Task 0.1: Resolve production URL

**Files:** none (информационный шаг)

- [ ] **Step 1: Query Vercel MCP для production deployment**

```
Tool: mcp__claude_ai_Vercel__list_deployments
Args: { teamId: "team_gg2ut4vzpiq8w8GICbmxzlTG", projectId: "prj_Jf5p3M82GCpUEEXuZnyNuEo3vHZK", target: "production", limit: 3 }
```

Expected: список последних production deployments, верхний — текущий live. Записать canonical URL (e.g. `pnhd-studio-clone-margolinilya-creates-projects.vercel.app`) в переменную `PROD_URL` для последующих шагов.

- [ ] **Step 2: Smoke-curl URL чтобы убедиться что не Vercel Security Checkpoint**

```bash
curl -sI https://$PROD_URL/ | head -5
```

Expected: `HTTP/2 200` (или 308 → followed). Если получаем `Vercel Security Checkpoint` HTML — пробуем через Vercel MCP `get_access_to_vercel_url` или используем альтернативный alias.

---

### Task 0.2: Verify Bitrix env state

**Files:** none

- [ ] **Step 1: Проверить выставлен ли BITRIX_WEBHOOK_URL на prod**

```
Tool: mcp__claude_ai_Vercel__get_project
Args: { teamId: "team_gg2ut4vzpiq8w8GICbmxzlTG", projectId: "prj_Jf5p3M82GCpUEEXuZnyNuEo3vHZK" }
```

Expected: в ответе список env vars. Найти `BITRIX_WEBHOOK_URL` в production target.

- [ ] **Step 2: Решение**

- Если `BITRIX_WEBHOOK_URL` пуст или отсутствует — ✅ можно делать smoke с тестовыми form-submission'ами, они не уйдут в Bitrix.
- Если выставлен — записать в [07-functional-smoke.md](../reports/launch-audit-2026-06-01/07-functional-smoke.md): «smoke выполнен с пометкой `[AUDIT]` в имени, тестовые лиды требуется удалить из Bitrix вручную».

---

### Task 0.3: Создать артефакт-директорию

**Files:**
- Create: `docs/superpowers/reports/launch-audit-2026-06-01/README.md` (placeholder skeleton)
- Create: `docs/superpowers/reports/launch-audit-2026-06-01/raw/`
- Create: `docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots/`

- [ ] **Step 1: mkdir + skeleton**

```bash
mkdir -p docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots
```

- [ ] **Step 2: Создать README.md placeholder**

```markdown
# Launch Readiness Report

**Date:** 2026-06-01
**Status:** 🟡 IN PROGRESS

Этот файл будет перезаписан на финальном шаге аудита.
```

Save to `docs/superpowers/reports/launch-audit-2026-06-01/README.md`.

---

## Phase 1 — Dispatch static-analysis subagents (parallel, background)

### Task 1.1: Запустить 4 subagent'а параллельно в одном сообщении

**Files:** none (агенты пишут в `reports/launch-audit-2026-06-01/0X-*-findings.md` напрямую)

- [ ] **Step 1: Отправить 4 Agent tool calls в одном сообщении (background)**

Все 4 запускаются `run_in_background: true`. Каждый агент пишет свой отчёт в указанный файл.

**Agent #1: security-auditor**
```
subagent_type: security-auditor
description: Security audit
run_in_background: true
prompt:
  Проводим launch-readiness audit для production e-commerce проекта pnhd-studio-clone.
  Прочитай /Users/margolinilya/studio/pnhd-studio/CLAUDE.md (особенно §6, §7, §10, §15) для понимания архитектуры.
  Прочитай раздел "1. Security audit" в /Users/margolinilya/studio/pnhd-studio/docs/superpowers/specs/2026-06-01-launch-readiness-audit.md — там детальный чек-лист что искать.

  Tools которые у тебя есть:
  - Read/Grep/Glob/Bash для статического анализа кода
  - Supabase MCP (mcp__claude_ai_Supabase__*) — используй execute_sql для запросов pg_tables/pg_policies/pg_roles. Project id: almfjmiygtnzngkayhdv

  Output: запиши findings в /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/01-security-findings.md

  Структура отчёта:
  # Security Findings

  ## 🔴 BLOCKERS
  - [item] — file:line — description — fix sketch — verification

  ## 🟡 WARNINGS
  - ...

  ## 🟢 NICE-TO-HAVE
  - ...

  ## Verification log
  - ✅ что проверено (RLS coverage / secrets exposure / XSS / CORS / rate-limit / CSP / auth)
  - ❌ что не смог проверить (с reason)

  Severity критерии — в спеке. Если не уверен в severity — пиши свой judgement + reason.
  Ничего не фикси, только find + repro + recommendation.
```

**Agent #2: seo-audit**
```
subagent_type: seo-audit
description: SEO audit
run_in_background: true
prompt:
  Launch-readiness audit для production e-commerce проекта pnhd-studio-clone (RU-only).
  Прочитай /Users/margolinilya/studio/pnhd-studio/CLAUDE.md (§3 routing, §10 critical files).
  Прочитай раздел "4. SEO audit" в /Users/margolinilya/studio/pnhd-studio/docs/superpowers/specs/2026-06-01-launch-readiness-audit.md.

  Production URL: <PROD_URL из Task 0.1>

  Найди:
  - meta title/description на всех routes
  - OpenGraph / Twitter cards
  - JSON-LD structured data (Organization, Product, BlogPosting)
  - canonical URL (особенно 6 категорийных страниц vs /shop)
  - sitemap.ts / robots.ts — отсутствуют, подтверди и предложи минимальную реализацию
  - 404/error pages с noindex
  - HTTPS / redirects

  Output: /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/04-seo-findings.md
  Структура — та же что у security (BLOCKERS / WARNINGS / NICE-TO-HAVE / Verification log).
  Ничего не фикси, только find + recommendation.
```

**Agent #3: code-reviewer**
```
subagent_type: code-reviewer
description: Code-level bug review
run_in_background: true
prompt:
  Launch-readiness audit. Цель — найти actual bugs (не styling/refactoring) в 4 областях:
  1. Lead pipeline: /Users/margolinilya/studio/pnhd-studio/src/hooks/{rateLimitFormSubmissions,notifyBitrix,notifyTelegram}.ts + /Users/margolinilya/studio/pnhd-studio/src/lib/forms/*
  2. Cart (Redux + listener middleware): /Users/margolinilya/studio/pnhd-studio/src/redux/{store,cart-slice/cart.slice,middleware/cart-persist,middleware/cart-orphan-cleanup}.ts + /Users/margolinilya/studio/pnhd-studio/src/lib/cart/validate-stored-cart.ts
  3. Admin Server Actions: /Users/margolinilya/studio/pnhd-studio/src/app/(authed)/admin/**/actions.ts + syncChildren/syncLinks logic
  4. Edge cases: checkout demo-alert path, mobile-меню, printConfig coercion из legacy sessionStorage

  Контекст: /Users/margolinilya/studio/pnhd-studio/CLAUDE.md (§4 state management, §15 admin panel) + /Users/margolinilya/studio/pnhd-studio/docs/superpowers/specs/2026-06-01-launch-readiness-audit.md раздел "5. Code-level bugs review".

  Output: /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/05-code-review-findings.md
  Структура — BLOCKERS / WARNINGS / NICE-TO-HAVE / Verification log.
  Для каждого bug: severity, file:line, repro, fix sketch.
```

**Agent #4: database-admin**
```
subagent_type: database-admin
description: DB / RLS / migrations audit
run_in_background: true
prompt:
  Launch-readiness audit DB-слоя для production проекта pnhd-studio-clone.
  Прочитай /Users/margolinilya/studio/pnhd-studio/CLAUDE.md (§6 supabase, §10 critical files, §15 admin panel) + раздел "6. DB / migrations / RLS audit" в /Users/margolinilya/studio/pnhd-studio/docs/superpowers/specs/2026-06-01-launch-readiness-audit.md.

  Tools: Supabase MCP (mcp__claude_ai_Supabase__*). Project id: almfjmiygtnzngkayhdv. Используй execute_sql.

  SQL queries to run (как минимум):
  - select tablename, rowsecurity from pg_tables where schemaname in ('public', 'payload') order by schemaname, tablename;
  - select schemaname, tablename, policyname, permissive, roles, cmd, qual from pg_policies where schemaname in ('public', 'storage') order by schemaname, tablename;
  - select * from pg_indexes where schemaname = 'public' and tablename in ('products', 'product_sizes', 'leads', 'form-submissions');
  - select * from cron.job;
  - select * from cron.job_run_details order by start_time desc limit 30;
  - select column_name, is_nullable, data_type, column_default from information_schema.columns where table_schema = 'public' and table_name in ('products', 'product_sizes', 'leads') order by table_name, ordinal_position;

  Также прочитай /Users/margolinilya/studio/pnhd-studio/supabase/migrations/*.sql и /Users/margolinilya/studio/pnhd-studio/src/migrations/*.ts на idempotency.

  Output: /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/06-db-rls-findings.md
  Структура — BLOCKERS / WARNINGS / NICE-TO-HAVE / Verification log.
  Включи SQL output снапшоты в Appendices.
```

- [ ] **Step 2: Подтвердить что 4 background agent'а запущены**

После отправки сообщения проверить что вернулись 4 tool result'а с background agent ID/name. Перейти к Phase 2 не дожидаясь.

---

## Phase 2 — Tooling setup (паралельно с running subagents)

### Task 2.1: Установить Playwright

**Files:**
- Modify: `package.json` (добавится devDependency)
- Create: `playwright.config.ts`

- [ ] **Step 1: Установить пакет**

```bash
npm i -D @playwright/test
```

Expected: install OK, `@playwright/test` появляется в `package.json` devDeps.

- [ ] **Step 2: Установить Chromium браузер**

```bash
npx playwright install --with-deps chromium
```

Expected: download finished. Если на macOS требует password — пользователь подтверждает.

- [ ] **Step 3: Создать playwright.config.ts**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/playwright.json' }]],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone14', use: { ...devices['iPhone 14'] } },
    { name: 'pixel7', use: { ...devices['Pixel 7'] } },
  ],
})
```

Save to `/Users/margolinilya/studio/pnhd-studio/playwright.config.ts`.

---

### Task 2.2: Установить axe-core + Lighthouse CLI

- [ ] **Step 1: Установить @axe-core/playwright**

```bash
npm i -D @axe-core/playwright
```

Expected: install OK.

- [ ] **Step 2: Установить Lighthouse CLI глобально или через npx**

```bash
npx lighthouse --version
```

Expected: версия 11.x или новее. Если не находит — `npm i -D lighthouse`.

---

## Phase 3 — Functional smoke (Playwright)

### Task 3.1: Написать smoke-spec

**Files:**
- Create: `tests/e2e/launch-smoke.spec.ts`

- [ ] **Step 1: Создать спек со всеми сценариями из спека раздел 7**

```ts
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://pnhd-studio-clone.vercel.app'

test.describe('Launch smoke', () => {
  test('home renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

    const response = await page.goto(BASE_URL + '/')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveTitle(/.+/)
    // Filter known-noisy 3rd-party errors (Roistat / Metrica) if needed
    const realErrors = errors.filter(e => !/roistat|metrica|uiscom/i.test(e))
    expect(realErrors, `console errors: ${realErrors.join('\n')}`).toEqual([])
  })

  test('shop list renders products', async ({ page }) => {
    await page.goto(BASE_URL + '/shop')
    const cards = page.locator('[data-testid="product-card"], a[href*="/shop/"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('product page interactive flow', async ({ page }) => {
    await page.goto(BASE_URL + '/shop')
    await page.locator('a[href*="/shop/"]').first().click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toBeVisible()
    // Verify size grid and print selector present
    await expect(page.getByText(/размер/i).first()).toBeVisible()
  })

  test('footer lead form submits with audit marker', async ({ page }) => {
    await page.goto(BASE_URL + '/')
    await page.locator('footer').scrollIntoViewIfNeeded()
    const nameInput = page.locator('footer input[name="name"], footer input[placeholder*="Имя"]').first()
    await nameInput.fill('[AUDIT] Test')
    const phoneInput = page.locator('footer input[type="tel"]').first()
    await phoneInput.fill('+79991234567')
    const emailInput = page.locator('footer input[type="email"]').first()
    if (await emailInput.count() > 0) await emailInput.fill('audit@example.com')
    const agreement = page.locator('footer input[type="checkbox"]').first()
    if (await agreement.count() > 0) await agreement.check()
    const submitBtn = page.locator('footer button[type="submit"]').first()
    await submitBtn.click()
    // Either success state or visible error — we capture both
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots/footer-lead-after-submit.png', fullPage: false })
  })

  test('cart hydration after hard refresh', async ({ page }) => {
    await page.goto(BASE_URL + '/cart')
    await page.waitForLoadState('networkidle')
    // Empty cart should redirect to /shop after hydration, NOT immediately
    // We just verify no immediate redirect (the hydration race fix)
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).toMatch(/\/(cart|shop)$/)
  })

  test('admin login page returns 200', async ({ page }) => {
    const resp = await page.goto(BASE_URL + '/admin/login')
    expect(resp?.status()).toBeLessThan(400)
  })

  test('blog list and post', async ({ page }) => {
    const resp = await page.goto(BASE_URL + '/blog')
    if (resp && resp.status() < 400) {
      const firstPost = page.locator('a[href*="/blog/"]').first()
      if (await firstPost.count() > 0) {
        await firstPost.click()
        await expect(page.locator('h1')).toBeVisible()
      }
    }
  })

  test('static pages render', async ({ page }) => {
    for (const path of ['/contacts', '/oferta', '/privacy', '/loyalty']) {
      const resp = await page.goto(BASE_URL + path)
      expect(resp?.status(), `${path} status`).toBeLessThan(400)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('checkout shows disclaimer or disabled CTA', async ({ page }) => {
    // Add product to cart first via sessionStorage manipulation
    await page.goto(BASE_URL + '/shop')
    await page.evaluate(() => {
      const order = [{
        itemCartId: 'audit-test-' + Date.now(),
        item: { slug: 'audit', title: 'Audit', price: 1, image_url: '' },
        quantity: 1,
        size: 'M',
        printConfig: { location: 'none', files: {} },
      }]
      sessionStorage.setItem('order_v3', JSON.stringify(order))
    })
    const resp = await page.goto(BASE_URL + '/checkout')
    expect(resp?.status()).toBeLessThan(400)
    await page.screenshot({ path: 'docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots/checkout-state.png', fullPage: true })
  })
})
```

Save to `/Users/margolinilya/studio/pnhd-studio/tests/e2e/launch-smoke.spec.ts`.

---

### Task 3.2: Прогнать smoke против prod (desktop)

- [ ] **Step 1: Run**

```bash
AUDIT_BASE_URL=https://$PROD_URL npx playwright test tests/e2e/launch-smoke.spec.ts --project=desktop 2>&1 | tee docs/superpowers/reports/launch-audit-2026-06-01/raw/playwright-smoke-prod.txt
```

Expected: список pass/fail по сценариям. Не паникуем при fail — это findings.

- [ ] **Step 2: Захватить failing screenshot/trace**

Playwright auto-сохраняет в `test-results/`. Скопировать в:

```bash
cp -r test-results docs/superpowers/reports/launch-audit-2026-06-01/raw/playwright-prod-results 2>/dev/null || true
```

---

### Task 3.3: Запустить локальный dev server и прогнать smoke против localhost

- [ ] **Step 1: Запустить dev в background**

```bash
npm run dev
```

Run with `run_in_background: true`. Дождаться `ready` в логах через `Monitor`.

- [ ] **Step 2: Прогон smoke**

```bash
AUDIT_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/launch-smoke.spec.ts --project=desktop 2>&1 | tee docs/superpowers/reports/launch-audit-2026-06-01/raw/playwright-smoke-local.txt
```

Expected: те же сценарии, ловят отличия prod vs local (например, кэширование SSG vs SSR-on-demand).

- [ ] **Step 3: Остановить dev server**

```bash
# Используем shell tool kill background job или BashKill
```

---

## Phase 4 — Lighthouse runs

### Task 4.1: Lighthouse на 3 страницах × 2 viewports

- [ ] **Step 1: Home mobile**

```bash
npx lighthouse https://$PROD_URL/ \
  --preset=desktop \
  --output=json \
  --output-path=docs/superpowers/reports/launch-audit-2026-06-01/raw/lighthouse-home-desktop.json \
  --quiet --chrome-flags="--headless"
```

Expected: JSON saved, есть `categories.performance.score`. Записать score в memo.

- [ ] **Step 2: Home mobile**

```bash
npx lighthouse https://$PROD_URL/ \
  --output=json \
  --output-path=docs/superpowers/reports/launch-audit-2026-06-01/raw/lighthouse-home-mobile.json \
  --quiet --chrome-flags="--headless"
```

(default preset = mobile).

- [ ] **Step 3: Repeat для /shop и /shop/<sample-slug>**

Sample slug: получить через `npx supabase` или захардкодить из `CLAUDE.md` (например `futbolka-classic` если такой есть; иначе из миграции `20260527000004_import_catalog.sql` взять первый slug). Если такого нет — Read первой строки из миграции для нахождения существующего slug.

```bash
# Извлечь первый slug из миграции
FIRST_SLUG=$(grep -oP "'\K[a-z][a-z0-9-]+(?=')" supabase/migrations/20260527000004_import_catalog.sql | head -1)
echo "Using slug: $FIRST_SLUG"

for page in "/shop" "/shop/$FIRST_SLUG"; do
  safe_name=$(echo "$page" | tr '/' '_' | sed 's/^_//')
  for preset in "" "--preset=desktop"; do
    viewport=$([ -z "$preset" ] && echo "mobile" || echo "desktop")
    npx lighthouse "https://$PROD_URL$page" \
      $preset \
      --output=json \
      --output-path="docs/superpowers/reports/launch-audit-2026-06-01/raw/lighthouse-${safe_name}-${viewport}.json" \
      --quiet --chrome-flags="--headless"
  done
done
```

Expected: 6 JSON files в `raw/`.

---

## Phase 5 — axe-core scans

### Task 5.1: Создать axe-runner Playwright тест

**Files:**
- Create: `tests/e2e/axe-scan.spec.ts`

- [ ] **Step 1: Написать tests/e2e/axe-scan.spec.ts**

```ts
import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://pnhd-studio-clone.vercel.app'
const OUT = 'docs/superpowers/reports/launch-audit-2026-06-01/raw'

const PAGES: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'product', path: '/shop/__FIRST_SLUG__' },
  { name: 'cart', path: '/cart' },
  { name: 'blog', path: '/blog' },
]

for (const { name, path: pagePath } of PAGES) {
  test(`axe-${name}`, async ({ page }) => {
    await page.goto(BASE_URL + pagePath, { waitUntil: 'networkidle' })
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    fs.writeFileSync(path.join(OUT, `axe-${name}.json`), JSON.stringify(results, null, 2))
  })
}
```

Save to `/Users/margolinilya/studio/pnhd-studio/tests/e2e/axe-scan.spec.ts`. Перед запуском заменить `__FIRST_SLUG__` на актуальный slug (см. Task 4.1 Step 3).

- [ ] **Step 2: Прогнать axe-scan**

```bash
# sed заменим __FIRST_SLUG__ на актуальный
sed -i.bak "s/__FIRST_SLUG__/$FIRST_SLUG/g" tests/e2e/axe-scan.spec.ts && rm tests/e2e/axe-scan.spec.ts.bak

AUDIT_BASE_URL=https://$PROD_URL npx playwright test tests/e2e/axe-scan.spec.ts --project=desktop
```

Expected: 5 axe-*.json в `raw/`. Каждый содержит `violations` array.

---

## Phase 6 — Mobile screenshots

### Task 6.1: Скриншоты 7 ключевых экранов на iPhone 14 + Pixel 7

**Files:**
- Create: `tests/e2e/mobile-screenshots.spec.ts`

- [ ] **Step 1: Написать screenshots spec**

```ts
import { test } from '@playwright/test'

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://pnhd-studio-clone.vercel.app'
const FIRST_SLUG = process.env.AUDIT_FIRST_SLUG || 'futbolka-classic'

const SCREENS = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'product', path: `/shop/${FIRST_SLUG}` },
  { name: 'cart', path: '/cart' },
  { name: 'checkout', path: '/checkout' },
  { name: 'blog', path: '/blog' },
  { name: 'contacts', path: '/contacts' },
]

for (const { name, path: p } of SCREENS) {
  test(`screenshot-${name}`, async ({ page }, testInfo) => {
    await page.goto(BASE_URL + p, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const device = testInfo.project.name
    await page.screenshot({
      path: `docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots/${device}-${name}.png`,
      fullPage: true,
    })
  })
}
```

Save to `/Users/margolinilya/studio/pnhd-studio/tests/e2e/mobile-screenshots.spec.ts`.

- [ ] **Step 2: Run на iPhone 14 + Pixel 7**

```bash
AUDIT_BASE_URL=https://$PROD_URL AUDIT_FIRST_SLUG=$FIRST_SLUG \
  npx playwright test tests/e2e/mobile-screenshots.spec.ts --project=iphone14 --project=pixel7
```

Expected: 14 PNG (7 экранов × 2 девайса) в `raw/screenshots/`.

- [ ] **Step 3: Глазами просмотреть screenshots**

Read каждый PNG (Read tool читает images). Зафиксировать в [08-mobile-ux.md](../reports/launch-audit-2026-06-01/08-mobile-ux.md): «всё ОК», «footer обрезан», «touch targets < 44px», «текст наезжает», и т.д.

---

## Phase 7 — Sentry + Vercel logs

### Task 7.1: Verify Sentry получает события

- [ ] **Step 1: Проверить выставлен ли SENTRY_DSN на prod**

```
Tool: mcp__claude_ai_Vercel__get_project (smoke env vars)
```

Если DSN пустой — записать в [10-sentry-ops.md](../reports/launch-audit-2026-06-01/10-sentry-ops.md): «Sentry не активирован — это 🟡 для launch». Skip следующие шаги.

Если DSN выставлен — продолжить.

- [ ] **Step 2: Отправить test event через Playwright**

Quick way: Playwright навигирует на сайт, через `page.evaluate` дёргает `window.Sentry.captureMessage('[AUDIT] test event ' + Date.now())`. Записать timestamp.

```ts
// inline в Playwright или прямо REPL
await page.goto(BASE_URL + '/')
await page.waitForTimeout(2000)
const sent = await page.evaluate(() => {
  const w = window as any
  if (w.Sentry?.captureMessage) {
    w.Sentry.captureMessage('[AUDIT] launch-readiness test ' + new Date().toISOString())
    return true
  }
  return false
})
console.log('Sentry captureMessage available:', sent)
```

- [ ] **Step 3: Подтвердить в Sentry dashboard**

Это manual step — Sentry MCP не подключён. Записать в `10-sentry-ops.md`: «отправлено test event с message `[AUDIT] launch-readiness test <ts>` — проверить в Sentry dashboard issues. Если не появилось в течение 2 минут → 🟡».

---

### Task 7.2: Vercel logs spot-check за 7 дней

- [ ] **Step 1: Запросить runtime logs**

```
Tool: mcp__claude_ai_Vercel__get_runtime_logs
Args: { teamId, projectId, since: 7days-ago-iso }
```

- [ ] **Step 2: Скан на 5xx и панику**

Найти в логах:
- `5xx` responses
- `unhandled` / `error` / `panic` / `cannot read properties` / `is not a function`
- repeated errors (≥ 10 occurrences за 7д)

Записать топ-N паттернов в `10-sentry-ops.md`.

---

## Phase 8 — Dispatch tooling-dependent subagents

К этой фазе у нас есть:
- 6 Lighthouse JSON в `raw/`
- 5 axe JSON в `raw/`

Теперь дёрнем 2 subagent'ов которые интерпретируют эти артефакты:

### Task 8.1: Дёрнуть perf + a11y subagent'ов в одном сообщении (foreground)

Их queries короткие — можно foreground, не block'нет надолго.

- [ ] **Step 1: 2 параллельных Agent calls**

**Agent #5: performance-engineer**
```
subagent_type: performance-engineer
description: Performance audit
prompt:
  Launch-readiness performance audit для production Next.js 14 проекта pnhd-studio-clone.

  Артефакты (уже сгенерированы):
  - /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/raw/lighthouse-*.json (6 files: home/shop/product × mobile/desktop)

  Контекст:
  - /Users/margolinilya/studio/pnhd-studio/CLAUDE.md (особенно §2 stack, §10 critical files)
  - /Users/margolinilya/studio/pnhd-studio/docs/superpowers/specs/2026-06-01-launch-readiness-audit.md раздел "2. Performance audit"
  - /Users/margolinilya/studio/pnhd-studio/next.config.mjs
  - /Users/margolinilya/studio/pnhd-studio/package.json

  Задача:
  1. Прочитать все 6 lighthouse JSON, извлечь скоры (performance, accessibility, best-practices, SEO) и Core Web Vitals (LCP, FCP, CLS, INP, TBT). Сделать сводную таблицу.
  2. Прочитать code: Three.js dynamic-import (src/components/shared-components/3d-tee/) — действительно ли отложен.
  3. Проверить MUI tree-shaking patterns (grep по src/ на `import { ... } from '@mui/material'`).
  4. Запустить `cd /Users/margolinilya/studio/pnhd-studio && ANALYZE=true npm run build 2>&1 | tail -100` если возможно (или просто `npm run build` и посмотреть на bundle sizes из output).
  5. Найти dead imports (после удаления конструктора могли остаться).

  Output: /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/02-performance-findings.md
  Структура — BLOCKERS / WARNINGS / NICE-TO-HAVE / Verification log + сводная таблица Lighthouse скоров наверху.
```

**Agent #6: accessibility-compliance-accessibility-audit**
```
subagent_type: accessibility-compliance-accessibility-audit
description: Accessibility audit
prompt:
  Launch-readiness a11y audit для RU-only e-commerce (WCAG 2.1 AA target).

  Артефакты:
  - /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/raw/axe-*.json (5 files: home, shop, product, cart, blog)
  - /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots/ (14 mobile screenshots)

  Контекст:
  - /Users/margolinilya/studio/pnhd-studio/CLAUDE.md (§10 critical files, особенно ProductInfo пакет — size-grid, print-selector, upload-slot)
  - /Users/margolinilya/studio/pnhd-studio/docs/superpowers/specs/2026-06-01-launch-readiness-audit.md раздел "3. Accessibility audit"

  Задача:
  1. Прочитать все 5 axe JSON. Сгруппировать violations по impact (critical/serious/moderate/minor) и по нарушенному правилу (rule).
  2. Прочитать ProductInfo и size-grid/print-selector/upload-slot код. Проверить keyboard navigation, ARIA roles, focus management.
  3. Прочитать LeadForm + NoModelBlockForm на form labels + ARIA + error feedback.
  4. Проверить MUI Dialog usage — focus trap, Esc.
  5. Mobile screenshots — touch targets ≥ 44px? Контрастность? Текст не отрезан?

  Output: /Users/margolinilya/studio/pnhd-studio/docs/superpowers/reports/launch-audit-2026-06-01/03-a11y-findings.md
  Структура — BLOCKERS / WARNINGS / NICE-TO-HAVE / Verification log + сводная таблица violations counts per rule.
```

- [ ] **Step 2: Дождаться оба результата**

Поскольку foreground — они вернутся последовательно или в одном response. Получить пути к report'ам и продолжить.

---

## Phase 9 — CMS / Payload sanity (мой ручной шаг)

### Task 9.1: Manual Payload admin sanity через MCP + чтение кода

Не у нас Playwright против admin (нужны credentials) — делаем через прочитать БД + проверить что Payload-миграции применены.

- [ ] **Step 1: Verify Payload migrations applied на prod**

```
Tool: mcp__claude_ai_Supabase__execute_sql
Args:
  project_id: almfjmiygtnzngkayhdv
  query: select name, batch, run_on from payload.migrations order by run_on desc limit 30
```

Expected: видим список миграций включая form-builder батч.

- [ ] **Step 2: Verify seeded forms существуют**

```
Tool: mcp__claude_ai_Supabase__execute_sql
Args:
  project_id: almfjmiygtnzngkayhdv
  query: select id, title, created_at from payload.forms order by id
```

Expected: 5 строк (footer-lead, popup-lead, shop-no-model, product-page, methods-consultation). Если меньше — записать как 🟡.

- [ ] **Step 3: Verify form-submissions table working**

```
Tool: mcp__claude_ai_Supabase__execute_sql
Args:
  project_id: almfjmiygtnzngkayhdv
  query: |
    select count(*) as total,
           count(*) filter (where created_at > now() - interval '24 hours') as last_24h,
           count(*) filter (where ip_hash is null) as no_ip_hash
    from payload."form_submissions"
```

Expected: total > 0 (после smoke), last_24h ≥ 1 (наши test submission'ы из Phase 3), no_ip_hash = 0 (rate-limit hook должен инжектить).

- [ ] **Step 4: Записать в 09-cms-payload-sanity.md**

Содержимое: migrations status, forms count, submission counts, проблемы (если есть).

---

## Phase 10 — Wait & aggregate

### Task 10.1: Дождаться 4 background subagent'ов из Phase 1

К этому моменту они скорее всего уже завершились. Если нет — `Monitor` или просто ждём notification.

- [ ] **Step 1: Verify все 4 report-файла существуют**

```bash
ls -la docs/superpowers/reports/launch-audit-2026-06-01/0[1456]-*.md
```

Expected: 4 файла (01-security, 04-seo, 05-code-review, 06-db-rls). Плюс уже есть 02-performance и 03-a11y из Phase 8 и 07/08/09/10 из моих шагов.

---

### Task 10.2: Написать функциональный smoke report

**Files:**
- Create: `docs/superpowers/reports/launch-audit-2026-06-01/07-functional-smoke.md`

- [ ] **Step 1: Из Playwright output'а сделать summary**

Структура:
```markdown
# Functional Smoke Findings

## Prod runs
- Test | Status | Notes
- home renders | ✅ | ...
- shop list | ✅ | 25 cards
- product page | ⚠️ | "size grid не виден до scroll"
- footer lead form | ✅ | submission OK, response 200
- ...

## Local runs
- ...

## 🔴 BLOCKERS
- ...

## 🟡 WARNINGS
- ...

## 🟢 NICE-TO-HAVE
- ...
```

Извлечь pass/fail из `raw/playwright-smoke-prod.txt` и `raw/playwright-smoke-local.txt`. Скриншоты failing case'ов уже в `raw/playwright-prod-results/`.

---

### Task 10.3: Написать mobile UX report

**Files:**
- Create: `docs/superpowers/reports/launch-audit-2026-06-01/08-mobile-ux.md`

- [ ] **Step 1: Прочитать 14 screenshots и записать findings**

Use Read tool on each PNG. Для каждого экрана:
- touch targets ≥ 44px?
- footer не отрезан?
- текст читается?
- CTA визуально доступна?

Структура та же — BLOCKERS / WARNINGS / NICE-TO-HAVE.

---

### Task 10.4: Финальная агрегация в README.md

**Files:**
- Modify: `docs/superpowers/reports/launch-audit-2026-06-01/README.md` (overwrite)

- [ ] **Step 1: Прочитать все 10 sub-report файлов**

```bash
ls docs/superpowers/reports/launch-audit-2026-06-01/*.md
```

- [ ] **Step 2: Агрегировать в единый отчёт**

Format:
```markdown
# Launch Readiness Report — pnhd-studio-clone

**Date:** 2026-06-01
**Production URL:** https://<PROD_URL>
**Auditor:** Claude Opus 4.7 + 6 specialized subagents

## Verdict: 🔴 NO-GO  |  🟡 GO-WITH-CAVEATS  |  🟢 GO

(выбрать на основе суммы blockers)

## TL;DR
- N 🔴 blockers (must fix before launch)
- N 🟡 warnings (fix in first post-launch week)
- N 🟢 nice-to-have (backlog)

## 🔴 BLOCKERS (n)

### B1. <title> — Severity: 🔴 — Domain: Security
**Location:** `src/foo.ts:42`
**Issue:** ...
**Fix:** ...
**Verification:** ...

### B2. ...

## 🟡 WARNINGS (n)
(аналогично, чуть короче)

## 🟢 NICE-TO-HAVE (n)
(коротко, bullets)

## Verification log
| Domain | Status | Coverage |
|---|---|---|
| Security | ✅ Done | RLS + secrets + XSS + CORS + rate-limit + CSP + auth |
| Performance | ✅ Done | 6 Lighthouse runs + bundle analysis |
| Accessibility | ✅ Done | 5 axe scans + manual keyboard nav |
| SEO | ✅ Done | meta + JSON-LD + sitemap + canonical |
| Code review | ✅ Done | lead pipeline + cart + admin + edge cases |
| DB / RLS | ✅ Done | pg_policies + pg_tables + cron + indexes |
| Functional smoke | ✅ Done | Playwright prod + local |
| Mobile UX | ✅ Done | 14 screenshots iPhone 14 + Pixel 7 |
| CMS readiness | ✅ Done | Payload migrations + forms + submissions |
| Sentry / Ops | ⚠️ Partial | DSN not set / dashboard requires manual check |

## Appendices
- Per-domain findings: see `01-*` through `10-*.md`
- Raw artifacts (Lighthouse / axe / Playwright outputs / screenshots): `raw/`

## Suggested fix order (если есть blockers)
1. ...
2. ...

## Re-audit cadence
Recommended: re-run этот audit перед каждым major release (новая feature / схема change). Spec/plan reusable.
```

- [ ] **Step 3: Save**

Overwrite `docs/superpowers/reports/launch-audit-2026-06-01/README.md`.

---

### Task 10.5: Commit артефакты

- [ ] **Step 1: Что коммитим**

Коммитим:
- `docs/superpowers/specs/2026-06-01-launch-readiness-audit.md` (spec — уже есть)
- `docs/superpowers/plans/2026-06-01-launch-audit-execution.md` (этот plan)
- `docs/superpowers/reports/launch-audit-2026-06-01/*.md` (10 sub-reports + README)
- `tests/e2e/launch-smoke.spec.ts`
- `tests/e2e/axe-scan.spec.ts`
- `tests/e2e/mobile-screenshots.spec.ts`
- `playwright.config.ts`
- `package.json` + `package-lock.json` (новые devDeps)

НЕ коммитим:
- `docs/superpowers/reports/launch-audit-2026-06-01/raw/` (lighthouse JSON / axe JSON / screenshots / playwright trace) — большие файлы, добавить в `.gitignore`

- [ ] **Step 2: Добавить raw/ в .gitignore**

Append to `/Users/margolinilya/studio/pnhd-studio/.gitignore`:
```
# Launch audit raw artifacts
docs/superpowers/reports/launch-audit-*/raw/
test-results/
playwright-report/
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-01-launch-readiness-audit.md \
        docs/superpowers/plans/2026-06-01-launch-audit-execution.md \
        docs/superpowers/reports/launch-audit-2026-06-01/ \
        tests/e2e/ \
        playwright.config.ts \
        package.json package-lock.json \
        .gitignore

git commit -m "$(cat <<'EOF'
audit(launch): launch-readiness audit 2026-06-01

Spec + plan + final report. Playwright/Lighthouse/axe tooling preserved
for re-run before future releases. Raw artifacts (JSON dumps + screenshots)
gitignored to avoid bloating the repo.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Don't push** without user OK.

---

## Phase 11 — Handoff

### Task 11.1: Present финальный отчёт пользователю

- [ ] **Step 1: Краткое summary в чат**

Format:
```
Audit done. Verdict: <🔴/🟡/🟢>

🔴 Blockers (N):
- ...

🟡 Warnings (N):
- ...

🟢 Nice-to-have (N): см. отчёт

Full report: docs/superpowers/reports/launch-audit-2026-06-01/README.md
Per-domain findings: 01-*..10-*.md в той же папке

Что дальше:
- Если blockers: я могу пофиксить по очереди
- Если warnings — обсудить приоритет
- Re-run этого audit'а перед каждым major release: AUDIT_BASE_URL=... npx playwright test tests/e2e/launch-smoke.spec.ts
```

---

## Self-review checklist (для меня перед execution)

**Spec coverage:**
- ✅ Security → Task 1.1 Agent #1 + Phase 0/2 preflight
- ✅ Performance → Task 1.1 Agent? (none in Phase 1) — moved to Phase 8 Agent #5 + Phase 4 Lighthouse
- ✅ Accessibility → Phase 5 axe + Phase 8 Agent #6
- ✅ SEO → Task 1.1 Agent #2
- ✅ Code review → Task 1.1 Agent #3
- ✅ DB / RLS → Task 1.1 Agent #4
- ✅ Functional smoke → Phase 3 Playwright
- ✅ Mobile UX → Phase 6 + Phase 10.3
- ✅ CMS readiness → Phase 9
- ✅ Sentry / Ops → Phase 7

**Placeholder scan:**
- All Agent prompts contain actual content, file paths, expected output format
- All shell commands are runnable as-is
- `__FIRST_SLUG__` placeholder в axe-scan.spec.ts замещается sed-командой явно

**Type consistency:**
- `PROD_URL` env используется единообразно
- `BASE_URL` константа в Playwright specs идентична
- Output paths согласованы (`raw/<artifact>.json`)

**Ambiguity:**
- BITRIX_WEBHOOK_URL — есть явная развилка (Task 0.2 Step 2)
- Sentry test — есть развилка по DSN presence (Task 7.1 Step 1)
- First slug — resolved через grep в миграции (Task 4.1 Step 3)

Plan ready.
