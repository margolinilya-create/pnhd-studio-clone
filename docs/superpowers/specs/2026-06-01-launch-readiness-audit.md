# Launch Readiness Audit — pnhd-studio-clone

**Дата:** 2026-06-01
**Цель:** дать go/no-go ответ по публичному запуску проекта. Найти всё что блокирует launch (🔴), что повышает риск но не блокирует (🟡), и что можно отложить (🟢).
**Не цель:** строить test-инфраструктуру на годы вперёд (Playwright suite, RLS-policy-tests как код, Lighthouse-в-CI и т.п.). Это next-step после launch.

---

## Scope

### Что аудитим

| # | Домен | Кто аудитит | Артефакт |
|---|---|---|---|
| 1 | **Security** | `security-auditor` subagent | findings list + severity |
| 2 | **Performance** | `performance-engineer` subagent + я (Lighthouse run) | Lighthouse JSON + findings |
| 3 | **Accessibility** | `accessibility-compliance-accessibility-audit` subagent + я (axe scan) | axe report + findings |
| 4 | **SEO** | `seo-audit` subagent | meta/JSON-LD/sitemap report |
| 5 | **Code-level bugs** | `code-reviewer` subagent | review findings |
| 6 | **DB / migrations / RLS** | `database-admin` subagent | findings list |
| 7 | **Functional smoke** | я (Playwright локально + проверка prod) | passing flows + issues |
| 8 | **Mobile UX** | я (Playwright device emulation + screenshots) | screenshots + findings |
| 9 | **CMS readiness** | я (вручную через Payload admin + sanity prod-data) | go/no-go list |
| 10 | **Sentry / Operational** | я (test event + log spot-check) | confirmation report |

### Что НЕ аудитим (out of scope)

- **CDEK + платёжный шлюз** — известно что в TODO (см. `CLAUDE.md §11`). Проверим только что чекаут НЕ создаёт впечатление работающего у пользователя (либо disclaimer, либо disabled CTA, либо «связаться с менеджером»). Если чекаут реально берёт деньги — это автоматически 🔴.
- **Bitrix24 интеграция end-to-end** — `BITRIX_WEBHOOK_URL` пока не выставлен. Проверяем только что код корректно no-op'ит без URL и что есть план куда воткнуть webhook при появлении.
- **Замена tracking ID** (Roistat / Metrica / uiscom) — это решение бизнеса, не блокер. Просто отметим в отчёте.
- **3D Tee внешний вид / точность модели** — субъективно, не блокер.
- **Контент / тексты на сайте** — это юр./маркетинг задача, не моя.

---

## Severity criteria

| Уровень | Когда | Примеры | Действие |
|---|---|---|---|
| 🔴 **BLOCKER** | Открывает фронту/деньгам/данным юзера риск или ломает основной flow | Open-redirect в /admin/login, anon-write на критичную таблицу, XSS в blog WYSIWYG, корзина теряет данные, /checkout берёт деньги без реальной оплаты, secrets в client bundle, RLS bypass | Фиксим до launch. Без этого — не пускаем |
| 🟡 **WARNING** | Деградирует UX или security defence-in-depth, но не критично для дня запуска | Lighthouse mobile < 50, отсутствие sitemap.xml, missing alt-тегов, мобильный чекаут неудобен, частичный a11y fail, нет error-boundary на каком-то экране | Фиксим в первую неделю после launch. Если можем закрыть быстро — закроем сразу |
| 🟢 **NICE-TO-HAVE** | Tech debt, refactoring, тесты, оптимизации | E2E suite, integration tests, bundle-size budget в CI, design system миграция, удаление мёртвого RTK Query baseUrl | Backlog, потом |

---

## Что каждый subagent ищет (детально)

### 1. Security audit — `security-auditor`

**Brief:** проект — Next.js 14 + Supabase (Postgres + RLS + Storage + Edge Functions) + Payload CMS на той же Postgres. Production уже на Vercel. Сейчас проводим launch-readiness audit. Прочитай `CLAUDE.md` чтобы понять архитектуру (особенно §6, §7, §10, §15).

