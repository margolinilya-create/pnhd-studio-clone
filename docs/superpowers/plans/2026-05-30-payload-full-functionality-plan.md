# Payload CMS — расширение функционала после Phase 0–4

> **Статус**: план на бумаге, утверждён 2026-05-30. Реализация по этапам отдельными PR'ами.
> **Предшественник**: [docs/superpowers/plans/2026-05-29-payload-cms-3-rollout.md](2026-05-29-payload-cms-3-rollout.md) — Phase 0–4 уже в production.

---

## Context

После Phase 0–4 на проде живёт Payload 3 на `/admin` с 12 коллекциями, из которых заполнены 5 (`Users / Media / Categories / Products / Variants / Prices`). Каталог из 25 товаров и 74 вариантов читается storefront'ом. Остальное **структурно есть**, но **не используется**:

- `Pages` / `Drops` / `Promos` — коллекции живут, storefront не подключен
- `Leads` — форма по-прежнему льёт в `public.leads` через Edge Function `create-lead`
- `Orders` / `OrderItems` — чекаут отдаёт `alert()`, в Payload ничего не пишет

**Слепое пятно**: блог и галерея вообще выпали из admin после rip-out старой Supabase-админки (Phase 2b). Записи остались в `public.blog_posts` / `public.gallery_images`, но **редактировать их сейчас нечем** — только напрямую через SQL.

**Цель этого плана**: довести Payload до полного покрытия контента и операционных процессов сайта — блог, галерея, статические страницы, лиды, заказы, SEO, черновики, редиректы, live-preview. Без внешних интеграций (Bitrix / СБП / КОМТЕТ / Yandex cutover — остаются в [project-payload-migration](../../../memory/project_payload_migration.md), Phase 5–8 отложены).

---

## Карта PR'ов

| PR | Branch | Что делает | LOC оценка |
|---|---|---|---|
| A1 | `feat/payload-blog` | Коллекция `Blog` (Lexical + cover) + ETL из `public.blog_posts` + storefront `/blog` `/blog/[post]` на Payload | ~500 |
| A2 | `feat/payload-gallery` | Коллекция `Gallery` (через Media + tags) + ETL из `public.gallery_images` + storefront-блоки | ~300 |
| A3 | `feat/payload-pages` | Pages → 6 страниц: `/contacts /loyalty /howto /size_chart /oferta /privacy` (Lexical-блоки) + storefront route handler | ~600 |
| A4 | `feat/payload-seo-drafts` | `@payloadcms/plugin-seo` + `versions:{drafts:true}` на Blog/Pages/Products + meta-поля в storefront `generateMetadata` | ~250 |
| B1 | `feat/payload-leads-cutover` | RTK `createLead` → POST `/api/leads` (вместо `supabase.functions.invoke`) + ETL старых лидов + удалить Edge Function `create-lead` | ~200 |
| C1 | `feat/payload-orders-cutover` | `/checkout` пишет в `Orders + OrderItems` через Payload REST + статусы в admin | ~700 |
| C2 | `feat/payload-orders-flow` | Workflow статусов (`new → in_progress → ready → shipped → done / cancelled`) + email клиенту через hook (опц.) | ~300 |
| D1 | `feat/payload-redirects-livepreview` | `@payloadcms/plugin-redirects` + Live Preview wiring (preview-route + iframe в admin) | ~200 |

Зависимости: `A1 → A2 → A3` (последовательно, общая ETL-инфра) → `A4` (поверх Blog/Pages) → `B1` (независим) → `C1 → C2` (последовательно) → `D1` (поверх всего).

Можно перемежать: A1 → B1 → A2 → A3 → C1 → A4 → C2 → D1 — если хочется быстрых wins.

---

## Этап A — Контент (Blog + Gallery + Pages + SEO/Drafts)

### A1. Blog collection

