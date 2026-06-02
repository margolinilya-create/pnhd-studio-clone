# CLAUDE.md — Контекст проекта pnhd-studio-clone

Этот файл — единый источник правды для будущих ИИ-сессий. Если ты — Claude или другой агент, начни отсюда.

> **Last full update:** 2026-06-02 после Wave 0 complete (PR #42) + Wave 1 P1.1+P1.2 (PR #43).
> Если правишь — синхронизируй разделы 4, 5, 6, 7, 9, 10 одновременно с кодом.

---

## 1. Project overview

**Что это**: клон production-сайта [studio.pnhd.ru](https://studio.pnhd.ru) — e-commerce печати на одежде в Санкт-Петербурге. RU-only.

**Что отрисовывается**:
- Лендинг с методами печати, ценами, FAQ
- Каталог товаров (футболки, худи, лонгсливы, свитшоты, кепки, шопперы) — данные из Supabase
- Карточка товара с **новой единой панелью выбора размера + расположения принта + загрузки файла** (Variant B из дизайн-прототипа)
- Чекаут с CDEK + платёжным шлюзом — **в TODO**, пока demo-alert
- Лид-формы (footer, popup, NoModelBlock на /shop) — **работают**, пишут в Supabase `leads` через Edge Function, опционально проксируют в Bitrix24
- Блог
- Программа лояльности (статика без логики)
- Юридические страницы

**Ключевое архитектурное отличие от оригинала**: 3D-конструктор **полностью удалён**. Вместо отдельной страницы `/shop/[slug]/constructor` с Three.js + Konva + FFmpeg выбор расположения принта и загрузка картинки происходят прямо в правой панели product page — клиент выбрал размер, ткнул «На груди», перетащил PNG, нажал «В корзину». Менеджер потом связывается для уточнения макета.

**Этот репозиторий — клон**:
- GitHub: `margolinilya-create/pnhd-studio-clone` (private)
- Vercel project: `pnhd-studio-clone` (team `margolinilya-creates-projects`, id `team_gg2ut4vzpiq8w8GICbmxzlTG`)
- Vercel project id: `prj_Jf5p3M82GCpUEEXuZnyNuEo3vHZK`
- Supabase project: `pnhd-studio-clone` (id `almfjmiygtnzngkayhdv`) в `eu-central-1`
- Production оригинала: `studio.pnhd.ru` — нам недоступен, бэкенд `pnhdstudioapi.ru` мёртв (502)

---

## 2. Stack

| Слой | Технология | Версия |
|---|---|---|
| Framework | Next.js (App Router) | **15.4.11** (was 14.2.35 — bumped в Payload phase) |
| Runtime | React | **19** (with Next.js 15) |
| Язык | TypeScript (strict) | 5 |
| Стиль | CSS Modules + MUI v7 `sx` + Emotion | — |
| State | Redux Toolkit + RTK Query + **listener middleware для persist** | 2.x |
| UI-kit | @mui/material | 7.3.1 |
| 3D (главная) | Three.js + @react-three/fiber + @react-three/drei + maath | 0.164 / 8.16 / 9.105 / 0.10 |
| Telefon input | mui-tel-input | 9 |
| Карты | @pbe/react-yandex-maps | 1.2 |
| Image opt | sharp | 0.33 |
| Backend | **Supabase** (Postgres + Storage + Edge Functions, регион `eu-central-1`) | — |
| Хостинг | Vercel (auto-deploy `main` → production) | — |

**Удалены из бандла** (батч 2026-05-27):
- `@ffmpeg/core`, `@ffmpeg/ffmpeg` (видео-запись конструктора)
- `konva`, `react-konva`, `use-image` (2D-редактор принта)

3D-зависимости (`three`, `@react-three/fiber`, `@react-three/drei`, `maath`) **остались** — их использует `<Tee>` (3D-футболка на главной маркетинг-страницах). Загружаются через `next/dynamic({ssr:false})` → не блокируют initial bundle.

ESLint правила `@next/next/no-img-element`, `react-hooks/exhaustive-deps`, `react/no-unescaped-entities` — отключены (исторический долг).

---

## 3. Routing map

| Path | Тип | Источник данных | Статус |
|---|---|---|---|
| `/` | SSR | static + jsonLd | ✅ |
| `/shop` | SSR | Supabase `products` (через `lib/queries/products.ts`) | ✅ **25 реальных товаров** |
| `/shop/[slug]` | SSG (`generateStaticParams`) | Supabase `products` by slug + новая правая панель `ProductInfo` | ✅ |
| `/blog` | SSR | Supabase `blog_posts` | ✅ |
| `/blog/[post]` | SSG (`generateStaticParams`, `dynamicParams=false`) | Supabase `blog_posts` by slug | ✅ |
| `/cart` | CSR | Redux + sessionStorage (key `order_v3`) | ✅ |
| `/checkout` | CSR | Redux + RTK Query → CDEK/orders | ⚠️ demo-alert (нет CDEK + нет шлюза) |
| `/thanks` | CSR | — | ✅ |
| `/contacts`, `/oferta`, `/privacy`, `/size_chart`, `/howto`, `/loyalty` | SSR | статика | ✅ |
| `/methods/[slug]`, `/methods/[slug]/[type]` | SSR | локальные TS-данные (`method-options-data.ts`) | ✅ |
| `/prints/[slug]`, `/textile/[slug]` | SSR | локальные TS-данные | ✅ |
| `/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery` | SSR | Supabase `products` (через generic `<CategoryPage>` + local `config.tsx`) | ✅ (рефакторинг 2026-05-27) |
| ~~`/shop/[slug]/constructor`~~ | — | **УДАЛЁН** | вся папка `src/components/pages-components/constructor-page/` тоже |

`dynamicParams=false` на `/blog/[post]` — после деплоя новые посты не появятся без билда. TODO.

---

## 4. State management

Redux store: [src/redux/store.ts](src/redux/store.ts)

| Slice | Что хранит |
|---|---|
| `utils` | UI-флаги, popup'ы (`isMobileMenuActive`, `popupType`, `isPopupVisible`, `popupTitle`) |
| `cart` | `order: ICartOrderElement[]`, `isHydrated: boolean`, customer userData, CDEK delivery, promocode |
| `leads` | имя/телефон/email/agreement (поля popup-формы) |
| `api` | RTK Query reducer (CDEK, orders, leads, promocodes) |

**`printConstructor`-slice удалён** (3D конструктор больше нет).

### Cart-slice — actions (новая схема)

```ts
addToCart({ itemCartId, item, printConfig })
setPrintLocation({ itemCartId, location })   // 'none' | 'front' | 'back' | 'sleeve' | 'both'
setPrintFile({ itemCartId, side, file })     // side: 'front' | 'back' | 'sleeve'
clearPrintFile({ itemCartId, side })          // авто-нормализует location в 'none' если все файлы пусты
clearAllPrints({ itemCartId })
deleteItemFromCart({ itemCartId })
restoreCart(parsedOrder)                       // дёргается из CartIcon useEffect
markHydrated()                                 // дёргается когда sessionStorage пуст
resetCart() / setDelivery / setCdek... / setUserData / setPaymentURL / setUserPromocode / ...
```

### Cart-persist middleware

Раньше: `sessionStorage.setItem(...)` вызывался **внутри reducer'ов** — нарушение purity, SSR-риск. Теперь — `createListenerMiddleware` в [src/redux/middleware/cart-persist.ts](src/redux/middleware/cart-persist.ts):

- Слушает: `addToCart, setPrintLocation, setPrintFile, clearPrintFile, clearAllPrints, deleteItemFromCart, resetCart`
- НЕ слушает `restoreCart` — иначе сразу после гидрации переписывает sessionStorage тем же значением.
- Ключ: `order_v3` (был `order_v2`; bumped из-за добавления `path` в `IPrintFileRef`).
- CartIcon на mount чистит legacy ключи `order` и `order_v2` и валидирует форму restored массива (требует `printConfig.location ∈ enum + files: object + itemCartId: string`).

### Cart-orphan-cleanup middleware

[src/redux/middleware/cart-orphan-cleanup.ts](src/redux/middleware/cart-orphan-cleanup.ts) — second listener middleware:

- Слушает: `clearPrintFile`, `clearAllPrints`, `deleteItemFromCart`, `resetCart`
- На каждом action diff'ит `previousState.cart.order` vs `currentState.cart.order`, собирает `path`-поля из удалённых `IPrintFileRef`, вызывает `supabase.storage.from('user-uploads').remove(paths)`.
- Best-effort: ошибки storage логируются `console.warn`, но action не отменяется.
- Покрывает 90% случаев когда юзер сам убрал/удалил принт. Abandoned sessions (закрытая вкладка) подметаются nightly sweeper'ом (см. §6).

### Hydration race fix (B1 из review-pass)

`cart.isHydrated` стартует `false`. CartIcon ставит `true` через `restoreCart` (если был sessionStorage) или `markHydrated()` (если пусто). `CartClient` и `checkoutClient` редиректят на `/shop` **только когда `isHydrated && order.length === 0`** — иначе на hard-refresh /cart выбрасывало пользователя до того, как Redux успевал восстановить корзину.

---

## 5. API contract

Старый прокси `pnhdstudioapi.ru` мёртв (502). Все эндпоинты, относящиеся к нашей логике, мигрированы или ждут миграции.

| Endpoint в оригинале | Метод | Что делает | Состояние в клоне |
|---|---|---|---|
| `/api/products` | GET | каталог | ✅ → Supabase `products` (см. [src/lib/queries/products.ts](src/lib/queries/products.ts)) |
| `/api/blog` | GET | блог-посты | ✅ → Supabase `blog_posts` ([src/lib/queries/blog.ts](src/lib/queries/blog.ts)) |
| `/api/gallery/` | GET | галерея принтов для конструктора | ❌ удалено вместе с конструктором (`src/lib/queries/gallery.ts` снесён) |
| `/api/uploads/` | POST | загрузка пользовательского принта | ✅ → **Supabase Storage `user-uploads`** ([src/lib/storage/upload-print.ts](src/lib/storage/upload-print.ts)) |
| `/api/leads/` | POST | приём заявок | ✅ → **Edge Function `create-lead`** через `supabase.functions.invoke(...)` |
| `/api/shipping/cities` | GET | автокомплит CDEK городов | ❌ TODO — нужна Edge Function-proxy |
| `/api/shipping/points` | GET | пункты выдачи CDEK | ❌ TODO — Edge Function |
| `/api/shipping/calculate/` | POST | расчёт доставки | ❌ TODO — Edge Function |
| `/api/orders` | POST | создание заказа + платёжный шлюз | ❌ TODO — Edge Function + YooKassa/Robokassa |
| `/api/promocodes/` | POST | валидация промокода | ❌ TODO — Edge Function + табличка `promocodes` |

В RTK Query ([src/api/api.ts](src/api/api.ts)) живы: `getCdekCitiesData`, `getCdekPoints`, `getCdekDeliveryPrice`, `createOrder`, `createLead`, `promocodeValidation`. Первые 5 пока бьются в `apiBaseUrl=https://pnhdstudioapi.ru` — мёртвый адрес. `createLead` уже переведён на Supabase Functions через `queryFn`.

---

## 6. Supabase

Проект: `pnhd-studio-clone` (id `almfjmiygtnzngkayhdv`), регион `eu-central-1`.

### Tables (`public.*`, все с RLS)

| Таблица | RLS | Запись |
|---|---|---|
| `products` | anon read | seed / catalog import migration |
| `product_sizes` | anon read | catalog import |
| `product_gallery_photos` | anon read | catalog import |
| `product_links` | anon read | catalog import |
| `blog_posts` | anon read | seed |
| `gallery_images` | anon read | seed (для удалённого конструктора, сейчас не читается) |
| `leads` | **anon insert удалён** — пишет только Edge Function (service_role) | runtime |

`leads`-колонки: `id, created_at, name, phone, email, comment, reference_url, source, roistat_visit, user_agent, ip_hash, bitrix_lead_id, bitrix_error`. Индексы по `created_at desc`, `source`, `ip_hash` (для rate-limit запроса).

### Storage buckets

| Bucket | Public read | Anon write | Лимит | MIME |
|---|---|---|---|---|
| `product-images` | yes | no | — | — |
| `blog-images` | yes | no | — | — |
| `gallery-images` | yes | no | — | — |
| `user-uploads` | yes | yes **только под `prints/` префиксом** | 20 МБ | `image/png`, `image/jpeg`, `image/webp` (SVG исключён — XSS) |

### Edge Functions

| Function | verify_jwt | Назначение |
|---|---|---|
| `create-lead` | `false` (публичный POST) | Принимает заявки, валидирует (length-caps + regex), rate-limit 3/мин по `sha256(IP)`, CORS allowlist, insert в `leads` через service_role, опц. → Bitrix24 `crm.lead.add`, опц. → Telegram |
| `cleanup-user-uploads` | `false` (secret-header auth) | Nightly sweeper: листает `user-uploads/prints/`, удаляет объекты старше 14 дней. Авторизуется через `X-Cleanup-Secret` header. Вызывается pg_cron через pg_net. |

#### env переменные `create-lead`:
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — выставляются автоматически
- `BITRIX_WEBHOOK_URL` — опц., формат `https://<portal>.bitrix24.ru/rest/<user>/<token>/`. Когда задан — лиды летят в Bitrix24. Пока пустой.
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — опц., при наличии шлёт уведомление в Telegram.
- `ALLOWED_ORIGINS` — опц. CSV. Если не задан, используется встроенный list (`studio.pnhd.ru`, наши Vercel-aliases, `localhost:3000`, regex `pnhd-studio-clone-*.vercel.app`).

#### env переменные `cleanup-user-uploads`:
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — auto
- `CLEANUP_SECRET` — обязательный, hex-32 random. Тот же секрет хранится в `vault.secrets` под именем `edge_function_cleanup_secret` для pg_cron.

### Миграции (`supabase/migrations/`)

1. `20260526000001_initial_schema.sql` — products/sizes/photos/links/blog_posts/gallery_images + RLS + индексы
2. `20260526000002_seed_data.sql` — 5 seed-товаров (затёрт миграцией #6)
3. `20260527000001_user_uploads_bucket.sql` — bucket
4. `20260527000002_leads_table.sql` — leads table
5. `20260527000003_leads_harden.sql` — `ip_hash` колонка + drop anon-insert на leads + drop SVG из bucket + path-prefix RLS
6. `20260527000004_import_catalog.sql` — реальный каталог (25 продуктов), извлечённый из RSC-payload `studio.pnhd.ru` (см. секцию 9)

Миграции **5–8** — admin panel (см. §15). После них:

9. `20260527000009_leads_retention.sql` — pg_cron job daily DELETE leads >90 дней
10. `20260527000010_user_uploads_sweeper.sql` — pg_cron + pg_net вызов `cleanup-user-uploads` daily, секрет из Vault

### Payload migrations (`src/migrations/`)

Применяются через `npm run payload migrate` (с prod `DATABASE_URI` в `.env.local`):

1. `20260528_232600` — initial Payload schema (Users + Categories + Products + Variants + Prices + Pages + Drops + Promos + Leads + Orders + OrderItems)
2. `20260530_062122_payload_seo_meta` — SEO plugin tab fields
3. `20260530_064450_payload_redirects` — Redirects collection
4. `20260530_071720_order_customer_note` — customer.note field
5. `20260530_075057_pages_drafts_versions` — drafts + versions для Pages
6. `20260601_101348_payload_plugin_import_export` — Import/Export plugin (applied 2026-06-01 audit fix)
7. `20260601_102621_payload_plugin_form_builder` — Form Builder plugin (applied 2026-06-01 audit fix)
8. `20260601_110001_payload_form_submissions_extra_fields` — `ipHash`/`userAgent`/`bitrixLeadId`/`bitrixError` columns (applied 2026-06-01)

### Direct prod-SQL applied via Supabase MCP (2026-06-01 audit)

- `drop_admin_auth` — `DROP FUNCTION is_admin()` + `DROP TABLE admin_users` + dropped 11 admin-write policies (storage.objects × 3 + public.* × 8). См. §15.
- `drop_svg_mime_from_buckets` — SVG MIME убран из `gallery-images` + `payload-media` allowed_mime_types
- `price_qty_nonnegative_checks` — `prices.amount >= 0` + `variants.stock_qty >= 0` CHECK constraints
- `drop_leads_source_idx` — низко-полезный index дропнут
- `drop_unused_rate_limit_log` — table + cron-job (legacy от Edge Function lead-pipeline) удалены

> **⚠️ Schema drift между local-`supabase/migrations/` и prod:** drop_admin_auth существует как файл `20260529000002_drop_admin_auth.sql` (idempotent), но также applied отдельно через MCP под именем `drop_admin_auth_v2`. На fresh DB обе версии идемпотентно сработают одинаково.

---

## 7. Лид-пайплайн (полный flow)

1. Пользователь заполняет форму (`LeadForm` или `NoModelBlockForm`).
2. На submit: `useCreateLeadMutation` → [src/api/api.ts](src/api/api.ts) `createLead` → `supabase.functions.invoke('create-lead', { body: payload })`.
3. Edge Function:
   - санитизирует все строки (control chars → space, обрезка по лимиту)
   - валидирует phone regex, email regex, URL regex, source whitelist (`'footer' | 'popup' | 'shop-no-model' | 'product-page' | 'methods-consultation'`)
   - проверяет rate-limit: `COUNT(*) FROM leads WHERE ip_hash=$1 AND created_at > now() - 60s`, если ≥ 3 → 429
   - INSERT в `leads` через service_role (минуя RLS)
   - если задан `BITRIX_WEBHOOK_URL`: POST на `<url>/crm.lead.add.json`, на успех пишет `bitrix_lead_id`, на ошибку — `bitrix_error`. Лид сохраняется в любом случае.
   - если заданы telegram-переменные: шлёт уведомление (не блокирующее).
4. Фронт получает `{ ok, leadId }` или `{ ok: false, error }` → отрисовывает success/retry.

`roistat_visit` cookie читается клиентским хелпером [src/lib/analytics/roistat.ts](src/lib/analytics/roistat.ts) и пробрасывается в payload.

---

## 8. External services

| Сервис | ID/токен | Где используется |
|---|---|---|
| Roistat | `86cd2ab6047bc5c2f8ea632e1183ac10` | [src/app/layout.tsx:61-75](src/app/layout.tsx#L61) (root layout → на всех страницах) |
| Yandex Metrica | counter `86217584` | [src/app/layout.tsx:76+](src/app/layout.tsx#L76) |
| Yandex Verification | `35381404e7bfd3a4` | [src/app/layout.tsx:27](src/app/layout.tsx#L27) |
| uiscom.ru (чат) | `79obNG5YrzIplUgKXZYSiPbK7agWm7Dk` | [src/app/layout.tsx:93](src/app/layout.tsx#L93) |
| `cdn.pnhd.ru` | — | картинки товаров из импорта (whitelist в `next.config.mjs`) |
| `*.supabase.co` | — | Storage public bucket + Edge Function endpoint |

**Эти ID — старого проекта.** Замени в [src/app/layout.tsx](src/app/layout.tsx) или удали скрипты, если трекинг должен идти на твой аккаунт.

---

## 9. Catalog import

25 реальных товаров со склада оригинала залиты миграцией `20260527000004_import_catalog.sql`.

### Как получили данные

API оригинала `pnhdstudioapi.ru/api/products` отдаёт 502. Скрейпили через Next.js RSC payload:

1. `curl https://studio.pnhd.ru/shop` — 280 КБ HTML с inline `self.__next_f.push([1, "..."])` чанками
2. Python-скрипт декодит чанки (JSON.parse внутренней escaped-строки), парсит `<hex>:<JSON>` RSC stream, резолвит `$N` back-references.
3. Walk через resolved-дерево → собирает все объекты с `slug + price + image_url`.
4. Дедуп по slug → 25 уникальных объектов.

11 slug'ов из sitemap отдают 404 — «ghost» товары оригинала (скрытые/архивные), их не импортировали.

### Image hosting

**Image hosting — обновлено 2026-06-01**: все 25 товаров теперь хостятся в Supabase Storage `product-images/imported/<slug>/<filename>`.

Изначально 15/25 товаров (шопперы, кепки, kids-футболки, SUPEROVERSIZE, белый мужской лонгслив) имели битый `cdn.pnhd.ru` URL — 404. Реальные фото найдены в RSC-payload оригинала по пути `pnhdstudioapi.ru/images/<категория>/<цвет>_main.{jpg,png}` + numbered (`<цвет>1`, `<цвет>2`, `<цвет>3`). Раньше думали, что весь `pnhdstudioapi.ru` мёртв — но 502 был только на `/api/*` (REST), статика на `/images/*` живая.

Скачали 49 фото с битых slug'ов + 40 с живых cdn.pnhd.ru = 89 файлов, залили в Supabase Storage `product-images/imported/<slug>/`, обновили `products.image_url` и `product_gallery_photos.url` в legacy таблицах `public.*`. Один slug бедный — `futbolka-oversize-chernaya-man` имеет только 1 фото (на оригинале тоже одно).

**Payload wiring (2026-06-01)**: legacy `public.products` / `public.product_gallery_photos` — orphan, storefront читает Payload. До этой даты `payload.products`: 25 строк, **0 с cover_media_id**, `products_gallery_media`: **0** строк → каждый product рендерился как placeholder в проде. Скрипт [scripts/fix-product-media.ts](scripts/fix-product-media.ts) ходит за URL'ами из Supabase `public.*`, загружает через Payload local API (s3Storage adapter → bucket `payload-media/media/`), связывает `cover_media_id` + insert'ит в `products_gallery_media`. Запуск: `NODE_ENV=production npx tsx --env-file=.env.local scripts/fix-product-media.ts`. Идемпотентен по наличию cover/gallery — повторный запуск пропустит готовое. После прогона: `payload.media` содержит 114 product-media (25 covers + 89 gallery), все 25 products связаны.

**Compute-эффект на frontend**: legacy fallback chain (`product-card.tsx`/`product-photos.tsx`/`cart-page/product-image.tsx` пытались сначала `cdn.pnhd.ru/<slug>_0.jpg` → 404 → fallback на `image_url`) удалён. Initial src теперь `image_url || LOCAL_PLACEHOLDER`. `CDN_URL` константа удалена из `src/app/utils/constants.ts`, `cdn.pnhd.ru` убран из `next.config.mjs` images.remotePatterns + CSP img-src.

`editor_*_view` (3D mockup paths) проставлены NULL — конструктора больше нет.

### Распределение по типам

| type | qty |
|---|---|
| totebag (шопперы) | 8 |
| tshirt (футболки) | 5 |
| longsleeve | 3 |
| hoodie (худи) | 3 |
| sweatshirt (свитшоты) | 3 |
| cap (кепки) | 3 |

Размеры: 74 записи (с реальными остатками qty). Галерея: 100 фото (4 на товар по конвенции).

---

## 10. Critical files

| Путь | Зачем |
|---|---|
| [src/app/layout.tsx](src/app/layout.tsx) | `<html lang="ru">`, root metadata, Roistat/Metrica скрипты, providers |
| [src/app/utils/constants.ts](src/app/utils/constants.ts) | `apiBaseUrl` (legacy, бьётся в мёртвый pnhdstudioapi.ru — используется только в RTK Query baseUrl, но реальные мутации `createLead` идут через Supabase Functions), `CDN_URL` |
| [src/app/utils/types.ts](src/app/utils/types.ts) | `IProduct`, `ICartOrderElement` (теперь с `printConfig`), `TPrintLocation`, `TPrintSide`, `IPrintFileRef`, `IPrintConfig`, CDEK типы |
| [src/api/api.ts](src/api/api.ts) | RTK Query endpoints; `createLead` → Edge Function через `queryFn` + supabase-js; `LeadSource` enum |
| [src/redux/store.ts](src/redux/store.ts) | Store + `cartPersistMiddleware` |
| [src/redux/cart-slice/cart.slice.ts](src/redux/cart-slice/cart.slice.ts) | Reducers без sessionStorage (всё через listener middleware) |
| [src/redux/middleware/cart-persist.ts](src/redux/middleware/cart-persist.ts) | `createListenerMiddleware` для sessionStorage persist, ключ `CART_STORAGE_KEY = 'order_v3'` |
| [src/redux/middleware/cart-orphan-cleanup.ts](src/redux/middleware/cart-orphan-cleanup.ts) | Listener middleware: удаляет orphan'ы из Storage когда юзер чистит принты |
| [src/lib/supabase/server.ts](src/lib/supabase/server.ts) | Supabase client для SSR |
| [src/lib/supabase/client.ts](src/lib/supabase/client.ts) | Supabase client для browser |
| [src/lib/storage/upload-print.ts](src/lib/storage/upload-print.ts) | Аплоадер в `user-uploads/prints/...` |
| [src/lib/analytics/roistat.ts](src/lib/analytics/roistat.ts) | `getRoistatVisit()` cookie helper |
| [src/lib/queries/products.ts](src/lib/queries/products.ts) | `getAllProducts`, `getProductBySlug`, `getAllProductSlugs` |
| [src/lib/queries/blog.ts](src/lib/queries/blog.ts) | `getAllPosts`, `getPostBySlug` |
| [src/components/pages-components/shop-page/product-info/](src/components/pages-components/shop-page/product-info/) | **Новая правая панель на product page**: `product-info.tsx` (root) + `size-grid.tsx` (VariantB сетка с индикатором остатка) + `print-selector.tsx` (5 чипов + drop-zones) + `upload-slot.tsx` (drag-and-drop + a11y) + `print-config.ts` (общий `SIDES_FOR_LOCATION` + `PRINT_OPTIONS`) + `product-info.module.css` |
| [src/components/pages-components/category-page/category-page.tsx](src/components/pages-components/category-page/category-page.tsx) | Shared SEO-страница категории (futbolki/hudi/kepki/longslivy/svitshoty/shoppery). Принимает `ICategoryPageConfig` |
| [src/components/shared-components/3d-tee/tee-placeholder.tsx](src/components/shared-components/3d-tee/tee-placeholder.tsx) | Static fallback для асинхронно-грузящегося 3D Tee |
| [src/components/shared-components/lead-form/lead-form.tsx](src/components/shared-components/lead-form/lead-form.tsx) | Footer + popup-форма (принимает `source` prop) |
| [src/components/shared-components/noModelBlock/NoModelBlockForm.tsx](src/components/shared-components/noModelBlock/NoModelBlockForm.tsx) | Форма «не нашли модель» на /shop |
| [supabase/migrations/](supabase/migrations/) | SQL миграции (10 штук) |
| [supabase/functions/create-lead/index.ts](supabase/functions/create-lead/index.ts) | Edge Function (УДАЛЕНА — функционал перенесён в `src/hooks/` на Payload) |
| [supabase/functions/cleanup-user-uploads/index.ts](supabase/functions/cleanup-user-uploads/index.ts) | Edge Function-sweeper для bucket `user-uploads/prints/` |
| [src/hooks/notifyBitrix.ts](src/hooks/notifyBitrix.ts) | `afterChange` hook form-submissions → Bitrix24 CRM (POST `/crm.lead.add.json`). На success → `bitrixLeadId`, на failure → `bitrixError`. Handle 200-error envelope. Best-effort через `safeUpdateSubmission` |
| [src/hooks/notifyTelegram.ts](src/hooks/notifyTelegram.ts) | `afterChange` hook → Telegram Bot API `sendMessage`. Fire-and-forget, без write-back. Тихо warn'ит при failure |
| [src/hooks/rateLimitFormSubmissions.ts](src/hooks/rateLimitFormSubmissions.ts) | `beforeOperation` hook: 3/мин по SHA-256 hash IP. Throws `APIError(429)` при превышении. Инжектит `ipHash` + `userAgent` в submission |
| [src/lib/forms/get-form-by-slug.ts](src/lib/forms/get-form-by-slug.ts) | `getFormIdBySlug(slug)` — server-only resolver короткий-код → form ID через Payload local API + module-level cache |
| [src/lib/forms/submit-form.ts](src/lib/forms/submit-form.ts) | Frontend submit helper. POST `/api/form-submissions` с `{ form, submissionData }`. Throws `Error('rate-limit')` на 429 |
| [scripts/seed-forms.ts](scripts/seed-forms.ts) | Idempotent seed 5 Form-документов. Запуск: `npx tsx --env-file=.env.local scripts/seed-forms.ts` |
| [sentry.client.config.ts](sentry.client.config.ts) | Client-side Sentry init. Server+edge — в [instrumentation.ts](instrumentation.ts) |
| [src/middleware.ts](src/middleware.ts) | Next.js middleware — резолвит Redirects collection (308/307 по `to.type`) |
| [src/lib/sanitize-html.ts](src/lib/sanitize-html.ts) | **NEW (audit B6)** — DOMPurify whitelist sanitize для admin-rendered HTML (blog body + static pages). Applied в `lib/queries/blog.ts` + `lib/queries/static-pages.ts` |
| [src/lib/security/allowed-origins.ts](src/lib/security/allowed-origins.ts) | **NEW (audit B9)** — Helper для Origin-allowlist. Env: `ALLOWED_ORIGINS` (CSV) → fallback на статичный list + Vercel preview regex |
| [src/lib/security/rate-limit-memory.ts](src/lib/security/rate-limit-memory.ts) | **NEW (audit B4)** — In-memory rate-limit + `ipHashFromHeaders` (использует `x-vercel-forwarded-for` spoof-resistant). Применяется в orders/create endpoint |
| [src/lib/storage/upload-print.ts](src/lib/storage/upload-print.ts) | `uploadPrintFile()` + **NEW** `deletePrintFile()` (audit C8 pre-cart orphan cleanup, best-effort) |
| [src/components/shared-components/markup-script/markup-script.tsx](src/components/shared-components/markup-script/markup-script.tsx) | JSON-LD wrapper с `</script>` escape — обязателен для всех JSON-LD блоков (audit B8) |
| [src/components/pages-components/main-page/map-screen/map-component-lazy.tsx](src/components/pages-components/main-page/map-screen/map-component-lazy.tsx) | **NEW (audit B15)** — `next/dynamic({ssr:false})` обёртка для Yandex Maps. Используется в `map-screen.tsx` вместо прямого импорта |
| [public/Glitch2.webp](public/Glitch2.webp) | **3D Tee texture** (audit B13) — был `Glitch2.jpg` 6.3MB; пересжат через sharp в 2048×2048 webp q75 = 468KB (-93%). См. `src/components/shared-components/3d-tee/3d-tee.tsx:72` |
| [public/product-placeholder.svg](public/product-placeholder.svg) | **NEW (audit M3)** — Local placeholder для битых cdn.pnhd.ru images. Применяется в `product-card.tsx` + `product-photos.tsx` как final fallback |
| [tests/e2e/launch-smoke.spec.ts](tests/e2e/launch-smoke.spec.ts) | Playwright smoke (9 сценариев). Запуск: `AUDIT_BASE_URL=... npx playwright test tests/e2e/launch-smoke.spec.ts` |
| [tests/e2e/axe-scan.spec.ts](tests/e2e/axe-scan.spec.ts) | axe-core a11y scan на 5 страницах |
| [tests/e2e/mobile-screenshots.spec.ts](tests/e2e/mobile-screenshots.spec.ts) | Pixel 7 + iPhone 14 device emulation screenshots |
| [docs/superpowers/reports/launch-audit-2026-06-01/](docs/superpowers/reports/launch-audit-2026-06-01/) | Initial launch audit report (10 per-domain findings + README) |
| [docs/superpowers/reports/launch-audit-2026-06-01-rerun/](docs/superpowers/reports/launch-audit-2026-06-01-rerun/) | Re-audit after fix-deploy + before/after Lighthouse delta |
| [src/blocks/](src/blocks/) | **Wave 0.5** — 9 block types для HomePage Global: `HeroBlock`, `CategoryGridBlock`, `MethodsListBlock`, `StagesBlock`, `PricingTableBlock`, `AboutBlock`, `TestimonialsBlock`, `FAQBlock`, `CTABlock` |
| [src/globals/HomePage.ts](src/globals/HomePage.ts) | HomePage Global — `sections: blocks[]` (9 типов, 10 seeded). livePreview + VERSIONS_WITH_DRAFTS. Читается `getHomePage()` в `src/app/(storefront)/page.tsx` |
| [src/globals/CheckoutMessages.ts](src/globals/CheckoutMessages.ts) | CheckoutMessages Global — тексты на /checkout: demo-alert, ETA, кнопка «Оформить» |
| [src/collections/PrintTypeItems.ts](src/collections/PrintTypeItems.ts) | **Wave 0.4** — 19 items методов печати (slug=`parentSlug__typeSlug`, typeSlug для lookup). Замена TS-файла `method-options-data.ts` |
| [src/collections/PrintsPages.ts](src/collections/PrintsPages.ts) | 5 items для /prints страниц. Замена `prints-options-data.ts` |
| [src/collections/TextilePages.ts](src/collections/TextilePages.ts) | 4 items для /textile страниц. Замена `textile-options-data.ts` |
| [src/lib/queries/home-page.ts](src/lib/queries/home-page.ts) | `getHomePage()` — cache()-wrapped + draftMode-aware |
| [src/lib/queries/print-type-items.ts](src/lib/queries/print-type-items.ts) | `getPrintTypeItem(slug, typeSlug)`, `getPrintTypeItemsByParent(parentSlug)` |
| [src/lib/queries/prints-pages.ts](src/lib/queries/prints-pages.ts) | `getPrintsPage(slug)`, `getAllPrintsSlugs()` |
| [src/lib/queries/textile-pages.ts](src/lib/queries/textile-pages.ts) | `getTextilePage(slug)`, `getAllTextileSlugs()` |
| [src/components/pages-components/shop-page/product-info/trust-block.tsx](src/components/pages-components/shop-page/product-info/trust-block.tsx) | **Wave 1 P1.1** — Trust strip под CTA (4 MUI-иконки: factory/return/quality/shipping). CMS через `SiteSettings.trustItems` (max 4). Default: Производство СПб / Возврат 14 дней / Гарантия 40 стирок / Доставка по России |
| [scripts/seed-homepage.ts](scripts/seed-homepage.ts) | Idempotent seed 10 секций HomePage Global. `npx tsx --env-file=.env.local scripts/seed-homepage.ts` |
| [scripts/seed-trust-items.ts](scripts/seed-trust-items.ts) | Seed 4 trust items в SiteSettings.trustItems. Idempotent. |

### Удалено (после launch-audit'а 2026-06-01)

- `src/lib/supabase/admin-server.ts` — legacy service-role client (Payload Users заменил admin auth) — см. §15
- `public/Glitch2.jpg` 6.3MB → заменён на `Glitch2.webp` 468KB

### Удалено (после батча 2026-05-27)

- `src/app/shop/[slug]/constructor/` — папка
- `src/components/pages-components/constructor-page/` — папка (3dmockup, file-uploader, tabs, constructor-controls, gallery-selector, order-info)
- `src/components/pages-components/shop-page/product-description/` — заменена на `product-info/`
- `src/components/pages-components/shop-page/product-card-action-buttons/` — кнопка «добавить принт» больше не нужна, CTA в новой панели
- `src/components/shared-components/size-changer/` — заменён на локальный state в `product-info`
- `src/redux/constructor-slice/` — все поля `activeView`, `previewMode`, `isSelected`, `isImageLoading` больше не нужны
- `src/konva-stage/` — папка
- `src/app/utils/constructor-utils.ts` — `setCoords`, `getPrintFormatAndPriceFunc`, `fileSelect`, `photoProcessing`, `totalPrintPriceFunc`, `sideItemForPrint`
- `src/lib/queries/gallery.ts` — больше не используется
- `useUploadPrintImageMutation`, `useGetGalleryImagesQuery` из `src/api/api.ts`

---

## 11. Known issues / Roadmap

### 🟢 Сделано (батч 2026-05-27)
- [x] `<html lang="ru">` (был `"en"`)
- [x] sessionStorage в reducer'ах → listener middleware
- [x] 3D-конструктор удалён → simplified flow на product page
- [x] Lead-pipeline: Supabase table + Edge Function + Bitrix24 webhook (env-flag) + Telegram (env-flag)
- [x] Rate-limit на create-lead (3/мин по IP-хешу)
- [x] CORS allowlist на Edge Function
- [x] Cart-restore race fix через `isHydrated` flag
- [x] A11y: size-grid без nested-buttons, upload-slot с keyboard support
- [x] LeadForm: убрана demo-заглушка, реальная отправка, retry на error
- [x] Импорт реального каталога (25 товаров)
- [x] Bucket `user-uploads`: path-prefix RLS, drop SVG, MIME whitelist
- [x] Drop direct anon-insert RLS на `leads` (только Edge Function пишет)

### 🟢 Сделано (батч 2026-05-27, pre-launch hardening)
- [x] Leads retention 90 дней через pg_cron (`cleanup-old-leads`)
- [x] Orphan-GC: `IPrintFileRef.path` + listener middleware `cart-orphan-cleanup.ts`
- [x] Sweeper Edge Function `cleanup-user-uploads` + pg_cron вызов (14-day cutoff)
- [x] Image whitelist в `next.config.mjs` сужен до конкретного Supabase ref

### 🟢 Сделано (батч 2026-05-27, tech debt)
- [x] Three.js (`<Tee>`) — `next/dynamic({ssr:false})` + placeholder в main-screen + shop-lead-screen
- [x] 6 категорийных страниц → один `<CategoryPage>` + 6 локальных `config.tsx`
- [x] Active-link highlighting в admin sidebar (`usePathname` + `selected`)

### 🟢 Сделано (батч 2026-06-01, payload-plugins)
- [x] **plugin-redirects** уже подключён через PR #26 + `src/middleware.ts` consume коллекции Redirects (`from` → 308/307 в зависимости от `to.type`).
- [x] **plugin-import-export** подключён к `products`/`pages`/`leads` collections — Export/Import action'ы в админке. Exports + Imports auto-collections в группе `System`. Idempotent through-line: `overrideExportCollection` и `overrideImportCollection` возвращают новый объект (без in-place мутации).
- [x] **plugin-form-builder** — полная миграция lead-pipeline:
  - 5 seeded Form-документов через `scripts/seed-forms.ts` (footer-lead, popup-lead, shop-no-model, product-page, methods-consultation). Idempotent по `title`.
  - `getFormIdBySlug` helper (`src/lib/forms/get-form-by-slug.ts`) — server-only + module-level cache.
  - Submissions в `form-submissions` collection.
  - Hooks восстановлены как Payload-hooks вместо удалённой Edge Function `create-lead`:
    - `rateLimitFormSubmissions` (beforeOperation): 3/мин по `ipHash` (SHA-256), 7 unit-тестов.
    - `notifyBitrix` (afterChange): POST в Bitrix24 CRM, на успех пишет `bitrixLeadId`, на ошибку `bitrixError`. Handle 200-error envelope (Bitrix возвращает `{error, error_description}` с HTTP 200 при invalid token). Best-effort: `safeUpdateSubmission` wrapper гарантирует что DB-write failure не throw'ит из hook'а. 8 тестов.
    - `notifyTelegram` (afterChange): fire-and-forget Bot API, без write-back. 5 тестов.
  - Frontend (LeadForm + NoModelBlockForm) переключены на `POST /api/form-submissions` через `submitForm` helper. `formId` резолвится server-side в RSC layouts (`(storefront)/layout.tsx` + `shop/page.tsx`) с soft-fail на missing seed.
  - `createLead` мутация, `ICreateLeadPayload`, `ILeadAttachment` удалены из `src/api/api.ts`.
  - Legacy `Leads` collection: `access.create: false`, group `Legacy` — read-only архив исторических записей.
- [x] **plugin-sentry** подключён + `sentry.client.config.ts` для browser runtime. Server+edge уже инитились через `instrumentation.ts`. `withSentryConfig` обёртка в `next.config.mjs`. Без DSN — full no-op.

### 🟢 Закрыто launch-audit'ом 2026-06-01 (PR #33-#38 + hotfix)

**16 🔴 blockers + 33 🟡 warnings закрыто.** Полная сводка: [docs/superpowers/reports/launch-audit-2026-06-01/](docs/superpowers/reports/launch-audit-2026-06-01/) + rerun [./launch-audit-2026-06-01-rerun/](docs/superpowers/reports/launch-audit-2026-06-01-rerun/).

Ключевые изменения:
- ✅ **Lead capture работает** — POST /api/form-submissions = 201 (Payload form-builder migration applied + 5 forms seeded)
- ✅ **XSS закрыт** — DOMPurify через `src/lib/sanitize-html.ts` применён на blog + static pages; JSON-LD через `MarkupScript` helper
- ✅ **Orders endpoint защищён** — Origin allowlist + in-memory rate-limit + transaction wrapper (`src/lib/security/allowed-origins.ts` + `rate-limit-memory.ts`)
- ✅ **Rate-limit hardened** — `rateLimitFormSubmissions` использует `x-vercel-forwarded-for` (spoof-resistant)
- ✅ **AbortController** на `notifyBitrix` + `notifyTelegram` (5s timeout) — никакого больше 60s блока на submission
- ✅ **`is_admin()` function + `admin_users` table dropped** через `drop_admin_auth` migration — legacy Supabase admin удалён полностью
- ✅ **rate_limit_log table dropped** + cron-job — legacy от удалённой Edge Function
- ✅ **3D Tee mobile LCP fix** — Glitch2.jpg 6.3MB → Glitch2.webp 468KB (sharp 2048×2048, q75); eager preload убран → LCP home mobile 20.6s→10.5s (-49%), TBT 24s→3.7s (-85%)
- ✅ **Yandex Maps** dynamic-import через `map-component-lazy.tsx`
- ✅ **Fonts** `font-display: optional` (closes CLS 0.71 → 0)
- ✅ **OG-images compressed** — 813KB+653KB+451KB → 125KB+99KB+51KB через sharp
- ✅ **CSP enforce** (был Report-Only) + HSTS + `unsafe-eval` убран + `object-src 'none'`
- ✅ **Storage buckets**: SVG MIME убран из gallery-images + payload-media; marketing role убрана из Media write
- ✅ **A11y**: ContactsWidget aria-label, header logo aria-label, контраст #9a9a9a/#8a8a8a → #595959, cookie Escape + role=region
- ✅ **SEO**: 6 категорий полная metadata (canonical/OG/Twitter), /admin X-Robots-Tag, /prints + /textile noindex+drop sitemap, /shop metadataBase fix, SITE_INFO.domain env-driven
- ✅ **CSRF whitelist** Vercel-aliases (fallback расширен + готов под `ALLOWED_ORIGINS` env)
- ✅ **DB**: `prices.amount` + `variants.stock_qty` CHECK >=0; `leads_source_idx` dropped
- ✅ **Sentry**: 400/403/404/429 убраны из captureErrors (DoS quota burn fix)
- ✅ **Validate-stored-cart** теперь требует `item.sizes[]` shape — defensive against malformed sessionStorage

### 🟢 Сделано (Wave 0, PR #39-#42, 2026-06-02)

- [x] **0.1** SiteSettings + Navigation + CookieBar globals (livePreview, drafts/autosave, PREVIEW_SECRET, shared-config.ts)
- [x] **0.1.5** SEO/JSON-LD migration — 44 refs → cache()-wrapped async factories; `build-metadata.ts`; `resolveDomain()`
- [x] **0.2** Static pages /loyalty /howto /size_chart — CMS-editable copy arrays через Pages collection
- [x] **0.3** Categories collection — h1, intro, seoText, bannerImage, faqItems marketing fields
- [x] **0.4** PrintTypeItems (19 items) + PrintsPages (5) + TextilePages (4) collections + seeds (замена TS-data файлов)
- [x] **0.5** HomePage Global — 9 block types, 10 sections seeded; весь контент главной в Payload admin
- [x] **0.6** CheckoutMessages Global — тексты checkout CMS-editable

### 🟢 Сделано (Wave 1, PR #43, 2026-06-02)

- [x] **P1.1 Trust-block на PDP** — горизонтальная полоса с 4 MUI-иконками под CTA (factory/return/quality/shipping). CMS через `SiteSettings.trustItems` (max 4). Default: Производство СПб / Возврат 14 дней / Гарантия 40 стирок / Доставка по России
- [x] **P1.2 Badges на product-card** — поле `badge` (none/hot/new/sale/order) + `salePercent` (5/10/20/30/50, виден только при badge=sale) на Payload Products sidebar. Chip overlay absolute top-left, 4 цвета.
- ~~P1.3 Stock-urgency~~ — **dropped** (не нужно)

### 🟡 Известные косяки (open после audit'а)

| Severity | Issue | Где |
|---|---|---|
| Low | **Vercel Hobby DDoS Mitigation** — audit-traffic мог разогнать heuristic. Если начнут появляться challenge-страницы: (1) Upgrade Vercel Pro $20/mo, (2) cutover на custom domain. | Vercel project settings |
| Low | `futbolka-oversize-chernaya-man` имеет только 1 фото в галерее (на оригинале studio.pnhd.ru тоже одно). Остальные 24 товара — 2-5 фото. | `product_gallery_photos` |
| Low | RTK Query baseUrl всё ещё `''` (relative). `createOrder` идёт через `queryFn` на Payload `/api/orders/create`. CDEK + promocodes endpoints мёртвые (referenced в RTK Query но pnhdstudioapi.ru = 502). Очистить когда CDEK заменим. | [src/api/api.ts](src/api/api.ts) |
| Low | Distributed rate-limit (form-submissions + orders) пока in-memory per Vercel-instance. На Pro/Enterprise — миграция на Upstash/Redis. | C5/C6 в audit |
| Low | CSP `unsafe-inline` остаётся (для inline styles + tracker scripts) — nonce-based refactor требует переписать MUI sx + tracker bootstrap. | next.config.mjs |
| Low | Cookie banner не имеет full focus-trap (только Escape + role=region) — нужен Dialog refactor для WCAG 2.1 AA strict. | cookie-bar.tsx |
| Low | `dangerouslySetInnerHTML` в methods/textile/prints — это static TS-data (доверенный источник, не из БД), не XSS-vector. Если в будущем поле станет user-editable — DOMPurify обязателен. | various |

### 🟠 Большие куски (требуют решения)

- **CDEK + платёжный шлюз**: `/api/orders/create` уже принимает orders (auth + transaction wrapped, audit B4/B5), но `paymentUrl: null` возвращается — нужны Edge Functions `cdek-cities`, `cdek-points`, `cdek-calculate` + интеграция с YooKassa/Robokassa.
- **Bitrix24 access**: Payload hook `notifyBitrix` готов, ждёт URL webhook'а от заказчика. Когда появится — выставить `BITRIX_WEBHOOK_URL` в Vercel env. На текущем prod env var пустой → no-op (verified).
- **Vercel plan upgrade**: Hobby → Pro для (1) отключить DDoS challenge, (2) IP bypass rules, (3) custom domain SSL.
- **Custom domain**: cutover на свой production domain (studio.pnhd.ru или новый). После этого выставить `NEXT_PUBLIC_SITE_URL` env var → SITE_INFO.domain auto-pick'ит → все canonical URLs become correct.
- **CDN refresh для product images**: 15 битых slug'ов на cdn.pnhd.ru — нужны исходники → upload в Supabase `product-images` bucket.

---

## 12. Dev workflow

### Локальный запуск

```bash
npm install
cp .env.example .env.local       # заполни значения из Supabase Dashboard
npm run dev                       # http://localhost:3000
```

### Переменные окружения (Next.js)

```
NEXT_PUBLIC_SUPABASE_URL=https://almfjmiygtnzngkayhdv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<берётся из Supabase Dashboard → Settings → API → publishable/anon key>
```

Для Edge Functions секреты выставляются в Supabase Dashboard → Edge Functions → Secrets (не в Next.js env):
- `CLEANUP_SECRET` — для `cleanup-user-uploads` (тот же hex продублирован в `vault.secrets` под именем `edge_function_cleanup_secret`)

Для Payload-hooks (батч 2026-06-01, form-builder) переменные живут в Vercel env (Production/Preview/Development), читаются server-side через `process.env`:
- `BITRIX_WEBHOOK_URL` — `notifyBitrix` hook. Формат `https://<portal>.bitrix24.ru/rest/<user>/<token>/`. Если пуст — hook no-op.
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — `notifyTelegram` hook. Если хотя бы один пуст — no-op.

Для Sentry — обе переменные нужны (server + client):
```
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
NEXT_PUBLIC_SENTRY_DSN=<тот же DSN>
```
Без DSN — Sentry no-op'ит везде (`instrumentation.ts` и `sentry.client.config.ts` оба проверяют наличие DSN перед `Sentry.init`).

### Добавить новый товар

Вариант А — через Supabase Studio (UI):
1. Открой проект в Supabase Dashboard
2. Table Editor → `products` → Insert row (slug уникален)
3. `product_sizes` → размеры (qty=0 если sold out)
4. `product_gallery_photos` → фото
5. Сайт подхватит при следующем билде (slug page → SSG)

Вариант Б — миграцией:
1. Добавь `supabase/migrations/00X_new_products.sql`
2. Применить через MCP `apply_migration` или `supabase db push`

### Bulk-edit / экспорт каталога

Через плагин `@payloadcms/plugin-import-export` (зарегистрирован для `products`, `pages`, `leads`):

1. Payload admin → Products → action **Export** → CSV.
2. Правка в Excel (массовое изменение цен, переименование, etc.).
3. Action **Import** → загрузить отредактированный CSV.

Идентификация строк — по `id`. **Если удалить колонку `id` или строку из CSV — плагин может попытаться создать дубликаты или пропустить апдейт.** Перед массовым импортом всегда делай предварительный export как backup.

Экспортированные CSV хранятся в служебной коллекции `Exports` (группа `System` в админке) и в S3 bucket — оттуда же скачиваются. Доступ управляется через access control коллекции `exports`, не через access на исходную коллекцию.

---

## 13. Deployment

**Vercel**:
- Project: `pnhd-studio-clone` (team `margolinilya-creates-projects`, id `team_gg2ut4vzpiq8w8GICbmxzlTG`)
- Project id: `prj_Jf5p3M82GCpUEEXuZnyNuEo3vHZK`
- Production alias: `pnhd-studio-clone-margolinilya-creates-projects.vercel.app`
- Branch alias: `pnhd-studio-clone-git-main-margolinilya-creates-projects.vercel.app`
- Auto-deploy с `main`. Preview-деплои на каждый PR.
- Anti-bot: иногда срабатывает «Vercel Security Checkpoint» на серверные curl-IP (DDoS-защита). Браузеров не касается.

**Env vars в Vercel** (Production + Preview):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URI` (Supabase transaction pooler — Payload)
- `PAYLOAD_SECRET`
- `S3_*` (Supabase Storage credentials для Payload `media` collection)
- `BITRIX_WEBHOOK_URL` (опционально — для `notifyBitrix` hook; пуст → no-op)
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (опционально — для `notifyTelegram` hook; обе нужны)
- `SENTRY_DSN` — server-side + edge runtime (instrumentation.ts)
- `NEXT_PUBLIC_SENTRY_DSN` — client-side runtime (sentry.client.config.ts). **Нужно ставить обе переменные с одним и тем же DSN** — server и client читают разные env namespace'ы (client не видит non-public). Если выставить только `SENTRY_DSN` — browser-ошибки не дойдут до Sentry.

`next.config.mjs` whitelistит image-хосты: `cdn.pnhd.ru`, `pnhdstudioapi.ru` (legacy, сейчас 502), `almfjmiygtnzngkayhdv.supabase.co`, `placehold.co`.

### Release checklist (когда мёржишь Payload-фичу с миграциями)

Обязательный порядок. Если задеплоить раньше чем применить миграции — submission endpoint вернёт 500 на каждый запрос пока column missing.

1. **Применить Payload миграции против prod БД**. Локально с production `DATABASE_URI` в `.env.local`:
   ```bash
   npm run payload migrate
   ```
   Альтернатива: пройтись по `src/migrations/<timestamp>_<name>.ts` файлам и применить SQL через Supabase Dashboard → SQL Editor.

2. **Выставить новые Vercel env vars** (если фича их вводит). Например для form-builder батча 2026-06-01 — `BITRIX_WEBHOOK_URL`, `TELEGRAM_*`, `SENTRY_*`.

3. **Смёрджить PR в `main`** → Vercel auto-deploy → дождаться `Ready`.

4. **Запустить seed-скрипты** (если фича их вводит). Для form-builder:
   ```bash
   npx tsx --env-file=.env.production scripts/seed-forms.ts
   ```
   Idempotent — повторный запуск пропускает уже созданные.

5. **Smoke-test**: footer-форма → submit → Payload admin `Form Submissions` → запись присутствует с заполненным `ipHash`. Если `BITRIX_WEBHOOK_URL` выставлен — через ~1 сек должен появиться `bitrixLeadId` или `bitrixError`.

Шаги 1 и 4 — блокирующие для lead capture. Без шага 1 form-submission endpoint падает с 500. Без шага 4 — `(storefront)/layout.tsx` soft-fail отдаёт `formId=''` → submit падает с 400 на API → юзер видит ошибку.

---

## 14. Conventions

- **Импорты**: `@/*` → `src/*` (см. [tsconfig.json](tsconfig.json))
- **Расположение компонентов**:
  - `src/app/...` — только `page.tsx`, `layout.tsx`, `*.module.css/scss`. Бизнес-логика вынесена.
  - `src/components/pages-components/<page>/<feature>/` — компоненты, специфичные для страницы
  - `src/components/shared-components/<feature>/` — переиспользуемые
- **Стилизация**: CSS Modules (предпочтительно) + MUI `sx` для MUI-компонентов. Не плодить SCSS — миграция на CSS Modules.
- **Локализация**: RU only. Все строки в JSX — на русском. Если EN — i18n через `next-intl` отдельным этапом.
- **TypeScript**: `strict: true`. `supabase/functions` исключены из tsconfig (Deno runtime). Не добавляй новые `any`, не используй `@ts-ignore` без `// TODO:` комментария.
- **TODO-маркеры**:
  - `// TODO(supabase-migration):` — для фич, ждущих перевода на Supabase
  - `// TODO(audit):` — для аудит-фиксов
- **Cart actions**: всегда через `actions as cartActions` импорт. Никогда не вызывай `sessionStorage` напрямую в reducer'ах — middleware всё сделает.
- **Лиды**: используй `LeadSource` enum из `@/api/api`. Не пиши `source: 'something'` строкой — Edge Function rejects невалидный source с 400.

---

## 15. Admin panel — **REPLACED by Payload admin** (2026-06-01)

> **⚠️ Этот раздел описывает legacy Supabase-based админку, которая удалена в audit-fix батчах (PR #34, #38).**
>
> **Что сейчас:** админка работает через Payload CMS на `/admin` (Payload routes). Auth = Payload Users collection + cookie session. Свежий admin создаётся через `scripts/seed-admin-user.ts`.
>
> **Что удалено:**
> - `public.admin_users` table — `DROP TABLE` через migration `20260529000002_drop_admin_auth.sql` (applied 2026-06-01)
> - `public.is_admin()` function — `DROP FUNCTION` (был callable by anon → security issue, см. audit B11)
> - 11 admin-write RLS policies на public.*/storage.objects — dropped
> - `src/lib/supabase/admin-server.ts` — file removed
> - Legacy `/admin/login` route + `safeNextPath` + `requireAdmin()` — removed (Payload routes теперь обрабатывают `/admin`)
>
> Если в коде где-то ещё видишь `requireAdmin`, `admin-server.ts`, `safeNextPath`, `is_admin()` — это устаревшие референсы, нужно удалить.

### Legacy ниже (для архива)

Внутренний кабинет на `/admin/*` — CRUD товаров, блога, галереи + просмотр лидов. **Смержен в main** через [PR #1](https://github.com/margolinilya-create/pnhd-studio-clone/pull/1) (42 коммита) и работает на production: **https://pnhd-studio-clone.vercel.app/admin/login**.

### Документы

| Документ | Назначение |
|---|---|
| [docs/superpowers/specs/2026-05-27-admin-panel-design.md](docs/superpowers/specs/2026-05-27-admin-panel-design.md) | Design spec — scope, tech-decisions, UI, security |
| [docs/superpowers/plans/2026-05-27-admin-foundation.md](docs/superpowers/plans/2026-05-27-admin-foundation.md) | Plan 1 — Foundation ✅ |
| [docs/superpowers/plans/2026-05-27-admin-products-module.md](docs/superpowers/plans/2026-05-27-admin-products-module.md) | Plan 2 — Products module ✅ |
| [docs/superpowers/plans/2026-05-28-admin-blog-gallery-leads.md](docs/superpowers/plans/2026-05-28-admin-blog-gallery-leads.md) | Plan 3 — Blog + Gallery + Leads ✅ |
| [docs/superpowers/notes/2026-05-27-admin-bootstrap.md](docs/superpowers/notes/2026-05-27-admin-bootstrap.md) | Bootstrap нового админа |

### Маршруты

```
/admin/login              форма входа (без shell)
/admin                    dashboard со счётчиками
/admin/products           list (MUI Table)
/admin/products/new       форма создания
/admin/products/[slug]    форма редактирования (6 табов)
/admin/blog               list блог-постов
/admin/blog/new
/admin/blog/[slug]        форма + Tiptap WYSIWYG
/admin/gallery            drop-zone + drag-reorder + alt-dialog
/admin/leads              read-only + status workflow
```

### Что работает

**Auth и shell**:
- `signInWithPassword` + allowlist `admin_users` + защита от open-redirect через `safeNextPath`
- AdminShell с sidebar + email в шапке + logout
- Route group `(authed)` изолирует страницы с shell от `/admin/login`
- Тройная защита: middleware → `requireAdmin()` → RLS на write-таблицах
- Root layout читает `x-pathname` header (выставляется middleware) → не рендерит публичный header/footer на admin-роутах

**Products** (`/admin/products`):
- Список 25 товаров (MUI Table — DataGrid v7 не работает в связке, см. caveats)
- Форма с 6 табами: **Основное · Размеры · Фото · Конструктор · SEO · Друзья**
- Drag-drop upload в Supabase Storage `product-images` через `sharp` (resize 2000px + webp 85%)
- Drag-reorder галереи; multi-select связанных товаров с server-search
- Atomic save через Server Action: zod-валидация → upsert → `syncChildren(sizes)` → `syncChildren(photos)` → `syncLinks` → `revalidatePath('/shop', '/shop/[slug]')`
- Дублирование + удаление

**Blog** (`/admin/blog`):
- Список постов с обложкой / автором / хэштегами / датой
- Tiptap WYSIWYG: `B I U S | H2 H3 | lists | link image quote | undo redo` + inline-uploads картинок в `blog-images`
- `savePost` Server Action санитайзит `body_html` через **isomorphic-dompurify** (whitelist `<p><h2><h3><strong><em><u><s><ul><ol><li><a><img><blockquote><br>` + `href src alt title target rel`)
- Снят `dynamicParams: false` на публичном `/blog/[post]` — новые посты появляются без redeploy через `revalidatePath`

**Gallery** (`/admin/gallery`):
- Drop-zone (multi-file) → upload в `gallery-images`
- Drag-reorder сетки с bulk-update `sort_order`
- Dialog для edit `alt`, delete с очисткой Storage (best-effort)

**Leads** (`/admin/leads`):
- Список с фильтром по статусу (`Все / Новые / В работе / Готовые / Спам`)
- Workflow `new → contacted → done/spam` через контекстные кнопки в строке
- tel/mailto-ссылки на phone/email
- RLS уже разрешает admin select+update на leads (миграция 6)

### Migrations и Storage

Миграции **5–8** в `supabase/migrations/`:
- `admin_users` table + `is_admin()` SQL function
- Admin write-policies на products, product_sizes, product_gallery_photos, product_links, blog_posts, gallery_images, leads
- Storage buckets `product-images` (10 MB), `blog-images` (5 MB), `gallery-images` (5 MB, +svg) — все public-read, admin-write
- `products.meta_title`, `products.meta_description`, `leads.status`

### Supabase clients (новая структура)

Существующие [src/lib/supabase/server.ts](src/lib/supabase/server.ts) и [client.ts](src/lib/supabase/client.ts) **не изменены** (на них сидят /shop, /blog, RTK Query). Для admin-flow добавлены параллельные клиенты:
- [src/lib/supabase/auth-server.ts](src/lib/supabase/auth-server.ts) — cookies-session anon, для admin server components
- [src/lib/supabase/auth-browser.ts](src/lib/supabase/auth-browser.ts) — cookies-session anon, для login/logout form
- [src/lib/supabase/middleware-client.ts](src/lib/supabase/middleware-client.ts) — для `middleware.ts`
- [src/lib/supabase/admin-server.ts](src/lib/supabase/admin-server.ts) — **service_role** (`'server-only'`, обходит RLS, только в Server Actions после `requireAdmin()`)

Edge middleware [src/middleware.ts](src/middleware.ts) защищает `/admin/:path*` и заодно выставляет `x-pathname` header чтобы root-layout мог скрыть публичный chrome на admin-роутах.

### Новые deps

| Пакет | Зачем |
|---|---|
| `@supabase/ssr` | Cookies-session в App Router |
| `@mui/x-data-grid` | Установлен, **не используется** (см. caveats) |
| `@mui/icons-material` | Иконки в DataGrid actions / Tiptap toolbar |
| `react-hook-form` + `@hookform/resolvers` | Формы продукта/блога |
| `zod` | Schema-валидация в Server Actions |
| `isomorphic-dompurify` | Sanitize blog `body_html` |
| `@tiptap/{react,pm,starter-kit,extension-link,extension-image}` | Blog WYSIWYG |

Также **Next.js поднят 14.1.0 → 14.2.35** — в 14.1 был dev-mode webpack bug с пропадающими vendor chunks на nested server components в route groups. Заодно закрыли [CVE GHSA-fr5h-rqp8-mj6g](https://github.com/advisories/GHSA-fr5h-rqp8-mj6g) (SSRF в Image Optimization).

### Env

Server-only ключ (никогда не префиксовать `NEXT_PUBLIC_`):
```
SUPABASE_SERVICE_ROLE_KEY=<из Supabase Dashboard → Project Settings → API → service_role>
```
**Уже выставлен** на Vercel (Production + Preview + Development) и в локальном `.env.local`.

### Bootstrap

Первый админ (`mib@pnhd.ru`) уже в `admin_users`. Новые добавляются по [docs/superpowers/notes/2026-05-27-admin-bootstrap.md](docs/superpowers/notes/2026-05-27-admin-bootstrap.md): Supabase Dashboard → Auth → Add user → скопировать UID → `insert into admin_users` через SQL Editor или MCP.

### Известные баги/caveats

- **MUI v7 + Next.js 14 RSC**: большинство MUI-компонентов требуют `'use client'`. Сервер-компонент не может прямо импортить `Box/Button/Grid` из `@mui/material` — будет `unstable_createUseMediaQuery is not a function` при build. Pattern: server-page тянет данные → client-wrapper рендерит MUI.
- **DataGrid v7** в этой связке рендерится пустым (props доходят, но header/rows не видны). Для всех list-страниц используем `<Table>` из `@mui/material` — для 25 товаров / 3 постов / 0 заявок этого с запасом. Если объём вырастет > 200 строк — копать DataGrid или переходить на TanStack Table.
- **Image URLs** у импортированных 25 товаров ссылаются на `cdn.pnhd.ru` — там не отдаётся. Реальные фото нужно перезалить через таб «Фото» в каждом товаре (или batch-импорт переписать).
- **`stock` enum**: импорт принёс legacy значения `studio` / `supplier` из pnhd.ru; добавлены в zod-схему рядом с нормализованными `in_stock/limited/out_of_stock` — новые товары лучше создавать на нормализованных.

### Что осталось (необязательно, инкрементально)

- Перезалить мёртвые `cdn.pnhd.ru` фото на 25 товарах через admin-форму
- Vitest для unit-тестов `syncChildren`/`syncLinks`/`requireAdmin`
- E2E через Playwright (логин → создать товар → проверить /shop)
- 2FA через Supabase MFA

---

## 16. Tooling reference

- **MCP инструменты**:
  - Supabase MCP — `list_projects`, `list_tables`, `apply_migration`, `execute_sql`, `deploy_edge_function`, `get_logs`
  - Vercel MCP — `list_deployments`, `get_deployment`, `get_deployment_build_logs`
- **CLI**: `supabase` (`/opt/homebrew/bin/supabase`) — резервный путь, обычно используем MCP.
- **Скрейп оригинала**: если нужно повторить — `/tmp/scrape.py` + `/tmp/extract-all.py` + `/tmp/build-import.py` (черновики). Принцип: декод `self.__next_f.push([1,"..."])` чанков → RSC stream parse → resolve `$N` refs → выгрести объекты по полям-маркерам (`slug + price + image_url`).