Найди:

1. **RLS coverage:**
   - Каждая таблица в `public.*` имеет RLS включённый? Запусти `select * from pg_tables where schemaname = 'public'` и `select * from pg_policies where schemaname = 'public'` через Supabase MCP (`execute_sql`).
   - Каждая таблица в `payload.*` (схема Payload) имеет RLS? Payload работает через service_role, но если схема `payload` доступна anon-роли с RLS off — проблема.
   - `leads` таблица — direct anon-insert удалён (миграция 5), теперь пишет только service_role через `form-submissions`. Проверь что прямого insert нет.
   - `admin_users` — должна быть полностью закрыта anon (только service_role read через `is_admin()`).
   - Storage policies на `user-uploads`: path-prefix `prints/` + MIME whitelist + size limit. Проверь через `storage.policies`.
2. **Secrets exposure:**
   - Grep по всему репо: `service_role`, `service-role`, `SUPABASE_SERVICE_ROLE_KEY`, `BITRIX_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `CLEANUP_SECRET`, `PAYLOAD_SECRET`. Они должны фигурировать ТОЛЬКО в server-only файлах (`src/lib/supabase/admin-server.ts` помечен `'server-only'`, hooks, edge functions, Payload config).
   - Любой client-side файл (`'use client'` или imported by one) НЕ должен импортить `admin-server.ts`. Если импортит — это 🔴.
   - Проверь что нет `.env*` файлов в git history.
   - `next.config.mjs` — нет ли там env переменных пропущенных через `publicRuntimeConfig`/`env` поля без `NEXT_PUBLIC_` префикса.
3. **XSS:**
   - `dangerouslySetInnerHTML` — 6 мест по `CLAUDE.md §11`. Проверь каждое: блог (DOMPurify whitelist) точно sanitized; methods/textile/prints — это static TS-data, но если поле из БД — это 🔴.
   - Blog WYSIWYG sanitize whitelist — есть ли в нём `onerror`/`onload`/`javascript:`? Текущий whitelist в `savePost` Server Action (см. `CLAUDE.md §15`). Проверь актуальный код.
4. **Open-redirect:**
   - `/admin/login` использует `safeNextPath` — проверь логику в `src/app/(authed)/admin/login/`. Что считается «safe»? Принимает ли `//evil.com` или `https://evil.com`?
5. **CORS:**
   - Edge Function `cleanup-user-uploads` — secret-header auth, проверь.
   - Payload `/api/form-submissions` — открыт ли наружу? Должен принимать только same-origin или CSRF-защищён.
6. **Rate-limit:**
   - `rateLimitFormSubmissions` hook: 3/мин по IP-hash. Проверь что IP корректно берётся из заголовков на Vercel (`x-forwarded-for` или `x-real-ip`). На Vercel Edge runtime — какой источник? Если bypass через подменённый header — 🔴.
7. **Input validation:**
   - Payload form-builder — какая валидация полей submission? Если default Payload (без custom validator) пропустит, скажем, email c control-chars — это пища для downstream (Bitrix / Telegram).
   - `notifyBitrix` и `notifyTelegram` — экранируют ли пользовательский ввод перед отправкой? Telegram HTML-mode + `<` в имени → broken message или injection.