**Что**:
- Новая коллекция `src/collections/Blog.ts`:
  ```ts
  slug: 'blog'
  fields:
    - title (text, required)
    - slug (text, required, unique, hook: slugify(title))
    - cover (upload → media, required)
    - excerpt (textarea, max 280 chars)
    - body (richText, lexical with custom blocks: image, quote, code, embed)
    - author (relationship → users, default: req.user.id)
    - tags (array of text)
    - publishedAt (date)
    - meta (через plugin-seo в A4)
  versions: { drafts: true, maxPerDoc: 10 }
  access: { read: published-only for anon, all for admin }
  ```
- ETL `scripts/etl-blog.mjs` (по паттерну catalog ETL из [reference_payload_production](../../../memory/reference_payload_production.md)): читает `public.blog_posts` через supabase-js, льёт через `POST /api/blog` с JWT.
- Storefront: [src/app/blog/page.tsx](../../../src/app/blog/page.tsx) + [src/app/blog/[post]/page.tsx](../../../src/app/blog/[post]/page.tsx) — заменить `getAllPosts` / `getPostBySlug` из [src/lib/queries/blog.ts](../../../src/lib/queries/blog.ts) на Payload Local API (`payload.find({ collection: 'blog' })`).
- Снять `dynamicParams: false` (на новые посты `revalidatePath` сработает через `afterChange` hook).
- Rendering Lexical → HTML через `@payloadcms/richtext-lexical/react` (`<RichText>`).

**Что сломается**: ничего — старая `public.blog_posts` остаётся как archival. Storefront переключается атомарно.

### A2. Gallery collection

**Что**:
- Доработать `Media` коллекцию: добавить `tags: ['gallery', 'product', 'blog']`, `sortOrder: number`.
- Альтернативно — отдельная коллекция `Gallery` если нужны специфичные поля (caption, ссылка-на-товар).
  - **Рекомендация**: отдельная `Gallery` collection — переиспользуем `Media` под uploads, но Gallery держит metadata (caption, link, sort) отдельно от raw-файла.
- ETL `scripts/etl-gallery.mjs`: для каждой записи в `public.gallery_images` — `POST /api/media` (upload файл) → `POST /api/gallery` (создать запись со ссылкой).
- Storefront: где сейчас читается gallery (если на странице есть) — подключить через Local API.

**Решение по полю**: пока на storefront галерея отрисовывалась в удалённом конструкторе (3D шейдеры). Сейчас не используется нигде на публичной части. Возможно её достаточно держать просто как пул картинок для блога / лендингов. Решим при PR A2.

### A3. Pages collection

**Что**:
- Коллекция `Pages` (структурно уже есть в `src/collections/Pages.ts` — допилить):
  ```ts
  slug: 'pages'
  fields:
    - title (text)
    - slug (text, unique)
    - layout (blocks): Hero | RichText | TwoColumn | FAQ | CTA | YandexMap | ContactsBlock
    - publishedAt
    - meta (SEO в A4)
  ```
- В Phase 2c (исходный план) Pages были задуманы под `Drops` / `Promos` landing'и. Сейчас расширяем под все статические страницы.
- Заменить хардкод-страницы:
  - `/contacts` → Page (slug `contacts`)
  - `/oferta` → Page (slug `oferta`)
  - `/privacy` → Page (slug `privacy`)
  - `/size_chart` → Page (slug `size_chart`)
  - `/howto` → Page (slug `howto`)
  - `/loyalty` → Page (slug `loyalty`)
- Storefront: `src/app/[slug]/page.tsx` — catch-all для Pages (после existing routes). Или каждая страница оставляется как отдельный route, но читает контент через Payload.
  - **Рекомендация**: оставить existing routes (для статической оптимизации и понятной навигации), но контент тянуть из Pages по slug. Это меньше ломает Next.js routing.
- ETL seed-скрипт `scripts/seed-pages.mjs` — экстрактит текущий хардкод-контент в Pages.

**Риск**: Lexical-блоки требуют React-renderer на storefront. Установить `@payloadcms/richtext-lexical/react` + написать рендереры для каждого custom block (Hero / FAQ / etc.).

