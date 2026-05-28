# ADR 0001 — Adoption of Payload CMS 3 as the single source of truth

- **Status:** Accepted
- **Date:** 2026-05-29
- **Deciders:** Ilia Margolin
- **Related plan:** [docs/superpowers/plans/2026-05-29-payload-cms-3-rollout.md](../superpowers/plans/2026-05-29-payload-cms-3-rollout.md)

## Context

После завершения pre-launch sweep (PR #1–#9, мёржены 2026-05-27/28) проект подошёл к границе того, что покрывает текущая custom-built admin-панель ([src/app/admin/](../../src/app/admin/), ~25 файлов на Supabase Server Actions + RLS). Она удовлетворяет CRUD по `products`, `blog_posts`, `gallery_images`, `leads`, но не масштабируется на следующие требования бизнеса:

- **Multi-channel** — B2B (pnhd.ru) + B2C (studio.pnhd.ru). В текущей схеме нет понятия `channels` на товаре, нет коллекций `companies`, `priceLists`.
- **Marketing primitives** — `drops` (релизные коллекции), `promos` (промокоды с правилами), `pages` (унифицированный landing/blog).
- **Multi-role workflow** — `admin / brand_manager / marketing / operations / sales`. Текущая модель — один монолитный `admin` через таблицу `admin_users`.
- **Order lifecycle** — статусы производства (`layout_review → printing → qc → packed`), `paymentStatus`, `productionStatus`. Сейчас `/checkout` — лид-форма, реальных заказов нет.
- **СБП-платежи** — Точка Банк и Т-Банк через PaymentProvider abstraction. Текущие RTK-эндпоинты orders/promocodes/shipping смотрят на мёртвый `pnhdstudioapi.ru`.
- **Фискализация по 54-ФЗ** — КОМТЕТ Касса REST после `paid`.
- **152-ФЗ локализация ПД** — реальные ПД клиентов запрещено хранить вне РФ. Текущая Supabase (`eu-central-1`) — non-compliant для production-launch.

Продолжать наращивать custom-admin для всех этих требований — путь к 100+ файлам Server Actions с дублированием access-control логики, sync hooks, валидацией. Альтернативно — выбрать headless CMS с встроенной admin-панелью, ролями, REST/GraphQL, hooks, миграциями.

## Decision

Принимаем **Payload CMS 3** как единый источник правды для каталога, контента, заказов, лидов и B2B-сущностей. Storefront читает данные **только через Payload API** (local API для SSR, REST для client).

Конкретика:
- **Single-app integration**: Payload встроена в текущий Next.js (route group `(payload)/admin/...` + `(payload)/api/...`). НЕ monorepo. Текущий публичный код переезжает в route group `(storefront)/`.
- **БД**: `@payloadcms/db-postgres` (drizzle) поверх той же Supabase Postgres на dev. Payload создаёт таблицы с префиксом `payload_` рядом с существующими `public.*`.
- **Медиа**: `@payloadcms/storage-s3` поверх S3-совместимого endpoint'а — Supabase Storage на dev (`https://<ref>.supabase.co/storage/v1/s3`, `forcePathStyle: true`), Yandex Object Storage на prod (`storage.yandexcloud.net`, `ru-central1`).
- **Платежи**: собственный `PaymentProvider` interface + `TochkaProvider` + `TBankProvider`. Никаких Stripe/PayPal/ЮKassa.
- **Фискализация**: отдельный `sendFiscalReceipt` hook на Orders, вызывающий КОМТЕТ Касса REST после `paymentStatus = paid`. Идемпотентен по `order.id`.
- **B2B-фундамент**: `companies` + `priceLists` коллекции с заморозкой витрины pnhd.ru (вне scope текущего rollout'а).
- **Production cutover**: миграция БД и медиа на **Yandex Cloud** (Managed PostgreSQL + Object Storage + Compute) **до** публичного запуска. Это финальный gate перед сбором реальных ПД.

## Alternatives considered

- **Strapi** — отвергнут: TS DX слабее (типы headless и часто `any`), admin UI менее кастомизируемый под наши workflow.
- **Directus** — отвергнут: admin UI трудно настраивается под нестандартные коллекции (drops, promos с правилами), data-driven навигация вместо declarative-config.
- **Sanity** — отвергнут: нет self-host, ПД из РФ запрещены к хранению на их инфраструктуре (152-ФЗ).
- **Расширять текущий custom-admin** — отвергнут: 4 модуля уже занимают ~25 файлов, для 10+ коллекций (orders, payments, fiscal, B2B) объём вырастет до 100+, дублирование access-control / sync hooks / валидации станет неуправляемым.

## Consequences

**Positive:**
- Один источник правды для всех бизнес-сущностей. Storefront перестаёт делать прямые `supabase.from('products')` запросы.
- Гибкая ролевая модель (`admin / brand_manager / marketing / operations / sales`) из коробки.
- Версионируемые миграции схемы через drizzle + Payload's `payload migrate`.
- Готовность к B2B-фундаменту без редизайна — добавление `channels: ['b2b']` на товаре и `companies/priceLists` коллекций.
- Чистый ENV-swap для cutover на Yandex (тот же `@payloadcms/storage-s3`, тот же `db-postgres`).

**Negative / costs:**
- Большой rip-out: весь `/src/app/admin/*` (~25 файлов) удаляется в Phase 2b. Безболезненно только потому что pre-launch уже завершён и в admin'е нет critical changes-in-flight.
- Размер admin client bundle ~600 KB gzip — изолирован через route group `(payload)`, в storefront не утекает.
- Storefront layouts перетасовка через route groups (`(storefront)/`, `(payload)/`).
- Зависимость от Payload's roadmap. Mitigation: open-source, MIT, активная коммьюнити.

**Operational:**
- Connection pooler на Supabase **MUST** быть в session mode (port 5432 или 6543 с `?pgbouncer=true&statement_cache_size=0`) — transaction pooler ломает drizzle prepared statements.
- `BITRIX_WEBHOOK_URL` на prod-Vercel остаётся **не настроен** до Phase 8 — иначе реальные ПД пойдут в Bitrix с серверов вне РФ (нарушение 152-ФЗ).
- Edge Functions (`create-lead`, `cleanup-user-uploads`) удаляются в Phase 3 и Phase 8 соответственно. Их функциональность переезжает в Payload hooks + Yandex Cloud Functions.
- Старые таблицы `public.products / blog_posts / gallery_images / leads` остаются как archival snapshot после Phase 2b. Дроп — в Phase 8 при cutover (или позже).

## Rollout

8-фазный rollout, по одному PR на фазу. См. полный план: [docs/superpowers/plans/2026-05-29-payload-cms-3-rollout.md](../superpowers/plans/2026-05-29-payload-cms-3-rollout.md).

Зависимости фаз: `0 → 1 → 2a → 2b → 2c → 3 → 4 → (5,6,7 параллельно) → 8`. Публичный запуск возможен только после Phase 8 (cutover на Yandex).

## Open questions to resolve before later phases

- **КОМТЕТ налоговый режим** (УСН доход / УСН доход-расход / ОСН?) — до Phase 6.
- **Bitrix24 webhook URL** от заказчика — до Phase 8.
- **Yandex Cloud аккаунт** (Managed PG + Object Storage + Service Account ключи) — до Phase 8.