8. **CSP / HTTP headers:**
   - `next.config.mjs` уже определяет CSP. Проверь полноту: `script-src`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`. HSTS / Permissions-Policy / X-Content-Type-Options есть?
9. **Auth:**
   - `requireAdmin()` — где вызывается? Каждый admin Server Action и admin route должен вызывать. Найди admin endpoint без `requireAdmin()` — это 🔴.

Возвращай findings в формате: severity / location (file:line) / описание / suggested fix / verification step.

### 2. Performance audit — `performance-engineer`

**Brief:** проект Next.js 14 App Router + MUI v7 + Three.js (dynamically loaded). 25 товаров, public-read-only storefront SSR/SSG. Production Lighthouse оценки неизвестны. Найди:

1. **Bundle size:**
   - Запусти `npm run build` и проанализируй `.next/analyze` (если bundle-analyzer не подключён — установить временно через `@next/bundle-analyzer`).
   - Three.js + @react-three/fiber + @react-three/drei — реально ли динамически загружены (см. `CLAUDE.md §10`: `<Tee>` через `next/dynamic({ssr:false})`)? Если попали в main bundle — 🟡.
   - MUI v7 — tree-shaking работает? Импорты вида `import { Button } from '@mui/material'` ОК (Next.js 14 + MUI v5+ автоматически tree-shake'ит), но `import Button from '@mui/material/Button'` ещё надёжнее. Если есть импорты целого `@mui/material` объекта — 🟡.
   - Redux Toolkit, RTK Query — проверь что неиспользуемые reducers/endpoints не тянутся (после удаления конструктора могут остаться dead-imports).
2. **Image optimization:**
   - 25 импортированных товаров: 15 ссылаются на мёртвый `cdn.pnhd.ru`. Это auto-fail у Next/Image (404). Найди — где fallback, кричит ли в консоль.
   - Все `<img>` (raw HTML) vs `next/image` — `@next/next/no-img-element` отключён, проверь насколько часто используется raw. На LCP-изображениях должно быть `next/image` с `priority`.
   - WebP/AVIF в `next.config.mjs` `images.formats`?
3. **Core Web Vitals:**
   - Запусти Lighthouse через `npx unlighthouse` или `npx lighthouse https://<prod-url>/ --output=json --output-path=/tmp/lh-home.json` для главной + /shop + /shop/[slug]. Mobile + desktop. Цель: LCP < 2.5s, CLS < 0.1, INP < 200ms.
4. **Fonts:**
   - Какие шрифты, как грузятся? `next/font` или `<link>`? FOUT/FOIT?
5. **SSR vs CSR:**
   - `/cart` и `/checkout` — CSR (per `CLAUDE.md §3`). Это ОК для shop-функционала, но проверь что они не рендерятся пустыми на первой загрузке (FCP fail).
6. **Caching:**
   - Static assets cache-control headers на Vercel default? Должно быть immutable. SSG страницы — какой ISR?
7. **Three.js mount path:**
   - 3D Tee на главной — реально ли отложен (не блокирует FCP)? Поставь breakpoint / Network throttling — Tee load JS chunk должен начинаться ПОСЛЕ FCP, не до.

Возврат: Lighthouse скоры по 3 ключевым страницам + findings + bundle composition.

### 3. Accessibility audit — `accessibility-compliance-accessibility-audit`

**Brief:** RU-only e-commerce. Wcag 2.1 AA — наш целевой уровень. Найди:

1. **axe scan:**
   - Запусти `@axe-core/cli` или `@axe-core/playwright` против 5 страниц: `/`, `/shop`, `/shop/futbolka-classic`, `/cart`, `/blog/<post>`.
   - Все violations с impact `serious` или `critical` → 🔴/🟡 (зависит от того, блокирует ли).
2. **Keyboard nav:**
   - Tab order на главной, /shop, /shop/[slug] (новая ProductInfo панель — size grid + print selector + upload).
   - Focus visible? MUI v7 default outline должен быть, проверь не overridden ли.
   - Можно ли использовать /cart без мыши?
3. **Form labels:**
   - Footer lead-form, popup, NoModelBlock — каждый input имеет `<label>` или `aria-label`?
   - Phone input (mui-tel-input) — accessible?
   - Drop-zone в ProductInfo — `role`, `aria-label`, инструкция для screen reader?
4. **ARIA roles:**
   - `size-grid.tsx` — это grid из buttons или real `<select>`? Если custom — корректные `role="radiogroup"` / `role="radio"`?
5. **Alt text:**
   - Все 25 товаров имеют alt? Импортированные могли потерять.
   - Hero image на главной?
   - Иконки — decorative (`alt=""`) или meaningful?
6. **Color contrast:**
   - Цветовая палитра проверь через axe. Особенно — light gray текст на белом fonund везде.
7. **Modal/Dialog focus trap:**
   - MUI Dialog для popup-lead-form, alt-dialog в admin gallery — focus trap работает? `Esc` закрывает?