### A4. SEO + Drafts

**Что**:
- `npm install @payloadcms/plugin-seo`
- Подключить в `payload.config.ts`:
  ```ts
  plugins: [
    seoPlugin({
      collections: ['products', 'blog', 'pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => `${doc.title} — pnhd.studio`,
      generateDescription: ({ doc }) => doc.excerpt || doc.meta_description,
    }),
  ]
  ```
- Включить `versions: { drafts: true }` на Blog, Pages, Products.
- Storefront `generateMetadata` для `/blog/[post]`, `/shop/[slug]`, `/[page-slug]` — читать `doc.meta.title / meta.description / meta.image`, fallback на title/excerpt.
- Для anon-чтения добавить фильтр `where: { _status: { equals: 'published' } }` в storefront-запросы (чтобы черновики не утекали).

---

## Этап B — Лиды

### B1. Cutover на Payload

**Что**:
- В [src/api/api.ts](../../../src/api/api.ts) `createLead` мутация: заменить `supabase.functions.invoke('create-lead')` на `POST /api/leads` (anon доступ — настроить `access.create: () => true` на Leads collection).
- Валидация полей через Payload zod-like schemas (length-caps, regex для phone/email) — уже частично в коллекции.
- Rate-limit: в Payload через `beforeChange` hook на Leads, можно реализовать аналог IP-hash логики (опционально — для MVP пропустить).
- Source whitelist: `'footer' | 'popup' | 'shop-no-model' | 'product-page' | 'methods-consultation'` — добавить в Leads `source` field как select.
- ETL `scripts/etl-leads.mjs` — `public.leads` → Payload `leads` (через REST с admin JWT).
- Workflow: статус-поле `status: 'new' | 'contacted' | 'done' | 'spam'` уже в Leads — в admin сделать row-actions (или просто select-field).
- Опц. `afterChange` hook → Telegram уведомление (если `TELEGRAM_BOT_TOKEN` ENV выставлен).
- **Удалить** `supabase/functions/create-lead/` после успешного cutover'а.

**Риск**: anon POST на Payload — нужна защита от спама. Минимум — CSRF (Payload включает по умолчанию из `ALLOWED_ORIGINS`), плюс honeypot field в форме (видимое только ботам).

**Что НЕ делаем**: Bitrix sync (отложен, см. [project-payload-migration](../../../memory/project_payload_migration.md)).

---

## Этап C — Заказы

### C1. Чекаут пишет в Orders

**Что**:
- Сейчас [src/components/pages-components/checkout/](../../../src/components/pages-components/checkout/) на «оплатить» отдаёт `alert()`. Логика cart → server полностью отсутствует.
- Создать RTK mutation `createOrder` → `POST /api/orders`:
  ```ts
  body: {
    customer: { name, phone, email, comment },
    delivery: { type: 'pickup'|'cdek', address?, cdekPointCode? },
    items: cart.order.map(item => ({
      product: item.id,
      variant: item.size,
      qty: item.qty,
      printConfig: item.printConfig, // location, files (paths в Storage)
    })),
    promocode?: cart.userPromocode,
    total: computed,
  }
  ```
- Payload `Orders` collection (уже структурно есть): добавить недостающие поля если что-то не покрыто.
- `OrderItems` создаются Payload `afterChange` hook на Orders — или (проще) пишутся напрямую через relationship-поле `items` с `hasMany`.
- На успехе redirect на `/thanks?order=<id>`.

**Дополнительно**: print-файлы из `user-uploads` bucket'а нужно либо переносить в Payload Media (через `S3 copy`), либо хранить только path-ссылку. **Рекомендация**: при оформлении заказа копировать файлы в `payload-media` bucket с префиксом `orders/<id>/` — тогда orphan-cleanup на `user-uploads` не снесёт их по nightly sweeper'у.

