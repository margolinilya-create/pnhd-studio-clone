# Payload CMS 3 — Implementation Plan для pnhd-studio

## Context

**Зачем**: текущий [src/app/admin/](src/app/admin/) — custom CRUD на Supabase + Server Actions (~25 файлов). Он покрывает только products/blog/gallery/leads, но не масштабируется на drops, promos, multi-channel (B2B), multi-role workflow, фискализацию, заказы со статусами производства. Параллельно requirements добавляют СБП-платежи (Точка/Т-Банк), 152-ФЗ локализацию ПД (переезд на Yandex Cloud перед запуском).

**Решение**: Payload CMS 3 как единственный источник правды. Storefront читает только через Payload API. Текущий /admin удаляется. Dev сидит на текущей Supabase (тестовые данные), prod-cutover на Yandex Cloud — финальный gate перед публичным запуском (152-ФЗ требует ПД в РФ).

**Зафиксированные решения** (после уточнения с пользователем):
1. **Single-app integration** — НЕ monorepo. Payload встраивается в текущий Next.js через route groups `(storefront)` / `(payload)`. B2B-витрину pnhd.ru добавим позже (вне scope этого плана).
2. **Большой rip-out** — весь старый `/src/app/admin/` удаляется одной фазой (2b), как только Payload готов держать каталог.
3. **Лиды мигрируем в Payload** — collection `leads` + afterChange hook → Bitrix24. Edge Function `create-lead` удаляется.
4. **Pre-launch sweep прерывается** — текущий master plan (PR'ы #4–#9) уходит в архив, ветка `feat/tests-vitest-pr7` дожимается и мёржится, потом стартует `feat/payload-phase-0` от `main`.

**Желаемый исход**: один источник правды, гибкая ролевая модель (admin / brand_manager / marketing / operations / sales), готовность к B2B-фундаменту без редизайна, чистый pre-launch на Yandex.

---

## Карта PR'ов

| PR | Branch | Что делает |
|---|---|---|
| 0 | `feat/payload-phase-0` | Только этот план + ADR (0 кода) |
| 1 | `feat/payload-scaffold` | Payload scaffold, admin доступен на `/admin-payload`. **Старый `/admin` живёт.** |
| 2a | `feat/payload-catalog` | Collections products/variants/prices/categories/media + ETL из Supabase. Старый storefront ещё читает Supabase. |
| 2b | `feat/payload-cutover-catalog` | Storefront → Payload reads, **старый `/admin` rip-out**, route переезжает на `/admin`. Auth Supabase → Payload Users. |
| 2c | `feat/payload-content` | Pages/Drops/Promos + ETL blog → pages + gallery → media-tag. Storefront blog/gallery switchover. |
| 3 | `feat/payload-leads` | Leads collection + Bitrix24 afterChange + frontend `createLead` → Payload REST + Edge Function `create-lead` delete. |
| 4 | `feat/payload-orders` | Orders + OrderItems + operations role + custom create endpoint + RTK `apiBaseUrl` → relative. |
| 5 | `feat/payments-sbp` | PaymentProvider abstraction + Точка + Т-Банк + callback handler + SBP QR. |
| 6 | `feat/fiscal-komtet` | КОМТЕТ Касса hook после `paid` + `fiscalReceiptId`. |
| 7 | `feat/b2b-fundament` | Companies + PriceLists schema, sales role. **Frozen** (без витрины pnhd.ru). |
| 8 | `feat/yandex-cutover` | Migration tooling (`pg_dump` + `rclone`) + ENV flip на Yandex + удаление `@supabase/*`. |

Зависимости: `0 → 1 → 2a → 2b → 2c → 3 → 4 → (5,6,7 параллельно) → 8`. После PR 8 — публичный запуск возможен.

---

## Архитектурные решения

### Расположение
- `src/payload.config.ts` — главный конфиг (рядом с `src/middleware.ts`).
- `src/collections/<Name>.ts` + `src/collections/index.ts` (barrel).
- `src/access/` — переиспользуемые access-функции (`isAdmin`, `hasRole`, `isAdminOrSelf`).
- `src/hooks/` — `syncBitrixLead`, `createSbpInvoice`, `sendFiscalReceipt`.
- `src/payments/` — `PaymentProvider` interface + `TochkaProvider` + `TBankProvider`.
- `src/migrations/payload/` — drizzle migrations (auto-generated, коммитим).
- `scripts/etl-*.ts` — ETL one-shot скрипты (запуск через `tsx`).

### Route groups
```
src/app/
  (storefront)/   ← всё текущее публичное (page.tsx, shop, blog, methods, checkout, ...)
    layout.tsx    ← текущий root layout с InfoBar/Header/Footer/analytics
  (payload)/      ← Payload-only зона
    admin/[[...segments]]/page.tsx     ← Payload Admin UI
    api/[...slug]/route.ts             ← REST
    api/graphql/route.ts
    layout.tsx    ← минимал, без storefront chrome и analytics
  layout.tsx      ← <html lang="ru"><body><ReduxProvider>{children}</ReduxProvider></body></html>
```

Минус один `headers().get('x-pathname')` фокус из текущего корневого layout — route groups делают изоляцию нативно.

### `/admin` маршрут
В Phase 1 Payload временно на `/admin-payload` (старый `/admin` Supabase-based ещё жив). В Phase 2b — атомарный swap: rip-out `src/app/admin/*`, переименование `(payload)/admin-payload` → `(payload)/admin`, удаление middleware Supabase-auth-чекa.

### Auth
Payload's own `users` collection полностью замещает Supabase `admin_users`. В Phase 2b дропаем `public.admin_users`, RLS-политики admin-write на bucketах, `public.is_admin()` функцию. Bootstrap admin создаётся в Phase 1 через seed-скрипт из ENV.

### БД и медиа
- **Postgres**: `@payloadcms/db-postgres` подключается к той же Supabase Postgres через direct connection string. Payload создаёт свои таблицы с префиксом `payload_` рядом с существующими `public.*`. Старые таблицы оставляем как backup до Phase 8, дропаем при cutover.
- **Connection**: использовать Supabase pooler в **session mode** (port 5432 или 6543 с `?pgbouncer=true&statement_cache_size=0`) — transaction pooler не поддерживает prepared statements, что ломает drizzle.
- **S3**: `@payloadcms/storage-s3` с S3-совместимым endpoint. На dev — Supabase Storage (`https://<ref>.supabase.co/storage/v1/s3`, `forcePathStyle: true`), новый bucket `payload-media`. На prod (Phase 8) — Yandex Object Storage (`storage.yandexcloud.net`, `ru-central1`), без code-изменений, только ENV swap.

### RTK Query baseURL
[src/app/utils/constants.ts](src/app/utils/constants.ts) сейчас держит мёртвый `https://pnhdstudioapi.ru`. В Phase 4 меняем на `''` (relative). `createLead` переписан в Phase 3, `createOrder` — в Phase 4. `/api/shipping/*` и `/api/promocodes/*` не реализованы (CDEK / промокоды — TODO вне этого плана), но после смены baseURL они тоже resolved relative — не регресс.

### Reuse матрица (что сохраняется / удаляется)
| Файл / артефакт | Решение |
|---|---|
| [src/lib/supabase/admin-server.ts](src/lib/supabase/admin-server.ts) | Сохраняем до Phase 3 (ETL для leads). Удаляем в Phase 3. |
| [src/lib/supabase/server.ts](src/lib/supabase/server.ts), [client.ts](src/lib/supabase/client.ts) | Сохраняем до Phase 2c (blog read) + Phase 3 (createLead). Удаляем когда нет consumers. |
| [src/lib/supabase/auth-server.ts](src/lib/supabase/auth-server.ts), [auth-browser.ts](src/lib/supabase/auth-browser.ts), [middleware-client.ts](src/lib/supabase/middleware-client.ts) | Удаляем в Phase 2b — auth полностью замещён. |
| [src/lib/queries/products.ts](src/lib/queries/products.ts) | Переписать в Phase 2b под Payload local API. Сигнатуры `getAllProducts/getProductBySlug/getAllProductSlugs` и `IProduct` shape сохраняем. |
| [src/lib/queries/blog.ts](src/lib/queries/blog.ts) | Переписать в Phase 2c. |
| [src/lib/storage/upload-print.ts](src/lib/storage/upload-print.ts) | User-facing bucket `user-uploads`, не админский. Не трогаем до Phase 8. |
| [src/api/api.ts](src/api/api.ts) RTK Query | `createLead` переписан в Phase 3, `createOrder` в Phase 4. Shipping/promocodes endpoints не трогаем. |
| [src/app/admin/_lib/sync-children.ts](src/app/admin/_lib/sync-children.ts), [sync-links.ts](src/app/admin/_lib/sync-links.ts), [upload-image.ts](src/app/admin/_lib/upload-image.ts) | Удаляем в Phase 2b — Payload делает то же через `hasMany`/`relationship`/`upload` config + `imageSizes`. |
| Server Actions в /admin (`save-action.ts`, `list-actions.ts`, `actions.ts`) | Удаляем в Phase 2b/3 — Payload Admin UI делает то же через свой REST. |
| [src/middleware.ts](src/middleware.ts) | Удаляем в Phase 2b — route groups + Payload own auth = middleware не нужен. |
| Edge Function `create-lead` | Удаляем в Phase 3 — мигрирует в Payload Leads hook + access. |
| Edge Function `cleanup-user-uploads` | Сохраняем до Phase 8 — потом на Yandex Cloud Functions. |
| Старые `public.products/blog_posts/gallery_images/leads/admin_users` | Архив до Phase 8 (кроме `admin_users` — дропаем в 2b). Backup на случай emergency rollback. |
| Существующие `supabase/migrations/*` | Остаются для исторического reproducible state. Новых Supabase migrations после Phase 2b не пишем (только Payload migrations). |

---

## Phase 0 — Discovery (текущая ветка)

**Что добавляется**:
- Этот план в `/Users/margolinilya/.claude/plans/velvet-seeking-frost.md`.
- `docs/adr/0001-payload-cms-3-adoption.md` — короткий ADR:
  - Context: текущий custom admin не масштабируется на B2B + drops + multi-role + статусы производства.
  - Decision: Payload 3 single-app, db-postgres, storage-s3, СБП через PaymentProvider abstraction.
  - Alternatives rejected: Strapi (слабый TS DX), Directus (admin UI меньше кастомизируется), Sanity (нет self-host, ПД в РФ запрещены).
  - Consequences: rip-out `/admin`, заморозка pre-launch плана #4–#9.

**Pre-launch ветки**: `feat/tests-vitest-pr7` дожимаем и мёржим (vitest infra пригодится). Остальные открытые PR'ы (#4–#9) помечаем `[FROZEN]` комментарием — не закрываем, чтобы можно было вернуться post-launch.

**DoD**: PR с двумя docs-файлами в `main`. Никакого Payload-кода.

---

## Phase 1 — Scaffold (`feat/payload-scaffold`)

**Цель**: Payload Admin доступен на `/admin-payload`, БД-таблицы Payload созданы в Supabase, bucket `payload-media` создан, есть один admin user. Старый `/admin` нетронут.

**Зависимости** (package.json):
```
payload @^3.x
@payloadcms/next @^3.x
@payloadcms/db-postgres @^3.x
@payloadcms/storage-s3 @^3.x
@payloadcms/richtext-lexical @^3.x
@payloadcms/ui @^3.x
graphql @^16.x
cross-env (dev)
tsx (dev — для seed/ETL scripts)
```

**Новые файлы**:
- `src/payload.config.ts` — db, collections `[Users, Media]`, storage-s3 plugin, secret.
- `src/collections/Users.ts` — auth: true, поля `email`, `roles: select-multi['admin']` (расширим в Phase 2).
- `src/collections/Media.ts` — upload collection, `imageSizes` (thumbnail 400px, card 800px, hero 1920px).
- `src/access/isAdmin.ts`, `src/access/hasRole.ts`.
- `src/app/(payload)/admin/[[...segments]]/page.tsx` — `RootPage` из `@payloadcms/next/views`.
- `src/app/(payload)/admin/[[...segments]]/not-found.tsx`.
- `src/app/(payload)/api/[...slug]/route.ts` — `REST_GET/POST/PATCH/DELETE` из `@payloadcms/next/routes`.
- `src/app/(payload)/api/graphql/route.ts`, `src/app/(payload)/api/graphql-playground/route.ts`.
- `src/app/(payload)/layout.tsx` — минимал (без storefront chrome).
- `scripts/seed-admin-user.ts` — `tsx`, создаёт admin из ENV `PAYLOAD_BOOTSTRAP_EMAIL/PASSWORD`.
- `src/payload-types.ts` — auto-generated через `payload generate:types`, коммитим (для PR review).

**Изменения**:
- `next.config.mjs` — обёртка `withPayload(nextConfig, { devBundleServerPackages: false })`. Порядок с Sentry: `withPayload(withSentryConfig(nextConfig, {...}))`.
- `package.json` scripts: `payload`, `payload:seed`, `payload:gen-types`, `payload:migrate`.
- `.env.example`: `DATABASE_URI`, `PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET=payload-media`, `S3_FORCE_PATH_STYLE=true`, `PAYLOAD_BOOTSTRAP_EMAIL`, `PAYLOAD_BOOTSTRAP_PASSWORD`.

**Supabase migration**: `supabase/migrations/<ts>_payload_media_bucket.sql` — создаёт public-read bucket `payload-media`. Write идёт через S3 service-role keys, RLS-write не нужен.

**Verification**:
```bash
npm run dev
# /admin-payload → redirect /admin-payload/login → залогиниться bootstrap-юзером
# Загрузить картинку в Media → файл в bucket payload-media + запись в payload_media
curl -sI http://localhost:3000/admin/login   # 200 (старый /admin живой)
npm run build && npm test
```

**Размер PR**: ~12 новых файлов + ~3 модифицированных. payload-types ~200 строк auto-gen.

**Риски**:
- Connection pooler mode — см. architecture note выше.
- Payload Admin client bundle ~600 KB gzip. Изоляция через route group, в storefront chunks не утекает (проверить `next build` output).
- CSP: Lexical может потребовать `'unsafe-inline'` в `style-src` (уже есть для MUI Emotion). Проверить DevTools.

---

## Phase 2a — Catalog Collections + ETL (`feat/payload-catalog`)

**Цель**: Каталог-коллекции определены, данные из `public.products` etc. отETLены, brand_manager редактирует через Payload UI. Storefront ещё читает Supabase.

**Collections**:
- `Categories`: `name`, `slug` (unique), `parent` (rel→categories). Seed: `man`, `woman`, `kids`, `accessories`.
- `Products`: `slug` (unique), `name`, `description` (richText Lexical), `type` (select: tshirt/hoodie/longsleeve/sweatshirt/cap/totebag), `category` (rel), `channels` (select-multi: b2c/b2b, default `[b2c]`), `printMethods` (select-multi), `status` (select: draft/published/archived), `coverMedia` (upload→media), `galleryMedia` (array upload), `editorViews` (group: frontView/backView/lsleeveView/rsleeveView), `shippingParams` (group: weight/width/length/depth), `friendsProducts` (array rel→products), `isSale`, `isForPrinting`, `color`, `stageColor`.
- `Variants`: `product` (rel, required), `size` (text — `S`/`M`/`128-134 см`), `color`, `sku` (unique), `stockQty` (default 0), `sortOrder`.
- `Prices`: `variant` (rel), `currency` (select: RUB), `amount` (число — копейки), `priceList` (rel→priceLists, optional для Phase 7), `validFrom`, `validUntil`.

**Access**: Расширяем `Users.roles` до `admin|brand_manager|marketing|operations|sales`. На Products/Variants/Prices/Media/Categories: `create/update/delete = hasRole('admin') || hasRole('brand_manager')`, `read = anyone`.

**ETL** (`scripts/etl-catalog.ts`):
1. Читает Supabase: `products`, `product_sizes`, `product_gallery_photos`, `product_links`.
2. Для каждого product:
   - Resolve/create category by slug.
   - Download image_url + editor_*_view URLs → upload в Payload media. При недоступном `cdn.pnhd.ru` — fallback `https://placehold.co/600x600?text=<slug>`.
   - Create Payload product с `status='published'`.
3. Для каждого `product_sizes` row → создать Variant + Price.
4. Второй проход: resolve `friendsProducts` relations.
5. Идемпотентен (skip if exists by slug/sku).

**Решение по `cdn.pnhd.ru`**: скачиваем все 25 jpg и заливаем в `payload-media` — Payload должна быть единственным источником правды. Объём ~5 MB, разово.

**Richtext конверсия**: plain-text `description` оборачиваем в Lexical root: `{ root: { type: 'root', children: [{ type: 'paragraph', children: [{ text }] }] } }`.

**Verification**:
```bash
npm run etl:catalog    # ожидаем "25 products, ~70 variants, ~70 prices, ~100 media"
npm run etl:catalog    # second run — "0 created, 25 existing"
curl -s 'http://localhost:3000/api/products?limit=100&depth=0' | jq '.totalDocs'   # 25
```

**Размер PR**: ~10 collections/access файлов + ETL ~250 строк + payload-types diff +500 + migration ~800.

---

## Phase 2b — Storefront cutover + admin rip-out (`feat/payload-cutover-catalog`)

**Это самый большой PR в плане**. Point of no return — после merge `public.products` etc. перестают быть источником правды (остаются как backup до Phase 8).

**Цель**: storefront читает каталог из Payload, старый `/admin` удалён полностью, Payload переезжает на `/admin`.

**Новые файлы**:
- `src/lib/payload/client.ts` — wrapper для server-side reads через Payload **local API** (не HTTP):
  ```ts
  import 'server-only'
  import { getPayload } from 'payload'
  import config from '@/payload.config'
  let client: Awaited<ReturnType<typeof getPayload>> | null = null
  export async function getPayloadClient() {
    if (!client) client = await getPayload({ config })
    return client
  }
  ```
- Минимальный `src/app/layout.tsx` (без `headers().get('x-pathname')`).
- `src/app/(storefront)/layout.tsx` — текущий root layout с Header/Footer/analytics (переезжает).

**Перепись** [src/lib/queries/products.ts](src/lib/queries/products.ts):
- `getAllProducts({ type? })` → `payload.find({ collection: 'products', where: { status: { equals: 'published' }, channels: { contains: 'b2c' }, ...(type ? { type: { equals: type } } : {}) }, depth: 2, limit: 200 })`.
- `getProductBySlug(slug)` → `find` + `.docs[0]`.
- `getAllProductSlugs()` → projection на `slug`.
- Mapping function: Payload doc → existing `IProduct` shape (variants → sizes с qty=stockQty, media → URL, friendsProducts → string). Сохраняем сигнатуры, чтобы UI не трогать.

**Перемещения**: все текущие публичные роуты в `src/app/` → `src/app/(storefront)/` (всё кроме `admin/` и `(payload)/`).

**Переименование**: `(payload)/admin-payload/...` → `(payload)/admin/...`.

**Удаляется**:
- `src/app/admin/` целиком (~25 файлов: `(authed)/{blog,products,leads,gallery}/*`, `_components/*`, `_lib/*`, `login/*`, `logout/*`).
- `src/middleware.ts` — целиком (route groups + Payload own auth заменяют его).
- `src/lib/supabase/{auth-server,auth-browser,middleware-client}.ts`.

**Supabase migration** `<ts>_drop_admin_auth.sql`:
```sql
DROP POLICY IF EXISTS "admin write product-images" ON storage.objects;
DROP POLICY IF EXISTS "admin write blog-images" ON storage.objects;
DROP POLICY IF EXISTS "admin write gallery-images" ON storage.objects;
DROP FUNCTION IF EXISTS public.is_admin();
DROP TABLE IF EXISTS public.admin_users CASCADE;
```

Старые buckets `product-images`/`blog-images`/`gallery-images` оставляем — там URL'ы которые могут быть ещё referenced. Очистим в Phase 8.

**Verification**:
```bash
curl -sI http://localhost:3000/admin            # 302 → /admin/login (Payload)
curl -sI http://localhost:3000/admin-payload    # 404
curl -s http://localhost:3000/shop | grep -c "futbolka"   # >= 1, из Payload
curl -s http://localhost:3000/futbolki | grep -c "<article"
# storefront bundle не должен превысить baseline +5%:
npm run build && grep "First Load JS" .next/build-manifest.json
```

**Размер PR**: ~25 удалений + ~30 перемещений + 5 модификаций + 1 SQL migration. Логически атомарен (rip-out без switchover = site без admin; switchover без rip-out = два admin'а).

**Риски**:
- Перед merge — попросить пользователя экспортнуть pending изменения через старый admin.
- `dynamicParams: false` на `/blog/[post]` остаётся — если кто-то добавит post между 2a и 2b, в bundle не попадёт до 2c. Acceptable.
- Sentry source maps могут жаловаться на missing files после rip-out — игнорируем (шум).

---

## Phase 2c — Pages/Drops/Promos + blog/gallery migration (`feat/payload-content`)

**Цель**: контентные коллекции готовы, blog и gallery мигрированы, storefront `/blog` читает из Payload.

**Collections**:
- `Pages`: `title`, `slug` (unique), `subtitle`, `cover` (upload), `author` (default `PNHD STUDIO`), `hashtags` (array), `body` (richText Lexical), `pageType` (select: blog/landing), `publishedAt`, `status` (select: draft/published).
- `Drops`: `name`, `slug`, `description` (richText), `coverMedia`, `releaseAt`, `products` (array rel), `status` (select: teaser/live/sold_out/archived).
- `Promos`: `code` (unique), `discountType` (select: percent/fixed), `discountValue`, `validFrom`, `validUntil`, `usageLimit`, `usageCount`, `appliesTo` (array rel→products).
- `Media` расширяем: `tag` (select: product/blog/gallery_prints/drops/misc). Gallery_images приходят как `Media` с `tag=gallery_prints` (отдельная Gallery collection не нужна).

**Access**: Pages/Drops/Promos — `create/update/delete = hasRole('admin') || hasRole('marketing')`, `read = anyone` для `status=published`.

**ETL**:
- `scripts/etl-blog.ts` — конвертит `public.blog_posts` → Pages с `pageType=blog`. `body_html` → Lexical через `@payloadcms/richtext-lexical/migrate`; **fallback** — оставить legacy `bodyHtml: text` поле и рендерить через `dangerouslySetInnerHTML` (как сейчас). Cover URL → upload в media.
- `scripts/etl-gallery.ts` — `public.gallery_images` → media `tag=gallery_prints` + alt.

**Перепись** [src/lib/queries/blog.ts](src/lib/queries/blog.ts) под `payload.find({ collection: 'pages', where: { pageType, status } })`. Mapping → существующий `Post` shape.

**Изменения**:
- `dynamicParams: true` на `/blog/[post]` — новые posts появляются без билда.
- Удаляем `src/lib/supabase/{client,server}.ts` если grep `getSupabaseClient|getSupabaseServer` показывает 0 consumers (если `createLead` ещё на Supabase — оставляем до Phase 3).

**Verification**:
```bash
npm run etl:blog && npm run etl:gallery
curl -s 'http://localhost:3000/api/pages?where[pageType][equals]=blog' | jq '.totalDocs'
curl -s http://localhost:3000/blog | grep -c "<article"   # > 0
```

**Размер PR**: ~5 collections + 2 ETL scripts + 2 переписанных queries + payload-types diff.

---

## Phase 3 — Leads + Bitrix24 (`feat/payload-leads`)

**Цель**: лиды через Payload, Bitrix24 через afterChange hook, Edge Function `create-lead` удалена.

**Collection** `Leads`:
- Поля: `name`, `phone`, `email`, `comment`, `referenceUrl`, `source` (select: footer/popup/shop-no-model/product-page/methods-consultation/checkout), `roistatVisit`, `userAgent` (hidden), `attachments` (array group: side/url/filename — ссылки на `user-uploads` bucket; в Phase 8 поедут на Yandex), `status` (select: new/contacted/done/spam, default `new`), `bitrixLeadId` (number, read-only), `bitrixError` (text, read-only).
- **Access**:
  - `create: anyone` (публичный endpoint для site-формы; защищён rate-limit, см. ниже).
  - `read/update: hasRole(admin|operations|marketing)`.
  - `delete: hasRole(admin)`.
- **Hooks**: `afterChange[]` → `syncBitrixLead` (только `operation === 'create'`) — переносим payload-builder + error handling из текущей `supabase/functions/create-lead/index.ts`. Заполняет `bitrixLeadId` или `bitrixError`. Лид сохраняется в любом случае.

**Rate-limit** (`src/access/leadCreate.ts`):
- Используем существующую таблицу `public.rate_limit_log` (`supabase/migrations/20260528000002_rate_limit_log.sql`). Окно 60s, max 3 per IP. IP читаем из `req.headers.get('x-forwarded-for')`.
- ENV: `LEADS_RATE_LIMIT_WINDOW_SEC=60`, `LEADS_RATE_LIMIT_MAX=3`.

**CORS** в `payload.config.ts`:
```ts
cors: ['https://studio.pnhd.ru', 'http://localhost:3000', /\.vercel\.app$/]
csrf: ['https://studio.pnhd.ru', /\.vercel\.app$/]
```
Переносим значения из текущего `DEFAULT_ALLOWED_ORIGINS` в Edge Function.

**Frontend**: [src/api/api.ts](src/api/api.ts) `createLead` mutation переписан с `supabase.functions.invoke('create-lead')` на `fetch('/api/leads', { method: 'POST', body, headers })`. Возвращает `{ doc: { id } }` → mapper в `{ leadId }`. Сигнатура наружу не меняется.

**ENV**: `BITRIX_WEBHOOK_URL` переезжает из Supabase Edge Function Secrets в Next.js env (Vercel project settings).

**Удаляется**:
- `supabase/functions/create-lead/` целиком + deploy: `supabase functions delete create-lead`.
- `src/lib/supabase/{client,server}.ts` если последний consumer был createLead.
- `src/lib/supabase/admin-server.ts` — больше не нужен.

**Verification**:
```bash
curl -X POST http://localhost:3000/api/leads -H 'Content-Type: application/json' \
  -d '{"name":"Test","phone":"+79000000000","source":"footer"}'   # 201
# Rate-limit: 4-й запрос за 60s → 429
for i in 1 2 3 4; do
  curl -X POST http://localhost:3000/api/leads -d "{...}" -w '%{http_code}\n' -o /dev/null
done   # 201,201,201,429
```

**152-ФЗ note**: на dev Supabase — только тестовые лиды. `BITRIX_WEBHOOK_URL` на prod-Vercel остаётся **не настроен** до Phase 8 — иначе реальные ПД пойдут в Bitrix с серверов вне РФ (нарушение).

---

## Phase 4 — Orders + OrderItems (`feat/payload-orders`)

**Цель**: заказы через Payload, operations role, без payments (только запись).

**Collections**:
- `Orders`: `orderNumber` (auto-generated `PNHD-YYYYMMDD-<seq>` через `beforeChange` hook), `channel` (b2c/b2b), `customer` (group: name/phone/email/roistatVisit), `delivery` (group: type select cdek_pvz/cdek_door/self_pickup, cityCode, cityName, address, pvzCode, cost), `items` (back-rel → orderItems), `promoCode` (rel→promos), `subtotal`/`discount`/`shippingCost`/`total` (копейки), `status` (select: draft/pending_payment/paid/in_production/shipped/delivered/cancelled/refunded, default `draft`), `paymentStatus` (unpaid/awaiting_callback/paid/failed/refunded), `productionStatus` (not_started/layout_review/printing/qc/packed), `paymentProvider` (tochka/tbank — readonly до Phase 5), `sbpQrId`, `sbpQrUrl`, `fiscalReceiptId`, `notes`.
- `OrderItems`: `order` (rel), `product` (rel), `variant` (rel), `quantity`, `pricePerUnit` (snapshot цены), `printConfig` (json), `lineTotal`.

**Access**: `read/update: admin|operations`, `create: anyone` через custom endpoint (не через REST — иначе нужна auth), `delete: admin only`.

**Custom endpoint** `src/app/(payload)/api/orders/create/route.ts`:
1. Body: `{ customer, delivery, items: [{ productSlug, variantSize, quantity, printConfig }], promoCode? }`.
2. Через Payload local API в одной транзакции:
   - Resolve каждый item → product, variant → текущая price.
   - Validate `stockQty >= quantity` (422 если нет).
   - Apply promoCode (find promos, check `validFrom/validUntil`, calc discount).
   - Create Order + OrderItems.
3. Return `{ id, orderNumber, total, paymentUrl: null }` (paymentUrl появится в Phase 5).
4. Rate-limit как у leads.

**RTK Query**:
- [src/app/utils/constants.ts](src/app/utils/constants.ts) — `apiBaseUrl = ''` (relative). Удаляем `https://pnhdstudioapi.ru`.
- `createOrder` mutation в [src/api/api.ts](src/api/api.ts) → `/api/orders/create`.

**Verification**:
```bash
curl -X POST http://localhost:3000/api/orders/create -H 'Content-Type: application/json' \
  -d '{
    "customer":{"name":"Test","phone":"+79000000000"},
    "delivery":{"type":"cdek_pvz","cityCode":"137","cityName":"СПб","address":"...","pvzCode":"SPB1","cost":350},
    "items":[{"productSlug":"hudi-classic-belyj-man","variantSize":"M","quantity":1,"printConfig":{"location":"none","files":{}}}]
  }'
# expect: 201, { id, orderNumber, total, paymentUrl: null }
```

**Риски**:
- Stock race condition при конкурентных покупках последнего размера. Phase 4 — naive read-then-decrement; если реальный traffic концеп — fix в отдельном PR через `SELECT ... FOR UPDATE`.

---

## Phase 5 — Payments СБП (`feat/payments-sbp`)

**Цель**: PaymentProvider abstraction + Точка Банк + Т-Банк + callback + динамический СБП QR.

**Файлы**:
- `src/payments/PaymentProvider.ts` — interface:
  ```ts
  export interface PaymentProvider {
    name: 'tochka' | 'tbank'
    createInvoice(input: {
      orderId: string; orderNumber: string; amount: number
      description: string; customerEmail?: string; customerPhone: string
    }): Promise<{ qrId: string; qrUrl: string; sbpUrl: string }>
    verifyCallback(req: Request): Promise<{ qrId: string; status: 'paid' | 'failed'; providerPaymentId: string } | null>
  }
  ```
- `src/payments/TochkaProvider.ts` — Точка API: торговая точка + динамический QR (сумма + TTL) + возвраты. Разрешения `EditSBPData`, `ReadSBPData`. ENV: `TOCHKA_API_TOKEN`, `TOCHKA_CUSTOMER_CODE`, `TOCHKA_CALLBACK_SECRET`.
- `src/payments/TBankProvider.ts` — Т-Банк интернет-эквайринг (магазин в кабинете + приём СБП через API). ENV: `TBANK_TERMINAL_KEY`, `TBANK_SECRET`, `TBANK_CALLBACK_SECRET`.
- `src/payments/select.ts` — фабрика по `DEFAULT_PAYMENT_PROVIDER` (или amount-based routing позже).

**Hook на Orders**: `afterChange: createSbpInvoice` — при `status === 'pending_payment'` зовёт `provider.createInvoice()`, пишет `sbpQrId/sbpQrUrl/paymentStatus=awaiting_callback`.

**Callback endpoint** `src/app/(payload)/api/payments/callback/[provider]/route.ts`:
- Validates signature (HMAC по provider).
- Resolves `qrId` → order через `find({ collection: 'orders', where: { sbpQrId: { equals: qrId } } })`.
- Updates `paymentStatus`, `status` (paid → `in_production`).
- Idempotency: unique `(provider, providerPaymentId)`.
- Triggers fiscalization (Phase 6).

**Storefront**:
- После `/api/orders/create` backend ставит `status=pending_payment` → hook создаёт invoice → response уже с `paymentUrl` (sbpUrl).
- Frontend redirect на `paymentUrl` (mobile → SBP Pay app; desktop → QR-страница).
- `/thanks` показывает orderNumber + polling `GET /api/orders/{id}` каждые 5s пока `paymentStatus === 'paid'`.

**ENV**: см. Tochka/TBank выше + `DEFAULT_PAYMENT_PROVIDER=tochka`.

---

## Phase 6 — Fiscalization КОМТЕТ (`feat/fiscal-komtet`)

**Цель**: после `paid` — автоматический чек через КОМТЕТ Касса REST + `fiscalReceiptId`.

**Hook** `src/hooks/sendFiscalReceipt.ts`:
- `afterChange` Orders при `paymentStatus: awaiting_callback → paid`.
- Собирает receipt items из orderItems (наименование/qty/price/ndsTaxType/paymentMethod/paymentObject).
- POST на `https://kassa.komtet.ru/api/shop/v2/queues/<queue_id>/task` с HMAC auth.
- Сохраняет `task_id` как `fiscalReceiptId`, ошибки — в `fiscalError`.
- Idempotency: skip если `fiscalReceiptId` уже есть.
- Retry с exponential backoff; после 5 неудач — `fiscalStatus=manual_required`, operations user дочиняет руками.

**ENV**: `KOMTET_SHOP_ID`, `KOMTET_QUEUE_ID`, `KOMTET_API_SECRET`.

**Open question** (уточнить у пользователя перед execution): налоговый режим магазина (УСН доход / УСН доход-расход / ОСН?). До этого hardcoded `NO_VAT` или `VAT_20`.

---

## Phase 7 — B2B fundament (`feat/b2b-fundament`)

**Цель**: schema для B2B готова, sales role создана. Витрина pnhd.ru — frozen (вне scope).

**Collections**:
- `Companies`: `name`, `inn` (unique), `kpp`, `ogrn`, `legalAddress`, `actualAddress`, `contactPerson` (group), `priceList` (rel), `paymentTerms`, `status` (select: lead/active/suspended).
- `PriceLists`: `name`, `discountPercent`, `validFrom`, `validUntil`.
- Update `Products.channels`: добавляем `b2b` value.
- Update `Prices.priceList` — становится visible/editable.

**Access**: sales — full CRUD на companies/priceLists, остальные роли — без доступа.

**Что НЕ добавляется**: B2B витрина (отдельный host pnhd.ru) — frozen. B2B заказы пока через те же Orders с `channel=b2b`.

---

## Phase 8 — Yandex Cloud cutover (`feat/yandex-cutover`)

**Цель**: production переключён с Supabase на Yandex Cloud (Managed PostgreSQL + Object Storage). **Финальный gate перед публичным запуском** — после этого собираем реальные ПД клиентов.

**Что переносим** из Supabase в Yandex:
- `payload_users`, `payload_categories`, `payload_products`, `payload_variants`, `payload_prices`, `payload_pages`, `payload_drops`, `payload_promos`, `payload_companies`, `payload_price_lists`, `payload_media` (rows + S3 objects).

**НЕ переносим** (стартуем с нуля на prod):
- `payload_leads` — testовые dev-данные.
- `payload_orders`, `payload_order_items` — testовые.
- Старые `public.products/blog_posts/gallery_images/leads` — навсегда оставляем в Supabase как archival snapshot (они duplicate того что в `payload_*`).

**Tooling**:
- Postgres: `pg_dump --data-only --table='payload_*' --exclude-table='payload_leads' --exclude-table='payload_orders' --exclude-table='payload_order_items' > dump.sql`. Затем на Yandex `payload migrate` (создаёт schema) + `psql $YANDEX_URI < dump.sql`.
- Media: `rclone copy supabase:payload-media yandex:pnhd-payload-media --progress`. Verify `count = count(payload_media)`.
- `scripts/yandex-cutover.ts` — orchestrator (dump + restore + verify).

**ENV swap** на Vercel prod:
```
DATABASE_URI=postgres://<yandex-mdb-user>@<yandex-mdb-host>:6432/pnhd
S3_ENDPOINT=https://storage.yandexcloud.net
S3_REGION=ru-central1
S3_ACCESS_KEY_ID=<yandex>
S3_SECRET_ACCESS_KEY=<yandex>
S3_BUCKET=pnhd-payload-media
S3_FORCE_PATH_STYLE=false
```
Удаляем `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Bitrix24 webhook теперь можно подключать на prod.

**Code changes**:
- Удаляем `@supabase/ssr`, `@supabase/supabase-js` из package.json.
- Удаляем `src/lib/supabase/` целиком.
- Удаляем `src/lib/storage/upload-print.ts` (мигрируем на Payload media create через local API + S3).
- Удаляем Edge Function `cleanup-user-uploads` (переезжает на Yandex Cloud Functions — отдельный PR).
- `next.config.mjs`: убрать `*.supabase.co` из `remotePatterns`, добавить `storage.yandexcloud.net`. CSP `img-src`/`connect-src` — то же.

**Maintenance window** (~30 минут):
1. Включить static fallback на сайте.
2. `pg_dump` + `rclone copy`.
3. Verify counts.
4. ENV swap на Vercel + redeploy.
5. Smoke + unpause.
6. Перед всем — Yandex snapshot. Supabase paused (не удалён) ещё месяц.

**Verification**:
```bash
# Rehearsal на staging-Yandex до cutover
psql $YANDEX_URI -c "SELECT count(*) FROM payload_products;"   # =25
psql $YANDEX_URI -c "SELECT count(*) FROM payload_media;"      # совпадает с Supabase

# Post-cutover prod smoke
curl -sI https://studio.pnhd.ru/admin                          # 302 на /admin/login
curl -s https://studio.pnhd.ru/api/products | jq '.totalDocs'  # 25
curl -s https://studio.pnhd.ru/shop | grep -c "futbolka"       # >= 1
```

**Риски**:
- DNS / VPC: Yandex Managed PG может быть в private subnet — нужен VPC peering или Vercel доступ. Альтернатива: задеплоить и Next.js на Yandex Compute (бриф так и предполагает в финальной картине).
- 152-ФЗ compliance audit — отдельная задача перед публичным запуском.

---

## Глобальный verification checklist

После каждой фазы:
```bash
npm test           # vitest
npm run lint
npm run build
npx tsc --noEmit
# Bundle delta:
ls -la .next/static/chunks | awk '{sum+=$5} END {print sum}'   # сравнить с baseline
```

После каждого ETL:
```bash
mcp__claude_ai_Supabase__execute_sql "
  SELECT 'products' as t, count(*) FROM payload_products
  UNION ALL SELECT 'variants', count(*) FROM payload_variants
  UNION ALL SELECT 'media', count(*) FROM payload_media
"
```

Smoke storefront (manual, перед каждым merge):
- `/` → загрузка без ошибок в console.
- `/shop` → 25 товаров.
- `/shop/<slug>` → product page, variants, gallery, add-to-cart.
- `/cart` → персист через refresh.
- `/blog` → posts (после Phase 2c).
- Lead-form submit (footer popup) → success (после Phase 3 — через Payload REST).

---

## Critical files для execution-агента

| Файл | Зачем |
|---|---|
| [src/middleware.ts](src/middleware.ts) | Удаляется в Phase 2b — auth и `x-pathname` исчезают |
| [src/app/layout.tsx](src/app/layout.tsx) | Превращается в минимал; storefront chrome переезжает в `(storefront)/layout.tsx` |
| [src/lib/queries/products.ts](src/lib/queries/products.ts) | Полностью переписан в Phase 2b, public API сохранён |
| [src/lib/queries/blog.ts](src/lib/queries/blog.ts) | Полностью переписан в Phase 2c |
| [src/api/api.ts](src/api/api.ts) | `createLead` переписан в Phase 3, `createOrder` в Phase 4 |
| [src/app/utils/constants.ts](src/app/utils/constants.ts) | `apiBaseUrl` → `''` в Phase 4 |
| [next.config.mjs](next.config.mjs) | Обёртка `withPayload` в Phase 1, `remotePatterns` в Phase 8 |
| [src/redux/cart-slice/cart.slice.ts](src/redux/cart-slice/cart.slice.ts) | Не трогаем — cart-state сохраняется |
| [supabase/migrations/](supabase/migrations/) | После Phase 2b новые миграции не пишем (только Payload migrations) |

---

## Open questions для execution

1. **Pre-launch ветки** (#4–#9): `[FROZEN]` комментарий или закрыть с reopen-after-launch? — рекомендую первое.
2. **КОМТЕТ tax type**: УСН доход / УСН доход-расход / ОСН? Нужно от пользователя до Phase 6.
3. **Bitrix24 webhook URL**: нужен от заказчика до подключения на prod (Phase 8).
4. **Yandex Cloud аккаунт**: должен быть готов до Phase 8 (Managed PG + Object Storage + Service Account ключи).
5. **CDEK/promocodes endpoints** в RTK Query — мёртвые. Реализация — отдельный PR post-Phase-8.
6. **`@payloadcms/richtext-lexical/migrate`** для HTML→Lexical конверсии — проверить наличие при старте Phase 2c; fallback на legacy `bodyHtml: text` field готов.