8. **Skip-link:**
   - Есть ли `skip to main content` linked?
9. **Form errors:**
   - Когда rate-limit срабатывает (429), как пользователь узнаёт? Visual + aria-live?

Возврат: axe JSON + manual findings.

### 4. SEO audit — `seo-audit`

**Brief:** RU-only, цель — выйти в search до запуска. Сайт пока без sitemap (быстрая проверка: `src/app/sitemap.ts` / `public/sitemap.xml` отсутствуют — это известный пробел). Найди:

1. **Meta tags:**
   - Каждая страница имеет `<title>` и `<meta description>`? Используется ли `generateMetadata` в RSC?
   - Open Graph (og:title, og:description, og:image, og:type) на товарных, блог, главной?
   - Twitter cards (twitter:card)?
2. **Canonical URLs:**
   - `<link rel="canonical">` на всех страницах? Особенно на `/shop` (нет фильтра-параметров пока, но pre-emptive).
   - 6 категорийных страниц (`/futbolki`, `/hudi`, ...) — у них canonical что? Если они дублируют `/shop` с фильтром — это duplicate content.
3. **Structured data (JSON-LD):**
   - На главной — Organization, WebSite.
   - На `/shop/[slug]` — Product (price, availability, image, brand).
   - На `/blog/[post]` — BlogPosting / Article.
   - На контактах — LocalBusiness.
   - `src/app/layout.tsx` уже что-то рендерит (статика + jsonLd согласно `CLAUDE.md §3`) — проверь полноту.
4. **Sitemap:**
   - `app/sitemap.ts` отсутствует. Создать TODO.
5. **robots.txt:**
   - `public/robots.txt` отсутствует. Дефолт Next.js — Disallow ничего, но без явного robots поисковики могут индексировать `/admin/*`. Создать `app/robots.ts` или `public/robots.txt` с `Disallow: /admin`.
6. **hreflang:**
   - RU only, не нужно (но `<html lang="ru">` уже стоит — это правильно).
7. **HTTPS / redirects:**
   - `pnhd-studio-clone.vercel.app` отдаёт https? www → bare или наоборот?
8. **404 / 500 pages:**
   - Кастомные `not-found.tsx` / `error.tsx` есть? Они noindex?
9. **Performance / Core Web Vitals** — пересекается с performance audit, не дублируй.

Возврат: чек-лист + конкретные missing teg'и + предложения для sitemap/robots.

### 5. Code-level bugs review — `code-reviewer`

**Brief:** мы ищем actual bugs (не stylistic / refactoring). Сфокусируйся на 4 областях с самым большим бизнес-импактом:

1. **Lead pipeline (новое, после миграции на Payload form-builder):**
   - `src/hooks/rateLimitFormSubmissions.ts` — race-condition на одновременных submission'ах? Использует ли transactional check?
   - `src/hooks/notifyBitrix.ts` — что если Bitrix вернёт 200 + envelope ошибки (`{error, error_description}`)? `CLAUDE.md §10` говорит что обработано — проверь.
   - `src/hooks/notifyTelegram.ts` — fire-and-forget, но если зависнет — не блокирует ли ответ юзеру?
   - `src/lib/forms/get-form-by-slug.ts` — module-level cache не инвалидируется при изменении формы в admin. Если редактор поменял form — старый ID. Acceptable?
   - `src/lib/forms/submit-form.ts` — 429 retry strategy, какая UX?
2. **Cart (Redux + listener middleware):**
   - `src/redux/middleware/cart-persist.ts` — race-condition между `restoreCart` и `markHydrated`?
   - `src/redux/middleware/cart-orphan-cleanup.ts` — если diff массивов даёт false-positive (юзер просто переименовал), удалит ли нужные файлы?
   - `src/lib/cart/validate-stored-cart.ts` — есть тест, проверь corner cases (битый JSON, partial object).
3. **Admin Server Actions:**
   - `syncChildren` / `syncLinks` — atomicity. Если crash посередине — половина sizes сохранена, половина нет?
   - Upload в Storage — orphan если save в БД упал после upload?
   - DOMPurify санитизация — точно ли применяется (см. security audit).