**Риск**: cart-slice сейчас держит `IPrintFileRef` со `path` в `user-uploads`. Нужно либо менять path при оформлении (copy), либо переключать sweeper'ы.

### C2. Order workflow

**Что**:
- Status enum: `new → in_progress → ready → shipped → done / cancelled`
- Admin list view: фильтры по статусу + bulk-actions.
- Опц. `afterChange` hook: при смене статуса на `ready` или `shipped` → email клиенту (если есть SMTP) или Telegram менеджеру.
- Тэги cancellation reason.
- Опц. UI для печати инвойса/наряда из admin (Payload custom view).

**Что НЕ делаем**: платежи (СБП — Phase 5 отложен) и фискализация (КОМТЕТ — Phase 6 отложен). Заказы пока менеджер закрывает руками — менеджер видит заявку в admin, звонит, выставляет счёт вне системы.

---

## Этап D — Cross-cutting

### D1. Redirects + Live Preview

**Redirects**:
- `npm install @payloadcms/plugin-redirects`
- Подключить:
  ```ts
  redirectsPlugin({
    collections: ['blog', 'pages', 'products'],
    overrides: {
      // нагрузить fields для произвольных 301 редиректов
    },
  })
  ```
- Создать `src/middleware.ts` middleware-хук, который перед роутингом дёргает Payload `redirects.find({ from })` → возвращает 301.
- Use case: переименовали slug товара → старый URL автоматически 301 на новый (без билда).

**Live Preview**:
- В `payload.config.ts`:
  ```ts
  admin: {
    livePreview: {
      url: ({ data, collectionConfig }) => {
        if (collectionConfig.slug === 'blog') return `/blog/${data.slug}?preview=true`
        if (collectionConfig.slug === 'products') return `/shop/${data.slug}?preview=true`
        if (collectionConfig.slug === 'pages') return `/${data.slug}?preview=true`
        return '/'
      },
      breakpoints: [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1440, height: 900 },
      ],
    },
  }
  ```
- Storefront должен поддерживать `?preview=true` query param → читать drafts (`draft: true` в Local API) и отключать кеш.
- Token auth для preview — через Payload `preview` ENV или signed token.

---

## Архитектурные решения

