# CLAUDE.md — Контекст проекта pnhd-studio-clone

Этот файл — единый источник правды для будущих ИИ-сессий. Если ты — Claude или другой агент, начни отсюда.

---

## 1. Project overview

**Что это**: клон production-сайта [studio.pnhd.ru](https://studio.pnhd.ru) — e-commerce + онлайн-конструктор мерча (печать на одежде в Санкт-Петербурге). RU-only.

**Что отрисовывается на сайте**:
- Лендинг с методами печати, ценами, FAQ, формой заявки
- Каталог товаров (футболки, худи, лонгсливы, свитшоты, кепки, шопперы)
- Карточка товара
- Онлайн-конструктор: 3D-мокап + загрузка/перемещение принта + 2D Konva-редактор (legacy)
- Чекаут с интеграцией CDEK и платёжным шлюзом
- Блог
- Программа лояльности (пока landing без логики)
- Юридические страницы (oferta, privacy)

**Этот репозиторий — клон**:
- GitHub: `margolinilya-create/pnhd-studio-clone` (private)
- Vercel: `pnhd-studio-clone` (team `margolinilya-creates-projects`)
- Supabase: project `pnhd-studio-clone` в `eu-central-1`
- Production оригинала: `studio.pnhd.ru` — нам недоступен, бэкенд `pnhdstudioapi.ru` не наш
- Цель клона: работающий каталог + блог на собственной инфре; конструктор/чекаут/лиды — следующими итерациями

---

## 2. Stack

| Слой | Технология | Версия |
|---|---|---|
| Framework | Next.js (App Router) | 14.1.0 |
| Runtime | React | 18 |
| Язык | TypeScript (strict) | 5 |
| Стиль | CSS Modules + MUI v7 `sx` + Emotion + немного inline | — |
| State | Redux Toolkit + RTK Query | 2.x |
| UI-kit | @mui/material | 7.3.1 |
| 3D | Three.js + @react-three/fiber + @react-three/drei | 0.164 / 8.16 / 9.105 |
| 2D editor | Konva + react-konva (sub-package) | 9.3 / 18.2 |
| Видео-запись | @ffmpeg/ffmpeg + core (wasm) | 0.12 |
| Telefon input | mui-tel-input | 9 |
| Карты | @pbe/react-yandex-maps | 1.2 |
| Image opt | sharp | 0.33 |
| Backend (новый) | Supabase (Postgres + Storage + Edge Functions) | — |
| Хостинг | Vercel | — |

ESLint правила `@next/next/no-img-element`, `react-hooks/exhaustive-deps`, `react/no-unescaped-entities` — **отключены** (см. `.eslintrc.json`). Это исторический долг.

---

## 3. Routing map

Источники данных в новом клоне:

| Path | Тип | Источник данных | Статус в клоне |
|---|---|---|---|
| `/` | SSR | static + jsonLd markups | ✅ работает |
| `/shop` | SSR | Supabase `products` | ✅ работает |
| `/shop/[slug]` | SSG (`generateStaticParams`) | Supabase `products` by slug | ✅ работает |
| `/shop/[slug]/constructor` | CSR | (deferred — UI работает, save/upload disabled) | ⚠️ demo-режим |
| `/blog` | SSR | Supabase `blog_posts` | ✅ работает |
| `/blog/[post]` | SSG (`generateStaticParams`) + `dynamicParams=false` | Supabase `blog_posts` by slug | ✅ работает |
| `/cart` | CSR | Redux + sessionStorage | ✅ работает |
| `/checkout` | CSR | RTK Query → CDEK/orders | ⚠️ disabled (нет CDEK, нет шлюза) |
| `/thanks` | CSR | — | ✅ работает |
| `/contacts`, `/oferta`, `/privacy`, `/size_chart`, `/howto`, `/loyalty` | SSR | статика | ✅ работает |
| `/methods/[slug]`, `/methods/[slug]/[type]` | SSR | локальные TS-данные (`method-options-data.ts`) | ✅ работает |
| `/prints/[slug]`, `/textile/[slug]` | SSR | локальные TS-данные | ✅ работает |
| `/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery` | SSR | статика + jsonLd | ✅ работает (95% копипаст-страницы — кандидат на рефакторинг) |

`dynamicParams=false` на `/blog/[post]` — критично: после деплоя новые посты не появятся без билда. Это в TODO.

---

## 4. State management

Redux store: [src/redux/store.ts](src/redux/store.ts)

| Slice | Что хранит |
|---|---|
| `utils` | UI-флаги, popup'ы |
| `printConstructor` | activeView, previewMode, isSelected, isImageLoading |
| `cart` | `order: ICartOrderElement[]`, validPromoCode, delivery, customer data |
| `leads` | имя/телефон/email/agreement (поля lead-формы) |
| `api` | RTK Query reducer (для CDEK/upload/order/lead/gallery/promocode) |

**Известная техническая проблема**: cart-slice ([src/redux/cart-slice/cart.slice.ts:80,84,94](src/redux/cart-slice/cart.slice.ts#L80)) пишет в `sessionStorage` прямо из reducer'ов. Нарушает чистоту reducer'ов и сломает SSR в любом импорте, выполняющемся на сервере. Должно быть вынесено в listener middleware. См. секцию Known issues.

---

## 5. API contract (было → стало)

Оригинал жил на `https://pnhdstudioapi.ru`. В клоне:

| Endpoint в оригинале | Метод | Что делает | Статус в клоне |
|---|---|---|---|
| `/api/products` | GET | каталог | ✅ → Supabase `products` table (через `lib/queries/products.ts`) |
| `/api/blog` | GET | посты блога | ✅ → Supabase `blog_posts` table (через `lib/queries/blog.ts`) |
| `/api/gallery/` | GET | галерея готовых принтов для конструктора | ✅ → Supabase `gallery_images` table |
| `/api/uploads/` | POST FormData | загрузка пользовательского принта | ❌ TODO — нужен Supabase Storage bucket `user-uploads` |
| `/api/shipping/cities` | GET | автокомплит CDEK городов | ❌ TODO — нужна Edge Function-proxy |
| `/api/shipping/points` | GET | пункты выдачи CDEK | ❌ TODO — Edge Function |
| `/api/shipping/calculate/` | POST | расчёт доставки | ❌ TODO — Edge Function |
| `/api/orders` | POST | создание заказа + платёжный шлюз | ❌ TODO — Edge Function + YooKassa/Robokassa |
| `/api/leads/` | POST | приём контактных заявок | ❌ TODO — Edge Function (+ опц. Telegram-бот) |
| `/api/promocodes/` | POST | валидация промокода | ❌ TODO — Edge Function |

Места в коде, где осталось обращение к `apiBaseUrl` (= `https://pnhdstudioapi.ru`), помечены `// TODO(supabase-migration):`.

---

## 6. Supabase schema

Проект: `pnhd-studio-clone` (id `almfjmiygtnzngkayhdv`)
Регион: `eu-central-1` (Frankfurt)

Таблицы:
- `products` — каталог
- `product_sizes` — размеры (1:N к products)
- `product_gallery_photos` — фотографии товара
- `product_links` — связанные товары (M:N self-ref)
- `blog_posts` — статьи блога
- `gallery_images` — галерея принтов

Все таблицы read-доступны для `anon` через RLS. Write — только через `service_role` (миграции, админка).

Storage buckets:
- `product-images` — фото товаров
- `blog-images` — обложки постов
- `gallery-images` — принты галереи
- `user-uploads` — пользовательские принты из конструктора (deferred)

Миграции — в `supabase/migrations/`.

Маппинг snake_case БД → camelCase frontend выполняется в `src/lib/queries/*`. Frontend по-прежнему работает с `IProduct`, `TBlogPosts` (см. [src/app/utils/types.ts](src/app/utils/types.ts)) — ничего не меняется в потребителях.

---

## 7. External services (унаследованные)

- **CDN оригинала**: `cdn.pnhd.ru` — изображения товаров и принтов. В клоне продолжают использоваться (картинки в seed ссылаются на placeholders + cdn.pnhd.ru). `next.config.mjs` whitelistит хост.
- **Roistat**: `86cd2ab6047bc5c2f8ea632e1183ac10` ([src/app/layout.tsx:73](src/app/layout.tsx#L73)) — трекинг источников. Public ID.
- **Yandex Metrica**: counter `86217584` ([src/app/layout.tsx:83](src/app/layout.tsx#L83)). Verification token `35381404e7bfd3a4` ([src/app/layout.tsx:27](src/app/layout.tsx#L27)).
- **uiscom.ru**: чат-виджет `79obNG5YrzIplUgKXZYSiPbK7agWm7Dk` ([src/app/layout.tsx:93](src/app/layout.tsx#L93)).
- **CDEK API**: использовался через прокси `/api/shipping/*` — в клоне отключено.
- **Платёжный шлюз**: неизвестен (создавался на стороне `pnhdstudioapi.ru`, скорее всего YooKassa/Robokassa) — в клоне отключено.

**Эти ID и счётчики — старого проекта.** Если хочешь, чтобы трекалось на твоём аккаунте, замени в [src/app/layout.tsx](src/app/layout.tsx) или удали скрипты вовсе.

---

## 8. Critical files & directories

| Путь | Зачем читать |
|---|---|
| [src/app/layout.tsx](src/app/layout.tsx) | Root layout, metadata, аналитика, providers |
| [src/app/utils/constants.ts](src/app/utils/constants.ts) | apiBaseUrl, CDN_URL, getShopData/getPosts (старый fetch) |
| [src/app/utils/types.ts](src/app/utils/types.ts) | Все интерфейсы — IProduct, TBlogPosts, IOrderBody, CDEK, ... |
| [src/api/api.ts](src/api/api.ts) | RTK Query endpoint'ы |
| [src/redux/store.ts](src/redux/store.ts) | Redux store + middleware |
| [src/redux/cart-slice/cart.slice.ts](src/redux/cart-slice/cart.slice.ts) | Корзина — с sessionStorage-побочкой |
| [src/lib/supabase/server.ts](src/lib/supabase/server.ts) | Supabase client для SSR |
| [src/lib/supabase/client.ts](src/lib/supabase/client.ts) | Supabase client для browser |
| [src/lib/queries/products.ts](src/lib/queries/products.ts) | `getAllProducts`, `getProductBySlug` |
| [src/lib/queries/blog.ts](src/lib/queries/blog.ts) | `getAllPosts`, `getPostBySlug` |
| [src/lib/queries/gallery.ts](src/lib/queries/gallery.ts) | `getGalleryImages` |
| [src/components/pages-components/constructor-page/](src/components/pages-components/constructor-page/) | 3D мокап + Konva — самая сложная часть |
| [supabase/migrations/](supabase/migrations/) | SQL миграции |

---

## 9. Конструктор (отдельно)

Текущий flow (в оригинале):
1. Пользователь загружает картинку через `<FileUploader>` → `useUploadPrintImageMutation` → API возвращает `{url, width, height}`
2. URL сохраняется в Redux (`cart.order[currentItem].prints[activeView].file`)
3. `<DecalComp>` ([src/components/pages-components/constructor-page/3dmockup/decal.tsx](src/components/pages-components/constructor-page/3dmockup/decal.tsx)) грузит текстуру через `useTexture` и рендерит её как `<Decal>` на 3D-модели футболки
4. `<PivotControls>` ловит drag — пересчитывает `stageParams` (position/rotation/scale) и `dispatch` в Redux
5. После drag end делается скриншот канваса, отправляется в API как превью для корзины

В клоне:
- 3D рендерится (показываем UI)
- Кнопки «Сохранить»/upload/«Добавить в корзину» помечены `// TODO(supabase-migration):` и показывают alert «Конструктор в demo-режиме»
- Konva 2D-stage в page.tsx закомментирован ещё в оригинале (был legacy) — оставлен как есть

Когда будем подключать конструктор к Supabase:
- `uploadPrintImage` → `supabase.storage.from('user-uploads').upload(...)` → public URL
- Сохранение конфигурации принта (stageParams, cartParams) — оставить в Redux + sessionStorage (или перенести в `carts` таблицу с anon-user-id)

---

## 10. Known issues (из аудита)

🔴 **Критично**:
1. `<html lang="en">` на русском сайте — [src/app/layout.tsx:42](src/app/layout.tsx#L42)
2. `Disallow: /blog/` в robots.txt при работающем блоге — потеря трафика
3. `unoptimized` на `<Image>` карточки товара — [src/components/pages-components/shop-page/product-card/product-card.tsx](src/components/pages-components/shop-page/product-card/product-card.tsx)
4. Three.js/Konva/FFmpeg грузятся в общий бандл (не через `dynamic({ ssr:false })`)
5. `sessionStorage` в reducer'ах — [src/redux/cart-slice/cart.slice.ts](src/redux/cart-slice/cart.slice.ts)
6. `document`/`window` без guard — например [src/components/pages-components/constructor-page/3dmockup/3dmokup.tsx:43](src/components/pages-components/constructor-page/3dmockup/3dmokup.tsx#L43)
7. `dangerouslySetInnerHTML` × 6 без санитизации (методы, текстиль, принты, блог)
8. Next.js 14.1.0 — есть CVE GHSA-fr5h-rqp8-mj6g (SSRF в Image Optimization), нужно ≥14.2

🟡 **Важно**:
- Конфликт `metadataBase` между [page.tsx](src/app/page.tsx) и [shop/page.tsx](src/app/shop/page.tsx)
- Нет `twitter:card`, `og:locale: ru_RU`, динамических `og:image`
- Нет Schema.org `Product` на карточках товара
- H1 на главной закомментирован
- 6 копипаст-страниц категорий (futbolki/hudi/...) — должен быть один generic компонент
- 66 `@ts-ignore` + 33 `any`
- Нет тестов, Sentry, CI

Полный аудит был выполнен в одной из прошлых сессий — детали в conversation summary.

---

## 11. Dev workflow

### Локальный запуск

```bash
npm install
cp .env.example .env.local       # заполни значения из Supabase Dashboard
npm run dev                       # http://localhost:3000
```

### Переменные окружения

```
NEXT_PUBLIC_SUPABASE_URL=https://almfjmiygtnzngkayhdv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<берётся из Supabase Dashboard → Settings → API → anon public>
```

### Добавить новый товар

Вариант А — через Supabase Studio (UI):
1. Открой проект в Supabase Dashboard
2. Table Editor → `products` → Insert row
3. Поля: `slug` (уникальный), `name`, `type`, `price`, `image_url` (URL картинки)
4. Если нужны размеры — в `product_sizes` добавь записи с `product_id` = id товара
5. Сайт подхватит на следующем запросе (revalidate=3600 для shop list, прямой fetch для slug page)

Вариант Б — SQL миграцией (для воспроизводимости):
1. Добавь файл `supabase/migrations/00X_new_products.sql`
2. Применить через MCP `apply_migration` или CLI `supabase db push`

### Локальные миграции

CLI установлен (`/opt/homebrew/bin/supabase`). Но в этом проекте используем MCP-инструменты, потому что Claude умеет их вызывать напрямую. CLI — резервный путь.

---

## 12. Deployment

**Vercel**:
- Project: `pnhd-studio-clone` (team `margolinilya-creates-projects`)
- Auto-deploy с `main` ветки
- Preview-деплои на каждый PR

**Env vars в Vercel** (Project Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL` (Production + Preview + Development)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview + Development)

**Build command**: `next build` (дефолт)
**Install command**: `npm install`
**Node version**: 20 (рекомендация)

`next.config.mjs` whitelistит изображения с:
- `cdn.pnhd.ru` (legacy, оставлено)
- `pnhdstudioapi.ru` (legacy, скоро уберём)
- `*.supabase.co` (добавлено — для Storage)

---

## 13. Conventions

- **Импорты**: `@/*` → `src/*` (см. [tsconfig.json](tsconfig.json))
- **Расположение компонентов**:
  - `src/app/...` — только page.tsx, layout.tsx, и `*.module.css/scss`. Бизнес-логика вынесена.
  - `src/components/pages-components/<page>/<feature>/` — компоненты, специфичные для страницы
  - `src/components/shared-components/<feature>/` — переиспользуемые
- **Стилизация**: CSS Modules (предпочтительно) + MUI `sx` для MUI-компонентов. Не плодить новые SCSS — миграция на CSS Modules.
- **Локализация**: RU only. Все строки в JSX — на русском. Если понадобится EN — i18n через `next-intl` отдельным этапом.
- **TypeScript**: `strict: true`. Не добавляй новые `any`, не используй `@ts-ignore` без `// TODO:` комментария с объяснением.
- **TODO-маркеры**: `// TODO(supabase-migration):` — для фич, которые ждут перевода на Supabase. `// TODO(audit):` — для аудит-фиксов.

---

## 14. Дорожная карта

**Сделано (этот clone)**:
- [x] Каталог + блог + галерея на Supabase
- [x] Vercel preview-деплой
- [x] CLAUDE.md

**Следующая итерация (аудит-фиксы Sprint 1)**:
- [ ] `lang="ru"`, разрешить `/blog/` в robots, убрать `unoptimized`, dynamic 3D
- [ ] Sentry для production-ошибок
- [ ] Обновить Next.js 14.1 → 14.2 (CVE)

**Конструктор → Supabase Storage**:
- [ ] Bucket `user-uploads` с публичным read, anon insert (RLS)
- [ ] Замена `uploadPrintImage` mutation на supabase.storage.upload
- [ ] Сохранение конфигурации принта в localStorage или в новой таблице `carts`

**Edge Functions**:
- [ ] `cdek-cities` / `cdek-points` / `cdek-calculate` (CDEK API key в secrets)
- [ ] `create-order` + интеграция платёжного шлюза (YooKassa или Robokassa)
- [ ] `create-lead` + Telegram-уведомление
- [ ] `validate-promocode` + табличка `promocodes`

**Code hygiene**:
- [ ] Generic `<ProductCategoryPage>` вместо 6 копипастов
- [ ] Listener middleware вместо `sessionStorage` в reducer'ах
- [ ] Type-aware гарды для `window`/`document`
- [ ] DOMPurify для `dangerouslySetInnerHTML`
- [ ] GitHub Actions: typecheck + build + lint на PR

Каждая из подзадач достойна отдельного плана.