4. **Edge cases:**
   - Mobile-меню state при route change.
   - `/checkout` сейчас demo-alert. Точно ли disabled / disclaimer / нет ли пути к реальному `createOrder` через RTK Query.
   - `printConfig.location` enum coercion — что если sessionStorage содержит legacy invalid value?

Возврат: список багов с severity + repro + fix sketch.

### 6. DB / migrations / RLS audit — `database-admin`

**Brief:** Supabase Postgres, 10 миграций в `supabase/migrations/`, плюс Payload-миграции в `src/migrations/` (отдельная схема `payload`). Через Supabase MCP:

1. **RLS coverage:**
   - Все таблицы в `public` имеют RLS? `select tablename from pg_tables where schemaname = 'public' and rowsecurity = false` — должно быть пусто.
   - Что в схеме `payload`? Если RLS off — анализируй как Payload получает доступ (service_role bypass), но если anon role имеет SELECT — это leak.
2. **Policies sanity:**
   - `select * from pg_policies where schemaname in ('public', 'storage')` — выведи все, читай каждую: что роль может, что не может.
   - `leads`: anon insert удалён в миграции 5 — verify.
   - `admin_users`: anon должен НЕ читать.
3. **Indexes:**
   - На `products.slug` (для `/shop/[slug]` SSG generateStaticParams) — есть?
   - На `leads.created_at`, `leads.ip_hash` — есть (per CLAUDE.md), verify.
   - `form-submissions` — что в качестве индексов? Если по `createdAt` нет — slow list.
4. **Constraints:**
   - `products.price` — NOT NULL? `>= 0`?
   - `product_sizes.qty` — NOT NULL? `>= 0`?
   - `leads.email` / `phone` — есть ли check на формат на уровне БД (не только в hook)?
5. **Migrations idempotency:**
   - Каждая SQL миграция начинается с `create table if not exists` / `alter table ... if not exists` / `create policy if not exists`? Или просто `create policy`? Если последнее — re-run fails. Не блокер для launch (один раз накатили), но 🟢.
6. **Cron jobs:**
   - `pg_cron` — две задачи (retention лидов 90д, cleanup-user-uploads). `select * from cron.job` + последние runs `select * from cron.job_run_details order by start_time desc limit 20`. Они реально запускаются?
7. **Backups:**
   - Supabase auto-backup на текущем плане (free vs pro)? Если free — auto-backup ограничен. План должен быть pro.
8. **Connection pool:**
   - `DATABASE_URI` использует transaction pooler (порт 6543)? Для Payload это критично, на 5432 (session pool) Payload может зависнуть.

Возврат: SQL output snapshot + findings.

---

## Что делаю я лично (не subagent)

### 7. Functional smoke (Playwright)

**Сетап:**
```bash
npm i -D @playwright/test
npx playwright install --with-deps chromium
```