### ETL pattern
Все ETL через REST API (см. [reference_payload_production.md](../../../memory/reference_payload_production.md)) — `tsx`-импорт `payload.config.ts` ломается на Payload's loadEnv. Шаблон:
```js
// scripts/etl-*.mjs
const login = await fetch(`${PAYLOAD_URL}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
const { token } = await login.json()
// затем POST /api/<collection> с Authorization: JWT <token>
```

### Lexical Rich Text rendering на storefront
В Phase 0–4 storefront не использовал Lexical (Products описания — plain text). С A1/A3 добавится:
```bash
npm install @payloadcms/richtext-lexical
```
Renderer:
```tsx
import { RichText } from '@payloadcms/richtext-lexical/react'
<RichText content={post.body} converters={{ /* custom blocks */ }} />
```
Custom blocks (image, quote, FAQ, CTA) — пишутся как Lexical Node-converters.

### Schema migrations
Каждое изменение коллекций → `npm run payload:migrate:create` → коммит SQL → `npm run payload:migrate` на проде через Vercel deploy hook (или вручную через MCP).

### importMap regen
Каждое изменение коллекций ИЛИ плагинов → `npm run payload:gen-importmap` → коммит [src/app/(payload)/admin/importMap.js](../../../src/app/(payload)/admin/importMap.js). Без него `/admin` показывает пустой экран. **Не забыть в CI добавить check** (опц.).

### Связи с Supabase public.* tables
- `public.blog_posts` — после A1 ETL осталось archival, **можно дропнуть** в финале этапа A.
- `public.gallery_images` — то же после A2.
- `public.leads` — после B1 ETL → archival, дропнуть в финале B.
- `public.admin_users` — уже archival, можно дропнуть когда не страшно потерять старый logи (low priority).

---

## Risks / Open questions

| Risk | Severity | Mitigation |
|---|---|---|
| Lexical custom blocks потребуют новых renderer'ов на каждое изменение схемы блоков | medium | Документировать конвертеры в `src/lib/lexical-renderers.ts`, держать в одном месте |
| Live Preview требует кеш-бастинг | low | `cache: 'no-store'` для preview-запросов |
| ETL для blog/gallery может уткнуться в S3 upload через REST (multipart) | medium | Использовать `payload.create()` через REST с pre-signed URL, либо `tsx` если получится починить loadEnv |
| Anon POST на /api/leads — спам | medium | CSRF + honeypot + опц. rate-limit hook |
| Print-файлы в user-uploads vs payload-media bucket | medium | При C1 — copy в `payload-media/orders/<id>/`, либо migrate `user-uploads` → `payload-media` целиком |
| Redirects через middleware → latency | low | Кешировать `redirects` table в memory (Payload sub-1ms через Local API) |
| RTK Query baseUrl до сих пор `pnhdstudioapi.ru` | low | Поменять на `''` (relative) в B1 или C1 — теперь все мутации идут на свой /api |

**Open**:
- Дропать ли `public.blog_posts` / `public.gallery_images` / `public.leads` после ETL — или держать ещё месяц как safety-net? **Решение по умолчанию**: держать до Phase 8 (Yandex cutover), но прекратить туда писать (`REVOKE INSERT, UPDATE`).
- В C1 нужны ли заказчиком ручной email/SMS на статус-смену — пока считаем нет, обходимся admin-views.
- В A3 — все 6 страниц одним PR или разбить? **Решение**: одним, ETL одной командой, контент копируется механически.

---

## Definition of done (per этап)

### A done
- [ ] `/blog` и `/blog/[post]` отрендерены из Payload, drafts не утекают
- [ ] `/contacts /loyalty /howto /size_chart /oferta /privacy` редактируются в admin → меняются на сайте через `revalidatePath`
- [ ] Gallery либо подключена либо явно вычеркнута из scope
- [ ] SEO meta-теги видны в `<head>` на товарах / постах / страницах
- [ ] Drafts работают: создал в admin → draft, опубликовал → виден

### B done
- [ ] Формы (footer, popup, NoModel, methods-consultation) шлют в Payload
- [ ] Edge Function `create-lead` удалена
- [ ] Старые лиды видны в Payload admin

### C done
- [ ] `/checkout` создаёт Order + OrderItems
- [ ] Status workflow менеджер может прокликивать в admin
- [ ] Print-файлы привязаны к заказу и не теряются sweeper'ом

### D done
- [ ] Old slug `/foo` → 301 на новый — конфигурируется в admin
- [ ] Live Preview работает для blog/products/pages

---

## Sequencing recommendation

Если делать «всё подряд» — порядок строго `A → B → C → D` (≈ 8 PR в 8–12 сессий).

Если хочется быстрых wins — alternative order:
1. **B1 Leads** (быстро, ~200 LOC, закрывает Edge Function зависимость)
2. **A1 Blog** (закрывает «слепое пятно»)
3. **A3 Pages** (контент-команда сразу видит ценность)
4. **A4 SEO+Drafts** (cross-cutting, дешёво)
5. **A2 Gallery** (если решим что нужна)
6. **C1+C2 Orders** (большой кусок)
7. **D1 Redirects+LivePreview** (поверх готового)

---

## Не входит в этот план

- Phase 5 (СБП Tochka / T-Bank) — отложено
- Phase 6 (КОМТЕТ фискализация) — отложено
- Phase 7 (B2B) — отложено
- Phase 8 (Yandex Cloud cutover) — отложено
- Bitrix24 sync — отложено
- Замена tracking ID (Roistat / Metrica / uiscom) — вне CMS scope
- Чёткие тесты (vitest) — заложить в каждый PR минимум по 1 happy-path unit-тесту, full coverage — отдельным PR
