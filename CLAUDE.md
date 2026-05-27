# CLAUDE.md — Контекст проекта pnhd-studio-clone

Этот файл — единый источник правды для будущих ИИ-сессий. Если ты — Claude или другой агент, начни отсюда.

> **Last full update:** 2026-05-27 после батча «tech-debt frontend — 3D dynamic-import + CategoryPage refactor + admin active-link».
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
| Framework | Next.js (App Router) | 14.1.0 |
| Runtime | React | 18 |
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

`image_url` и `product_gallery_photos.url` указывают на `https://cdn.pnhd.ru/<slug>_<n>.jpg`. Половина (10/25) реально открывается на CDN, остальные 15 (шопперы, кепки, kids-футболки) отдают 404 — это data-quality самого оригинала. Варианты исправления:
- Залить файлы в наш Supabase Storage bucket `product-images` (нужны исходники)
- Подставить placeholder через Next/Image fallback
- Сейчас: оставлено как есть

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
| [supabase/functions/create-lead/index.ts](supabase/functions/create-lead/index.ts) | Edge Function |
| [supabase/functions/cleanup-user-uploads/index.ts](supabase/functions/cleanup-user-uploads/index.ts) | Edge Function-sweeper для bucket `user-uploads/prints/` |

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

### 🟡 Известные косяки (open)

| Severity | Issue | Где |
|---|---|---|
| Low | 15/25 товаров с битым `image_url` на cdn.pnhd.ru — нужны исходники для заливки в `product-images` bucket. | `products.image_url` |
| Low | `dangerouslySetInnerHTML` × 6 без санитизации (методы, текстиль, принты, блог). | various |
| Low | Next.js 14.1.0 — CVE GHSA-fr5h-rqp8-mj6g (SSRF в Image Optimization), нужно ≥14.2. | `package.json` |
| Low | RTK Query baseUrl всё ещё `https://pnhdstudioapi.ru` (мёртвый) — `createLead` обходит через `queryFn`, остальные эндпоинты (orders, CDEK, promocodes) пока бьются в пустоту. Когда подключим — поменять baseUrl или вынести в queryFn. | [src/api/api.ts](src/api/api.ts) |

### 🟠 Большие куски (требуют решения)

- **CDEK + платёжный шлюз**: чекаут сейчас demo-alert. Нужны Edge Functions `cdek-cities`, `cdek-points`, `cdek-calculate`, `create-order` + интеграция с YooKassa/Robokassa.
- **Bitrix24 access**: Edge Function готова, ждёт URL webhook'а от заказчика. Когда появится — выставить `BITRIX_WEBHOOK_URL` в Supabase secrets.
- **Тесты + CI**: 0 тестов на repo, нет GitHub Actions. Если идём в продакшен — нужны хотя бы typecheck+build на PR. Vitest target: cart-slice + restore validation + Edge Function валидаторы.
- **Sentry**: production-ошибки никуда не пишутся.
- **Tracking IDs**: Roistat/Metrica/uiscom стоят с оригинальными ID. Если клиент новый — заменить.

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
- `BITRIX_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ALLOWED_ORIGINS` — для `create-lead`
- `CLEANUP_SECRET` — для `cleanup-user-uploads` (тот же hex продублирован в `vault.secrets` под именем `edge_function_cleanup_secret`)

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

`next.config.mjs` whitelistит image-хосты: `cdn.pnhd.ru`, `pnhdstudioapi.ru` (legacy, сейчас 502), `almfjmiygtnzngkayhdv.supabase.co`, `placehold.co`.

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

## 15. Admin panel (shipped — в production)

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