Создаю `tests/e2e/launch-smoke.spec.ts` со следующими сценариями (НЕ committed в репо — это разовый launch-audit tool, можем committ'ить если решим оставить):

1. Главная — отрисовалась, no console errors
2. `/shop` — отрисовалось 25 товаров (или сколько есть), клик на товар ведёт на /shop/[slug]
3. `/shop/[slug]` — выбор размера → выбор расположения принта → drag-drop PNG → «В корзину» → корзина содержит item
4. Footer lead-form — заполнить + submit → 200 OK от `/api/form-submissions` → success-state
5. Popup lead-form — открыть, заполнить, submit
6. NoModelBlock форма на `/shop`
7. /cart — hard refresh → корзина восстановилась (hydration test)
8. /checkout — что именно происходит при submit (verify disclaimer / disabled)
9. /admin/login — GET (просто 200, не пытаемся залогиниться без credentials)
10. /blog → /blog/[post]
11. /contacts, /oferta, /privacy — что-то рендерится

Все прогоны: 1× production URL (`pnhd-studio-clone-margolinilya-creates-projects.vercel.app`), 1× localhost после `npm run dev`.

### 8. Mobile UX

Те же сценарии 1-7 через Playwright device emulation: iPhone 14, Pixel 7. Screenshots в `/tmp/launch-audit-screenshots/`. Глазами проверяю:
- Меню работает на тач?
- Drop-zone usable на тач? (`upload-slot` должен иметь file-input fallback на мобиле)
- Корзина → checkout flow читается?
- Footer не отрезает CTA?

### 9. CMS readiness (Payload + admin/)

Manually через Payload admin (`/admin` Payload, не legacy `/admin/products`):
- Логин — работает?
- Products collection — список открывается, create → новый продукт виден на /shop после ISR (или `revalidatePath`)
- Form-submissions — заходим, видим существующие записи (если есть после теста formy)
- Forms collection — 5 seeded форм существуют
- Redirects — добавить тестовый 308 → проверить middleware подхватывает

Plus production sanity:
- Все Payload-миграции applied на prod БД (через Supabase MCP: `select * from payload.migrations order by created_at desc`).
- `cron.job` running.

### 10. Sentry / Operational

- Запустить test event из browser dev console: `Sentry.captureMessage('launch-audit test')` (или throw test error). Проверить что событие пришло в Sentry dashboard.
- То же серверно — temporary endpoint или ручной throw в Server Action.
- Если DSN не выставлен — это ✅ корректно no-op'ит (per `CLAUDE.md §13`), отметить в отчёте.
- Проверить Vercel logs за последние 7 дней: нет ли 500 на критичных эндпоинтах.
- Bitrix24 / Telegram — env vars выставлены? Если да, успешный submission → запись `bitrixLeadId` присутствует?

---

## Финальный артефакт

`docs/superpowers/reports/2026-06-01-launch-readiness-report.md` — формат:

```markdown
# Launch Readiness Report

## Verdict: 🔴 NO-GO  |  🟡 GO-WITH-CAVEATS  |  🟢 GO

## 🔴 BLOCKERS (n)
- [DOMAIN] description — location — fix sketch — owner

## 🟡 WARNINGS (n)
- ...

## 🟢 NICE-TO-HAVE (n)
- ...

## Verification log
- ✅ что проверено
- ⚠️  что проверено частично
- ❌ что НЕ проверено (с reason)

## Appendices
- Lighthouse JSON dumps
- axe reports
- Playwright run output
- SQL query results
```

---

## Out of scope для этого audit'а

- Replace tracking IDs (Roistat / Metrica / uiscom) на новые — это бизнес-решение
- Решение про CDEK + payment integration — это отдельный проект на месяц
- Visual design review — фронт уже принят
- Migration на новый design system / refactoring MUI v7 → headless — это другой трек
- Полная test coverage до 80% — это next-step после launch
- Pen-test со стороны третьей фирмы — это compliance задача, на post-launch

---

## Risks during audit

- **Production load:** Lighthouse/Playwright прогоны генерят real traffic на prod. Объём ничтожный (десятки запросов), но в Vercel analytics будет видно.
- **Form submissions during smoke:** Playwright submit'ы создадут real records в `form-submissions`. Помечаю их тестовыми (`name: '[AUDIT] ...'`) чтобы было видно для cleanup. Если Bitrix webhook URL выставлен — тестовый submit улетит туда. **Перед audit'ом проверяю что `BITRIX_WEBHOOK_URL` пустой на prod**, иначе временно отключаю.
- **Admin actions:** ничего не меняю в БД через Payload admin кроме test-record'ов которые помечаются.
- **Sentry test event:** одно дополнительное событие в Sentry quota.

---

## Timeline

- **T+0:** утвердили этот спек
- **T+5min:** запускаю 6 subagent'ов параллельно (background)
- **T+5min – T+30min:** параллельно ставлю Playwright + axe + lighthouse, гоняю smoke
- **T+30min – T+1h:** собираю subagent results, manual smoke flow, mobile screenshots
- **T+1h – T+1.5h:** агрегирую в Launch Readiness Report, severity-классификация
- **T+1.5h:** отдаю отчёт. Ты дальше решаешь — фиксим blocker'ы → re-audit, или launch с warnings.
