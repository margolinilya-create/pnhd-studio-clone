# Payload Plugins Batch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подключить 4 официальных Payload-плагина: `plugin-redirects` (SEO-редиректы), `plugin-import-export` (CSV-backup), `plugin-form-builder` (полная миграция lead-pipeline + восстановление потерянных Bitrix/Telegram/rate-limit hooks), `plugin-sentry` (observability на стороне Payload + client-side Sentry).

**Architecture:** Каждая фаза самодостаточна и шипуется отдельной PR. Phase 1, 2, 4 — почти чистый config + glue code. Phase 3 — самая объёмная: form-builder заменяет custom Leads collection как источник submissions, при этом Leads-таблица остаётся read-only legacy-архивом. Все custom-хуки (Bitrix24, Telegram, rate-limit) живут в `src/hooks/` и тестируются Vitest'ом изолированно.

**Tech Stack:** Payload v3.85.0, Next.js 15.4.11 (App Router), TypeScript strict, Vitest 4.1.7, Sentry 10.54.0, Postgres (Supabase transaction pooler).

---

## Pre-flight context (read before starting)

**Текущее состояние проекта (на 2026-05-30):**
- Payload config: `src/payload.config.ts` — уже подключены `s3Storage` + `seoPlugin`.
- Collections: `src/collections/{Categories,Drops,Leads,Media,OrderItems,Orders,Pages,Prices,Products,Promos,Users,Variants}.ts`.
- Leads collection: `src/collections/Leads.ts` — `access.create: () => true`, **никаких hooks**. Bitrix/Telegram/rate-limit, которые были в удалённой Edge Function `supabase/functions/create-lead`, на данный момент потеряны.
- Frontend lead-формы:
  - `src/components/shared-components/lead-form/lead-form.tsx` (footer + popup)
  - `src/components/shared-components/noModelBlock/NoModelBlockForm.tsx` (/shop)
- API клиент: `src/api/api.ts:108-130` — `createLead` мутация шлёт `POST /api/leads` (Payload REST) с маппингом snake → camel.
- LeadSource enum: `src/api/api.ts:10` — 6 значений: `'footer' | 'popup' | 'shop-no-model' | 'product-page' | 'methods-consultation' | 'checkout'`.
- Vitest: `vitest.config.ts` живёт в корне, 2 теста (`src/redux/cart-slice/cart.slice.test.ts`, `src/lib/cart/validate-stored-cart.test.ts`).
- Sentry: `instrumentation.ts` инитит server + edge runtime по `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN`. Нет `sentry.client.config.ts`, нет Payload-side plugin.
- Middleware: `src/middleware.ts` **не существует**.
- ENV — production уже имеет `DATABASE_URI` (transaction pooler `:6543` + `pgbouncer=true`), S3-секреты, `BITRIX_WEBHOOK_URL` и `TELEGRAM_*` пока пустые (CLAUDE.md §6, §13).

**Что НЕ делаем в этом плане:**
- НЕ трогаем CDEK/checkout/orders.
- НЕ трогаем admin panel routing (`src/app/(payload)/admin/`).
- НЕ настраиваем Sentry alerts/dashboards (это отдельная задача).
- НЕ удаляем Leads collection (оставляем как legacy archive, см. Phase 3 Task 9).

**Регенерация артефактов после изменений payload.config.ts:**

После любого изменения `src/payload.config.ts` (добавление плагина / коллекции) НУЖНО регенерить два файла:
```bash
npm run payload generate:types
npm run payload generate:importmap
```
Первая команда обновляет `src/payload-types.ts`. Вторая — `src/app/(payload)/admin/importMap.js`. Обе нужно коммитить.

**Миграции БД:**

Payload-плагины могут добавлять свои коллекции → новые таблицы в `payload` schema. Используем `payload migrate:create` для генерации SQL-миграции, затем `payload migrate` локально (через Supabase pooler). На production миграции применяются автоматически при первом запросе через `predeploy` step (см. CLAUDE.md §13).

---

## File Structure

**Files to create:**
- `src/middleware.ts` — Next.js middleware для consume `redirects` collection (Phase 1)
- `src/hooks/notifyBitrix.ts` — Payload afterChange hook, шлёт submission в Bitrix24 (Phase 3)
- `src/hooks/notifyTelegram.ts` — afterChange hook, шлёт уведомление в Telegram (Phase 3)
- `src/hooks/rateLimitFormSubmissions.ts` — beforeOperation hook на form-submissions, rate-limit 3/мин по IP-hash (Phase 3)
- `src/hooks/notifyBitrix.test.ts`, `notifyTelegram.test.ts`, `rateLimitFormSubmissions.test.ts` — unit-тесты hooks (Phase 3)
- `src/lib/forms/get-form-by-slug.ts` — server-helper, кэширующий form-id по slug (Phase 3)
- `src/lib/forms/submit-form.ts` — frontend helper для POST form-submission (Phase 3)
- `src/lib/redirects/lookup-redirect.ts` — fetch helper для middleware (Phase 1)
- `src/lib/redirects/lookup-redirect.test.ts` — unit-тест (Phase 1)
- `sentry.client.config.ts` — client-side Sentry init (Phase 4)
- `scripts/seed-forms.ts` — одноразовый seed для создания Form-документов (Phase 3)
- `supabase/migrations/2026XXXX_payload_plugins_batch.sql` — Payload-generated schema migration (любая фаза, которая создаёт таблицы)

**Files to modify:**
- `src/payload.config.ts` — register плагины
- `src/api/api.ts` — заменить `createLead` мутацию на submission через form-builder (Phase 3)
- `src/components/shared-components/lead-form/lead-form.tsx` — переключить submit на form-submissions endpoint (Phase 3)
- `src/components/shared-components/noModelBlock/NoModelBlockForm.tsx` — то же (Phase 3)
- `src/collections/Leads.ts` — пометить как legacy в `admin.description` + `access.create: () => false` (Phase 3)
- `src/payload-types.ts` — auto-regenerated
- `src/app/(payload)/admin/importMap.js` — auto-regenerated
- `package.json` — добавить `@payloadcms/plugin-import-export`, `@payloadcms/plugin-form-builder`, `@payloadcms/plugin-sentry`

---

## Phase 1: plugin-redirects (SEO redirects)

**Цель:** менеджер заводит редирект (`/old-url` → `/new-url`) в Payload-админке → запрос с фронта попадает на `/old-url` → middleware отдаёт 301/302.

**Артефакт фазы:** работающие редиректы, edge-кейсы (admin/api/_next пропускаются), unit-тест на lookup-helper.

### Task 1.1: Register plugin-redirects в payload.config.ts

**Files:**
- Modify: `src/payload.config.ts:1-89`

- [ ] **Step 1: Прочитать текущий payload.config.ts**

Прочти `src/payload.config.ts` целиком. Убедись, что плагин ещё не зарегистрирован (поиск по `redirectsPlugin`).

- [ ] **Step 2: Добавить import**

В блок импортов (после `import { seoPlugin } from '@payloadcms/plugin-seo';` на строке 2) добавь:

```ts
import { redirectsPlugin } from '@payloadcms/plugin-redirects';
```

- [ ] **Step 3: Добавить в plugins array**

В массив `plugins` (после `seoPlugin({...})` на строке 81, перед закрывающей `]` на строке 82) добавь:

```ts
redirectsPlugin({
  collections: ['products', 'pages'],
  overrides: {
    admin: {
      group: 'SEO',
    },
  },
}),
```

`collections: ['products', 'pages']` — добавляет в карточку товара/страницы возможность объявить «у этого документа были такие-то старые URL» (опционально). Сама `redirects` collection создаётся автоматически.

- [ ] **Step 4: Regenerate types + importMap**

```bash
npm run payload generate:types
npm run payload generate:importmap
```

Ожидаемо: в `src/payload-types.ts` появляется тип `Redirect` со слагом `redirects`. `importMap.js` без значимых изменений (плагин не приносит admin UI компонентов).

- [ ] **Step 5: Сгенерировать DB migration**

```bash
npm run payload migrate:create payload_plugin_redirects
```

Ожидаемо: появится файл в `src/migrations/<timestamp>_payload_plugin_redirects.ts` с DDL для таблицы `payload.redirects`.

- [ ] **Step 6: Применить миграцию локально**

```bash
npm run payload migrate
```

Ожидаемо: миграция применяется к локальной БД (Supabase pooler), Payload Studio показывает новую коллекцию **Redirects** в группе **SEO**.

- [ ] **Step 7: Commit**

```bash
git add src/payload.config.ts src/payload-types.ts src/app/\(payload\)/admin/importMap.js src/migrations/
git commit -m "feat(payload): register plugin-redirects + migration"
```

### Task 1.2: Implement redirect lookup helper

**Files:**
- Create: `src/lib/redirects/lookup-redirect.ts`
- Test: `src/lib/redirects/lookup-redirect.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создай `src/lib/redirects/lookup-redirect.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { lookupRedirect } from './lookup-redirect';

describe('lookupRedirect', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when API returns no docs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [] }),
    }));

    const result = await lookupRedirect('https://x.test', '/missing');
    expect(result).toBeNull();
  });

  it('returns to-url and type=temporary by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [{ from: '/old', to: { url: '/new' } }],
      }),
    }));

    const result = await lookupRedirect('https://x.test', '/old');
    expect(result).toEqual({ to: '/new', type: 'temporary' });
  });

  it('passes type=permanent through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [{ from: '/old', to: { url: '/new', type: 'permanent' } }],
      }),
    }));

    const result = await lookupRedirect('https://x.test', '/old');
    expect(result).toEqual({ to: '/new', type: 'permanent' });
  });

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const result = await lookupRedirect('https://x.test', '/old');
    expect(result).toBeNull();
  });

  it('encodes pathname in query', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ docs: [] }) });
    vi.stubGlobal('fetch', fetchMock);

    await lookupRedirect('https://x.test', '/old/with spaces');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('/old/with spaces')),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**

```bash
npm run test -- src/lib/redirects/lookup-redirect.test.ts
```

Expected: FAIL — `Cannot find module './lookup-redirect'`.

- [ ] **Step 3: Implement helper**

Создай `src/lib/redirects/lookup-redirect.ts`:

```ts
export type RedirectResult = {
  to: string;
  type: 'temporary' | 'permanent';
};

export async function lookupRedirect(
  origin: string,
  pathname: string,
): Promise<RedirectResult | null> {
  const url = `${origin}/api/redirects?where[from][equals]=${encodeURIComponent(
    pathname,
  )}&depth=0&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      docs?: Array<{ to?: { url?: string; type?: 'temporary' | 'permanent' } }>;
    };
    const doc = data.docs?.[0];
    if (!doc?.to?.url) return null;

    return {
      to: doc.to.url,
      type: doc.to.type === 'permanent' ? 'permanent' : 'temporary',
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test — expected PASS**

```bash
npm run test -- src/lib/redirects/lookup-redirect.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/redirects/
git commit -m "feat(redirects): add lookupRedirect helper + tests"
```

### Task 1.3: Wire Next.js middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Создать middleware**

Создай `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { lookupRedirect } from '@/lib/redirects/lookup-redirect';

const SKIP_PREFIXES = ['/admin', '/api', '/_next', '/favicon', '/robots', '/sitemap'];

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const redirect = await lookupRedirect(origin, pathname);
  if (!redirect) return NextResponse.next();

  return NextResponse.redirect(
    new URL(redirect.to, req.url),
    redirect.type === 'permanent' ? 308 : 307,
  );
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
```

Заметки:
- Используем `308` (permanent) и `307` (temporary) вместо `301/302`, чтобы Next.js гарантированно сохранил HTTP-метод (важно для POST-форм, попадающих на устаревший URL).
- `matcher` исключает статику Next.js, дополнительные исключения — в `SKIP_PREFIXES`.

- [ ] **Step 2: Manual smoke test**

В отдельном терминале:
```bash
npm run dev
```

В Payload Studio (`http://localhost:3000/admin`):
1. Открой коллекцию **Redirects** в группе **SEO**.
2. Создай документ: `from=/test-old`, `to.url=/shop`, без type (default = temporary).
3. Сохрани.

Curl:
```bash
curl -i http://localhost:3000/test-old
```

Expected: `HTTP/1.1 307 Temporary Redirect`, header `location: /shop`.

Повтори с `to.type=permanent` — должен вернуть `308`.

- [ ] **Step 3: Verify exclusions**

```bash
curl -I http://localhost:3000/admin
curl -I http://localhost:3000/api/health
```

Expected: оба возвращают **не** redirect (200/404, но не 307/308) — даже если есть редирект с from=/admin, middleware его пропустит.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(redirects): wire Next.js middleware to consume redirects collection"
```

**Phase 1 done.** Можно мержить отдельной PR (`feat/payload-redirects`).

---

## Phase 2: plugin-import-export (CSV backup + bulk edits)

**Цель:** в админке у коллекций products/blog/pages/leads появляется action «Export» → менеджер скачивает CSV, правит в Excel, через action «Import» заливает обратно.

**Артефакт фазы:** плагин подключён к 4 коллекциям, ручная проверка round-trip.

### Task 2.1: Install + register plugin-import-export

**Files:**
- Modify: `package.json`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Install**

```bash
npm install @payloadcms/plugin-import-export@^3.85.0
```

Expected: версия точно совпадает с уже стоящими `@payloadcms/*` (3.85.0). Если npm установит более новую — npm install с указанием версии.

- [ ] **Step 2: Add import**

В `src/payload.config.ts` после строки с `redirectsPlugin` импортом:

```ts
import { importExportPlugin } from '@payloadcms/plugin-import-export';
```

- [ ] **Step 3: Register в plugins array**

После `redirectsPlugin({...})` (из Phase 1), добавь:

```ts
importExportPlugin({
  collections: ['products', 'pages', 'leads'],
  overrideExportCollection: (collection) => {
    collection.admin = {
      ...collection.admin,
      group: 'System',
    };
    return collection;
  },
}),
```

Заметки:
- Блог-коллекция в текущей схеме отсутствует (CLAUDE.md упоминал `blog_posts`, но это Supabase-эпоха; в Payload пока её нет). Когда появится — добавить в `collections` массив.
- `leads` оставляем доступной для export, но access.create позже закроем (Phase 3 Task 9). Чтение/экспорт работают независимо от create-access.
- Плагин создаёт коллекцию `payload-jobs-imports` или подобную — конкретное имя проверь в Studio после миграции.

- [ ] **Step 4: Regenerate types + importMap**

```bash
npm run payload generate:types
npm run payload generate:importmap
```

- [ ] **Step 5: Generate + apply migration**

```bash
npm run payload migrate:create payload_plugin_import_export
npm run payload migrate
```

- [ ] **Step 6: Manual verification — export**

`npm run dev`. В админке:
1. Открой **Products** list.
2. В верхнем меню коллекции должен появиться action **Export** (или **Download CSV**).
3. Запусти → скачается CSV с 25 строками.
4. Открой в Numbers/Excel — убедись, что колонки соответствуют полям коллекции.

- [ ] **Step 7: Manual verification — import**

1. В CSV измени `name` у первой строки на `<orig> [edited]`.
2. В админке → action **Import** → upload CSV.
3. Дождись завершения job'а.
4. Перезагрузи Products list — у первой строки должно быть имя `[edited]`.
5. Верни обратно через ту же UI или прямо в записи.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/payload.config.ts src/payload-types.ts src/app/\(payload\)/admin/importMap.js src/migrations/
git commit -m "feat(payload): register plugin-import-export for products/pages/leads"
```

### Task 2.2: Document operator workflow

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Добавить раздел в CLAUDE.md**

Найди в `CLAUDE.md` секцию **§12. Dev workflow** → подсекцию **Добавить новый товар**. Добавь после неё:

```markdown
### Bulk-edit / экспорт каталога

Через плагин `@payloadcms/plugin-import-export`:

1. Payload admin → Products → action **Export** → CSV.
2. Правка в Excel (массовое изменение цен, переименование, etc.).
3. Action **Import** → загрузить отредактированный CSV.

Идентификация строк — по `id`. **Если удалить колонку `id` или строку из CSV — плагин может попытаться создать дубликаты или пропустить апдейт.** Перед массовым импортом всегда делай предварительный export как backup.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): document plugin-import-export operator workflow"
```

**Phase 2 done.** Можно мержить отдельной PR (`feat/payload-import-export`).

---

## Phase 3: plugin-form-builder (full lead-pipeline migration)

**Цель:** заменить custom `Leads` collection (которая сейчас принимает submissions через REST без валидации/rate-limit) на `forms` + `form-submissions` плагина form-builder. Восстановить потерянные при миграции hooks: Bitrix24, Telegram, rate-limit по IP-hash. Существующая `Leads` collection остаётся как legacy archive (`access.create: false`).

**Артефакт фазы:** новые submissions летят в `form-submissions`, hooks работают, frontend (LeadForm + NoModelBlockForm) подключён к новому endpoint. Старые лиды в `Leads` доступны для чтения.

### Task 3.1: Install + register plugin-form-builder

**Files:**
- Modify: `package.json`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Install**

```bash
npm install @payloadcms/plugin-form-builder@^3.85.0
```

- [ ] **Step 2: Добавить import**

В `src/payload.config.ts`:

```ts
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
```

- [ ] **Step 3: Register в plugins array (минимальная конфигурация)**

После `importExportPlugin({...})`:

```ts
formBuilderPlugin({
  fields: {
    text: true,
    textarea: true,
    email: true,
    checkbox: true,
    select: true,
    number: false,
    message: true,
    country: false,
    state: false,
    payment: false,
  },
  redirectRelationships: [],
  formOverrides: {
    admin: { group: 'Forms' },
  },
  formSubmissionOverrides: {
    admin: {
      group: 'Forms',
      defaultColumns: ['form', 'createdAt'],
    },
    // Hooks подключим в Task 3.4-3.6.
  },
}),
```

Заметки:
- `payment: false` — мы не используем Stripe-плагин (РФ).
- `redirectRelationships: []` — встроенный механизм редиректа после submit не используется; делаем редирект на фронте.
- `country/state: false` — не нужны для RU-only лидов.

- [ ] **Step 4: Regenerate + migrate**

```bash
npm run payload generate:types
npm run payload generate:importmap
npm run payload migrate:create payload_plugin_form_builder
npm run payload migrate
```

Expected в Studio: новая группа **Forms** с коллекциями **Forms** и **Form Submissions**.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/payload.config.ts src/payload-types.ts src/app/\(payload\)/admin/importMap.js src/migrations/
git commit -m "feat(payload): register plugin-form-builder with minimal config"
```

### Task 3.2: Seed Form documents

**Files:**
- Create: `scripts/seed-forms.ts`

- [ ] **Step 1: Создать seed-скрипт**

Создай `scripts/seed-forms.ts`:

```ts
import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../src/payload.config';

const FORMS = [
  {
    slug: 'footer-lead',
    title: 'Footer Lead',
    fields: [
      { blockType: 'text', name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text', name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'email', name: 'email', label: 'Email', required: false, width: 100 },
      { blockType: 'checkbox', name: 'agreement', label: 'Согласие на обработку', required: true },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: [
      { children: [{ text: 'Спасибо! Мы свяжемся с вами в ближайшее время.' }] },
    ],
  },
  {
    slug: 'popup-lead',
    title: 'Popup Lead',
    fields: [
      { blockType: 'text', name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text', name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'email', name: 'email', label: 'Email', required: false, width: 100 },
      { blockType: 'checkbox', name: 'agreement', label: 'Согласие на обработку', required: true },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: [
      { children: [{ text: 'Заявка отправлена!' }] },
    ],
  },
  {
    slug: 'shop-no-model',
    title: 'Shop — нет модели',
    fields: [
      { blockType: 'text', name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text', name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'textarea', name: 'comment', label: 'Что ищете', required: false },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: [
      { children: [{ text: 'Заявка принята, ответим в течение дня.' }] },
    ],
  },
  {
    slug: 'product-page',
    title: 'Product Page Consultation',
    fields: [
      { blockType: 'text', name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text', name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'text', name: 'referenceUrl', label: 'Ссылка на референс', required: false },
      { blockType: 'textarea', name: 'comment', label: 'Комментарий', required: false },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: [{ children: [{ text: 'Спасибо!' }] }],
  },
  {
    slug: 'methods-consultation',
    title: 'Methods — консультация',
    fields: [
      { blockType: 'text', name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text', name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'text', name: 'methodSlug', label: 'Метод печати', required: false },
      { blockType: 'textarea', name: 'comment', label: 'Комментарий', required: false },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: [{ children: [{ text: 'Спасибо!' }] }],
  },
];

async function main() {
  const payload = await getPayload({ config });

  for (const form of FORMS) {
    const existing = await payload.find({
      collection: 'forms',
      where: { title: { equals: form.title } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`skip: form "${form.title}" already exists (id=${existing.docs[0].id})`);
      continue;
    }

    const created = await payload.create({
      collection: 'forms',
      data: {
        title: form.title,
        fields: form.fields,
        confirmationType: form.confirmationType,
        confirmationMessage: form.confirmationMessage,
      },
    });
    console.log(`created: form "${form.title}" (id=${created.id})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Заметки:
- Идемпотентность по полю `title` (Forms из коробки уникального slug-поля не имеют — используем title как identity).
- Дублирующиеся прогоны пропускают существующие формы.

- [ ] **Step 2: Запустить seed локально**

```bash
npx tsx scripts/seed-forms.ts
```

Expected output:
```
created: form "Footer Lead" (id=...)
created: form "Popup Lead" (id=...)
created: form "Shop — нет модели" (id=...)
created: form "Product Page Consultation" (id=...)
created: form "Methods — консультация" (id=...)
```

Повторный запуск:
```
skip: form "Footer Lead" already exists (id=...)
...
```

- [ ] **Step 3: Verify в Studio**

`npm run dev` → Payload admin → Forms → видим 5 документов с правильными полями.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-forms.ts
git commit -m "feat(forms): seed script for 5 form definitions"
```

### Task 3.3: get-form-by-slug server helper

**Files:**
- Create: `src/lib/forms/get-form-by-slug.ts`

- [ ] **Step 1: Создать helper**

Используем `title` как identity (т.к. plugin-form-builder не даёт slug-поле из коробки), но снаружи API helper'а будет работать по короткому коду:

```ts
import 'server-only';
import { getPayload } from 'payload';
import config from '@/payload.config';

const TITLE_BY_SLUG: Record<string, string> = {
  'footer-lead': 'Footer Lead',
  'popup-lead': 'Popup Lead',
  'shop-no-model': 'Shop — нет модели',
  'product-page': 'Product Page Consultation',
  'methods-consultation': 'Methods — консультация',
};

const cache = new Map<string, string>();

export async function getFormIdBySlug(slug: keyof typeof TITLE_BY_SLUG): Promise<string> {
  if (cache.has(slug)) return cache.get(slug)!;

  const title = TITLE_BY_SLUG[slug];
  if (!title) throw new Error(`Unknown form slug: ${slug}`);

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'forms',
    where: { title: { equals: title } },
    limit: 1,
    depth: 0,
  });

  const id = result.docs[0]?.id;
  if (!id) throw new Error(`Form "${title}" not found — run seed-forms script`);

  cache.set(slug, String(id));
  return String(id);
}

export type FormSlug = keyof typeof TITLE_BY_SLUG;
```

Заметки:
- `server-only` гарантирует, что helper не попадёт в client bundle (он импортит payload local API).
- `cache` — module-level Map, переживает запросы внутри одного Lambda-инстанса, но не TTL'ится. Для смены title'ов нужен redeploy.

- [ ] **Step 2: Commit**

```bash
git add src/lib/forms/get-form-by-slug.ts
git commit -m "feat(forms): add getFormIdBySlug server helper"
```

### Task 3.4: rate-limit hook (TDD)

**Files:**
- Create: `src/hooks/rateLimitFormSubmissions.ts`
- Test: `src/hooks/rateLimitFormSubmissions.test.ts`

**Дизайн:** `beforeOperation` hook на коллекции `form-submissions`. На каждый `create` берёт IP клиента из `req.headers['x-forwarded-for'] || req.ip`, хеширует SHA-256, считает count submissions с тем же ip_hash за последние 60 секунд. Если ≥ 3 — бросает `APIError` 429.

Это требует, чтобы у form-submissions было поле `ipHash` для счёта. Добавим его через `formSubmissionOverrides.fields`.

- [ ] **Step 1: Расширить formSubmissionOverrides в payload.config.ts**

В `src/payload.config.ts` обнови `formSubmissionOverrides`:

```ts
formSubmissionOverrides: {
  admin: {
    group: 'Forms',
    defaultColumns: ['form', 'createdAt'],
  },
  fields: ({ defaultFields }) => [
    ...defaultFields,
    {
      name: 'ipHash',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
      index: true,
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar', hidden: true },
    },
    {
      name: 'bitrixLeadId',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'bitrixError',
      type: 'textarea',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  hooks: {
    beforeOperation: [
      // Будет добавлено через импорт, см. Step 4.
    ],
    afterChange: [
      // Bitrix + Telegram, Tasks 3.5-3.6
    ],
  },
},
```

Не коммить пока — допишем hooks ниже.

- [ ] **Step 2: Написать падающий тест**

Создай `src/hooks/rateLimitFormSubmissions.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { rateLimitFormSubmissions } from './rateLimitFormSubmissions';

function makeReq(ip: string) {
  return {
    headers: new Headers({ 'x-forwarded-for': ip, 'user-agent': 'test-agent' }),
    payload: {
      find: vi.fn(),
    },
  } as any;
}

describe('rateLimitFormSubmissions', () => {
  it('passes through non-create operations', async () => {
    const req = makeReq('1.2.3.4');
    await expect(
      rateLimitFormSubmissions({ operation: 'read', req, args: {} } as any),
    ).resolves.toBeUndefined();
    expect(req.payload.find).not.toHaveBeenCalled();
  });

  it('allows first submission for a fresh IP', async () => {
    const req = makeReq('1.2.3.4');
    req.payload.find.mockResolvedValueOnce({ totalDocs: 0 });

    await expect(
      rateLimitFormSubmissions({ operation: 'create', req, args: { data: {} } } as any),
    ).resolves.toBeUndefined();

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'form-submissions',
        where: expect.objectContaining({
          ipHash: expect.objectContaining({ equals: expect.any(String) }),
          createdAt: expect.objectContaining({ greater_than: expect.any(String) }),
        }),
      }),
    );
  });

  it('throws when more than 3 submissions in last minute', async () => {
    const req = makeReq('1.2.3.4');
    req.payload.find.mockResolvedValueOnce({ totalDocs: 3 });

    await expect(
      rateLimitFormSubmissions({ operation: 'create', req, args: { data: {} } } as any),
    ).rejects.toThrow(/rate limit/i);
  });

  it('writes ipHash and userAgent into args.data', async () => {
    const req = makeReq('5.6.7.8');
    req.payload.find.mockResolvedValueOnce({ totalDocs: 0 });

    const args: any = { data: { form: 'form-id' } };
    await rateLimitFormSubmissions({ operation: 'create', req, args } as any);

    expect(args.data.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(args.data.userAgent).toBe('test-agent');
  });

  it('uses unknown ipHash when no IP header present', async () => {
    const req = {
      headers: new Headers(),
      payload: { find: vi.fn().mockResolvedValueOnce({ totalDocs: 0 }) },
    } as any;
    const args: any = { data: {} };

    await rateLimitFormSubmissions({ operation: 'create', req, args } as any);

    expect(args.data.ipHash).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test — expected FAIL**

```bash
npm run test -- src/hooks/rateLimitFormSubmissions.test.ts
```

Expected: `Cannot find module './rateLimitFormSubmissions'`.

- [ ] **Step 4: Implement hook**

Создай `src/hooks/rateLimitFormSubmissions.ts`:

```ts
import { createHash } from 'node:crypto';
import { APIError, type CollectionBeforeOperationHook } from 'payload';

const WINDOW_SECONDS = 60;
const MAX_PER_WINDOW = 3;

function extractIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export const rateLimitFormSubmissions: CollectionBeforeOperationHook = async ({
  operation,
  req,
  args,
}) => {
  if (operation !== 'create') return;

  const ip = extractIp(req.headers);
  const ipHash = hashIp(ip);
  const userAgent = req.headers.get('user-agent') ?? '';

  // Inject system fields into the document
  args.data = {
    ...(args.data ?? {}),
    ipHash,
    userAgent,
  };

  const cutoff = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
  const recent = await req.payload.find({
    collection: 'form-submissions',
    where: {
      ipHash: { equals: ipHash },
      createdAt: { greater_than: cutoff },
    },
    limit: 0,
    depth: 0,
  });

  if (recent.totalDocs >= MAX_PER_WINDOW) {
    throw new APIError(
      'Too many submissions. Please wait a minute and try again.',
      429,
    );
  }
};
```

- [ ] **Step 5: Run test — expected PASS**

```bash
npm run test -- src/hooks/rateLimitFormSubmissions.test.ts
```

Expected: 5 passed.

- [ ] **Step 6: Подключить hook в payload.config.ts**

В `src/payload.config.ts` добавь импорт:

```ts
import { rateLimitFormSubmissions } from '@/hooks/rateLimitFormSubmissions';
```

И в `formBuilderPlugin → formSubmissionOverrides.hooks.beforeOperation` укажи `[rateLimitFormSubmissions]`.

- [ ] **Step 7: Generate + migrate (новое поле ipHash и др.)**

```bash
npm run payload generate:types
npm run payload migrate:create payload_form_submissions_extra_fields
npm run payload migrate
```

- [ ] **Step 8: Commit**

```bash
git add src/hooks/rateLimitFormSubmissions.ts src/hooks/rateLimitFormSubmissions.test.ts src/payload.config.ts src/payload-types.ts src/migrations/
git commit -m "feat(forms): rate-limit hook on form-submissions (3/min per IP-hash)"
```

### Task 3.5: notifyBitrix hook (TDD)

**Files:**
- Create: `src/hooks/notifyBitrix.ts`
- Test: `src/hooks/notifyBitrix.test.ts`

**Дизайн:** `afterChange` hook (только `operation === 'create'`). Если `BITRIX_WEBHOOK_URL` env пустой — no-op. Иначе POST на `<url>/crm.lead.add.json` с маппингом submissionData → fields. На успех — пишет `bitrixLeadId` через `req.payload.update`. На ошибку — `bitrixError`. Не блокирует создание лида (не reject'ит promise при failure).

- [ ] **Step 1: Написать падающий тест**

Создай `src/hooks/notifyBitrix.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { notifyBitrix } from './notifyBitrix';

function makeDoc(overrides: Partial<any> = {}) {
  return {
    id: 'sub-1',
    submissionData: [
      { field: 'name', value: 'Иван' },
      { field: 'phone', value: '+79991234567' },
      { field: 'email', value: 'iv@ex.com' },
      { field: 'comment', value: 'тест' },
    ],
    ...overrides,
  };
}

function makeReq() {
  return {
    payload: {
      update: vi.fn().mockResolvedValue({}),
      logger: { warn: vi.fn(), info: vi.fn() },
    },
  } as any;
}

describe('notifyBitrix', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.BITRIX_WEBHOOK_URL;
  });

  it('no-ops when BITRIX_WEBHOOK_URL not set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyBitrix({ operation: 'create', doc: makeDoc(), req: makeReq() } as any);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips non-create operations', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyBitrix({ operation: 'update', doc: makeDoc(), req: makeReq() } as any);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to crm.lead.add.json on create', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 99 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = makeReq();
    await notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.bitrix24.ru/rest/1/abc/crm.lead.add.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.fields.NAME).toBe('Иван');
    expect(body.fields.PHONE).toEqual([{ VALUE: '+79991234567', VALUE_TYPE: 'WORK' }]);
    expect(body.fields.EMAIL).toEqual([{ VALUE: 'iv@ex.com', VALUE_TYPE: 'WORK' }]);
    expect(body.fields.COMMENTS).toContain('тест');
  });

  it('writes bitrixLeadId on success', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 42 }),
    }));

    const req = makeReq();
    await notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any);

    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'form-submissions',
      id: 'sub-1',
      data: { bitrixLeadId: '42' },
      depth: 0,
    });
  });

  it('writes bitrixError on HTTP failure without throwing', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    }));

    const req = makeReq();
    await expect(
      notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any),
    ).resolves.toBeUndefined();

    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bitrixError: expect.stringContaining('500'),
        }),
      }),
    );
  });

  it('writes bitrixError on network exception', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const req = makeReq();
    await notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any);

    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bitrixError: expect.stringContaining('network down') }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**

```bash
npm run test -- src/hooks/notifyBitrix.test.ts
```

Expected: `Cannot find module './notifyBitrix'`.

- [ ] **Step 3: Implement**

Создай `src/hooks/notifyBitrix.ts`:

```ts
import type { CollectionAfterChangeHook } from 'payload';

type SubmissionField = { field: string; value: string };

function getField(data: SubmissionField[], name: string): string {
  return data.find((f) => f.field === name)?.value ?? '';
}

export const notifyBitrix: CollectionAfterChangeHook = async ({ operation, doc, req }) => {
  if (operation !== 'create') return;

  const url = process.env.BITRIX_WEBHOOK_URL;
  if (!url) return;

  const submissionData: SubmissionField[] = doc.submissionData ?? [];
  const name = getField(submissionData, 'name');
  const phone = getField(submissionData, 'phone');
  const email = getField(submissionData, 'email');
  const comment = getField(submissionData, 'comment');
  const referenceUrl = getField(submissionData, 'referenceUrl');

  const fields = {
    NAME: name || 'Без имени',
    PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : undefined,
    EMAIL: email ? [{ VALUE: email, VALUE_TYPE: 'WORK' }] : undefined,
    COMMENTS: [comment, referenceUrl && `Референс: ${referenceUrl}`]
      .filter(Boolean)
      .join('\n\n'),
    SOURCE_ID: 'WEB',
    TITLE: `Лид с сайта (submission ${doc.id})`,
  };

  const endpoint = url.endsWith('/') ? `${url}crm.lead.add.json` : `${url}/crm.lead.add.json`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const text = await res.text();
      await req.payload.update({
        collection: 'form-submissions',
        id: doc.id,
        data: { bitrixError: `HTTP ${res.status}: ${text.slice(0, 500)}` },
        depth: 0,
      });
      return;
    }

    const body = (await res.json()) as { result?: number | string; error?: string };
    if (body.result === undefined) {
      await req.payload.update({
        collection: 'form-submissions',
        id: doc.id,
        data: { bitrixError: `Bitrix returned no result: ${JSON.stringify(body).slice(0, 500)}` },
        depth: 0,
      });
      return;
    }

    await req.payload.update({
      collection: 'form-submissions',
      id: doc.id,
      data: { bitrixLeadId: String(body.result) },
      depth: 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await req.payload.update({
      collection: 'form-submissions',
      id: doc.id,
      data: { bitrixError: message.slice(0, 500) },
      depth: 0,
    });
  }
};
```

- [ ] **Step 4: Run test — expected PASS**

```bash
npm run test -- src/hooks/notifyBitrix.test.ts
```

Expected: 6 passed.

- [ ] **Step 5: Подключить hook в payload.config.ts**

В импортах:
```ts
import { notifyBitrix } from '@/hooks/notifyBitrix';
```

В `formSubmissionOverrides.hooks.afterChange` укажи `[notifyBitrix]`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/notifyBitrix.ts src/hooks/notifyBitrix.test.ts src/payload.config.ts
git commit -m "feat(forms): notifyBitrix afterChange hook with error capture"
```

### Task 3.6: notifyTelegram hook (TDD)

**Files:**
- Create: `src/hooks/notifyTelegram.ts`
- Test: `src/hooks/notifyTelegram.test.ts`

**Дизайн:** аналогично Bitrix, но без write-back в submission. Просто шлёт текст в чат через Bot API. Тихо игнорирует ошибки (warn в logger).

- [ ] **Step 1: Написать падающий тест**

Создай `src/hooks/notifyTelegram.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { notifyTelegram } from './notifyTelegram';

function makeDoc() {
  return {
    id: 'sub-1',
    submissionData: [
      { field: 'name', value: 'Иван' },
      { field: 'phone', value: '+79991234567' },
      { field: 'comment', value: 'тест-комментарий' },
    ],
  };
}

function makeReq() {
  return {
    payload: { logger: { warn: vi.fn(), info: vi.fn() } },
  } as any;
}

describe('notifyTelegram', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it('no-ops when env not set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyTelegram({ operation: 'create', doc: makeDoc(), req: makeReq() } as any);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no-ops on non-create', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    process.env.TELEGRAM_CHAT_ID = '123';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyTelegram({ operation: 'update', doc: makeDoc(), req: makeReq() } as any);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to Telegram Bot API on create', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    process.env.TELEGRAM_CHAT_ID = '123';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await notifyTelegram({ operation: 'create', doc: makeDoc(), req: makeReq() } as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botTOKEN/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe('123');
    expect(body.text).toContain('Иван');
    expect(body.text).toContain('+79991234567');
  });

  it('logs warn on HTTP failure without throwing', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    process.env.TELEGRAM_CHAT_ID = '123';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    const req = makeReq();
    await expect(
      notifyTelegram({ operation: 'create', doc: makeDoc(), req } as any),
    ).resolves.toBeUndefined();
    expect(req.payload.logger.warn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**

```bash
npm run test -- src/hooks/notifyTelegram.test.ts
```

- [ ] **Step 3: Implement**

Создай `src/hooks/notifyTelegram.ts`:

```ts
import type { CollectionAfterChangeHook } from 'payload';

type SubmissionField = { field: string; value: string };

function getField(data: SubmissionField[], name: string): string {
  return data.find((f) => f.field === name)?.value ?? '';
}

export const notifyTelegram: CollectionAfterChangeHook = async ({ operation, doc, req }) => {
  if (operation !== 'create') return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const data: SubmissionField[] = doc.submissionData ?? [];
  const name = getField(data, 'name');
  const phone = getField(data, 'phone');
  const email = getField(data, 'email');
  const comment = getField(data, 'comment');

  const text = [
    `🆕 Новая заявка (submission ${doc.id})`,
    `Имя: ${name || '—'}`,
    `Телефон: ${phone || '—'}`,
    email && `Email: ${email}`,
    comment && `\nКомментарий: ${comment}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      req.payload.logger.warn(
        { status: res.status, submissionId: doc.id },
        'Telegram notification failed',
      );
    }
  } catch (err) {
    req.payload.logger.warn({ err, submissionId: doc.id }, 'Telegram fetch threw');
  }
};
```

- [ ] **Step 4: Run test — expected PASS**

```bash
npm run test -- src/hooks/notifyTelegram.test.ts
```

- [ ] **Step 5: Подключить hook**

В `src/payload.config.ts`:
```ts
import { notifyTelegram } from '@/hooks/notifyTelegram';
```

И в `formSubmissionOverrides.hooks.afterChange`: `[notifyBitrix, notifyTelegram]`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/notifyTelegram.ts src/hooks/notifyTelegram.test.ts src/payload.config.ts
git commit -m "feat(forms): notifyTelegram afterChange hook"
```

### Task 3.7: Migrate LeadForm frontend

**Files:**
- Modify: `src/components/shared-components/lead-form/lead-form.tsx`
- Create: `src/lib/forms/submit-form.ts`
- Modify: `src/api/api.ts:108-130`

- [ ] **Step 1: Создать submit-form helper**

Создай `src/lib/forms/submit-form.ts`:

```ts
export type SubmitFieldValue = string | boolean;

export type SubmitFormPayload = {
  formId: string;
  fields: Record<string, SubmitFieldValue>;
};

export async function submitForm({ formId, fields }: SubmitFormPayload): Promise<{ id: string }> {
  const submissionData = Object.entries(fields)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .map(([field, value]) => ({ field, value: String(value) }));

  const res = await fetch('/api/form-submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ form: formId, submissionData }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('rate-limit');
    const text = await res.text().catch(() => '');
    throw new Error(`Submission failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as { doc?: { id: string } };
  return { id: body.doc?.id ?? '' };
}
```

- [ ] **Step 2: Refactor LeadForm**

Прочти текущий `src/components/shared-components/lead-form/lead-form.tsx`. Найди вызов `useCreateLeadMutation` и его триггер на submit. Замени логику отправки на использование `submitForm`.

Поскольку `submitForm` требует `formId`, который мы знаем только на server-side, передаём его пропсом сверху:

```tsx
// В props LeadForm:
type Props = {
  source: 'footer-lead' | 'popup-lead';
  formId: string;
  // ... остальные props
};

// В onSubmit handler:
import { submitForm } from '@/lib/forms/submit-form';

const onSubmit = async (formData: { name: string; phone: string; email?: string; agreement: boolean }) => {
  try {
    await submitForm({
      formId,
      fields: {
        name: formData.name,
        phone: formData.phone,
        email: formData.email ?? '',
        agreement: formData.agreement,
      },
    });
    setStatus('success');
  } catch (err) {
    setStatus(err instanceof Error && err.message === 'rate-limit' ? 'rate-limit' : 'error');
  }
};
```

Если в текущем LeadForm есть UI-состояние для rate-limit (`'Слишком много попыток, подождите минуту'`) — оставь. Если нет — добавь:

```tsx
{status === 'rate-limit' && <p>Слишком много заявок. Подождите минуту и попробуйте снова.</p>}
{status === 'error' && <p>Ошибка отправки. Попробуйте ещё раз.</p>}
```

- [ ] **Step 3: Pass formId from server components**

Найди все места, где рендерится `<LeadForm>` (footer layout, popup container). В каждом таком месте превратить родителя в server component (если ещё не) и пробрасывать formId:

```tsx
// Пример для footer (RSC):
import { getFormIdBySlug } from '@/lib/forms/get-form-by-slug';

export async function Footer() {
  const formId = await getFormIdBySlug('footer-lead');
  return <FooterClient formId={formId} />;
}
```

Если родитель — client component, превратить в server wrapper:

```tsx
// FooterServer.tsx (RSC)
import { getFormIdBySlug } from '@/lib/forms/get-form-by-slug';
import FooterClient from './FooterClient';
export default async function FooterServer() {
  const formId = await getFormIdBySlug('footer-lead');
  return <FooterClient formId={formId} />;
}
```

И импорт в layout заменить с `FooterClient` на `FooterServer`.

Аналогично для popup-формы (если popup рендерится client-side всегда — придётся либо передавать formId через store, либо инжектить из root server layout).

- [ ] **Step 4: Drop createLead из api.ts**

В `src/api/api.ts:108-130` удали `createLead` мутацию и тип `ICreateLeadPayload`. Также удали неиспользуемый `useCreateLeadMutation` экспорт (vitest/typecheck покажет, что осталось).

Проверь, что нет других потребителей: `grep -rn "useCreateLeadMutation\|ICreateLeadPayload" src/`.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Footer → заполни форму → submit. Ожидаемо:
1. Network tab: POST `/api/form-submissions` → 201.
2. В Payload Studio → Form Submissions → новый документ с `form = Footer Lead`, `ipHash` заполнен, `submissionData` содержит имя/телефон/email/agreement.
3. Если в env стоит `BITRIX_WEBHOOK_URL` — после ~1 сек в записи появится `bitrixLeadId` или `bitrixError`.
4. Повтори submit 4 раза подряд → 4-й должен вернуть 429.

- [ ] **Step 6: Commit**

```bash
git add src/lib/forms/submit-form.ts src/components/shared-components/lead-form/ src/api/api.ts
git commit -m "feat(lead-form): migrate footer/popup LeadForm to plugin-form-builder"
```

### Task 3.8: Migrate NoModelBlockForm + остальные точки входа

**Files:**
- Modify: `src/components/shared-components/noModelBlock/NoModelBlockForm.tsx`
- Modify: `src/components/shared-components/noModelBlock/NoModelBlock.tsx`

- [ ] **Step 1: Refactor NoModelBlockForm**

По аналогии с Task 3.7: принимаем `formId` пропсом, используем `submitForm` с `fields: { name, phone, comment }`.

- [ ] **Step 2: Server wrapper для NoModelBlock**

Превратить `NoModelBlock.tsx` в server component (или добавить server wrapper рядом). На сервере:

```tsx
import { getFormIdBySlug } from '@/lib/forms/get-form-by-slug';
const formId = await getFormIdBySlug('shop-no-model');
return <NoModelBlockClient formId={formId} />;
```

- [ ] **Step 3: Поиск других точек входа лидов**

```bash
grep -rn "useCreateLeadMutation\|/api/leads" src/ --include="*.tsx" --include="*.ts"
```

Если найдены ещё формы (product-page, methods-consultation) — мигрируй их аналогично, выбирая правильный slug из `TITLE_BY_SLUG`. Если потребителей больше нет (только legacy leads-страницы админки) — задокументируй.

- [ ] **Step 4: Manual smoke test**

`/shop` → блок «не нашли свою модель» → форма → submit → проверь Form Submissions в Studio.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared-components/noModelBlock/
git commit -m "feat(lead-form): migrate NoModelBlockForm to plugin-form-builder"
```

### Task 3.9: Lock down legacy Leads collection

**Files:**
- Modify: `src/collections/Leads.ts`

- [ ] **Step 1: Закрыть create-доступ + добавить description**

В `src/collections/Leads.ts`:

```ts
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'source', 'status', 'createdAt'],
    group: 'Legacy',
    description:
      'Архив лидов до перехода на plugin-form-builder. Новые submissions падают в коллекцию Form Submissions.',
  },
  access: {
    create: () => false, // было: () => true
    read: hasRole('admin', 'operations', 'marketing'),
    update: hasRole('admin', 'operations', 'marketing'),
    delete: hasRole('admin'),
  },
  // fields — без изменений
  // ...
};
```

- [ ] **Step 2: Regenerate types**

```bash
npm run payload generate:types
```

- [ ] **Step 3: Manual verification**

В Studio → Leads → попытайся создать запись через UI → должно быть запрещено (или скрыта кнопка Create). Read/update/delete работают как раньше.

- [ ] **Step 4: Commit**

```bash
git add src/collections/Leads.ts src/payload-types.ts
git commit -m "chore(leads): lock create-access on legacy Leads collection"
```

**Phase 3 done.** Шипуется одной PR (`feat/payload-form-builder`). Перед мержем:
- Убедись, что `BITRIX_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` выставлены в Vercel env (если планируется реальный flow) или явно пустые (тогда hooks no-op'ят).
- Запусти `npx tsx scripts/seed-forms.ts` против production БД (через `DATABASE_URI` указывающую на prod) ИЛИ зафигачь Form-документы вручную через production Studio.

---

## Phase 4: plugin-sentry (Payload-side errors) + client-side init

**Цель:** ошибки Payload (admin operations, hooks, REST 5xx) уходят в Sentry. Client-side Sentry (`sentry.client.config.ts`) тоже добавляется, чтобы покрыть React-ошибки на storefront.

**Артефакт фазы:** все три рантайма (nodejs, edge, browser) подключены к Sentry, ручная проверка через искусственный throw.

### Task 4.1: Install + register plugin-sentry

**Files:**
- Modify: `package.json`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Install**

```bash
npm install @payloadcms/plugin-sentry@^3.85.0
```

- [ ] **Step 2: Добавить import**

В `src/payload.config.ts`:

```ts
import { sentryPlugin } from '@payloadcms/plugin-sentry';
import * as Sentry from '@sentry/nextjs';
```

- [ ] **Step 3: Register в plugins array**

После `formBuilderPlugin({...})`:

```ts
sentryPlugin({
  Sentry,
  options: {
    captureErrors: [400, 403, 404, 408, 429, 500, 502, 503, 504],
  },
}),
```

Передаём уже-инициализированный `Sentry` из `@sentry/nextjs` (он init'ится в `instrumentation.ts`). Плагин нацепит handlers на Payload REST/GraphQL operations.

- [ ] **Step 4: Regenerate types + importMap**

```bash
npm run payload generate:types
npm run payload generate:importmap
```

Migrate не требуется (плагин не добавляет коллекций).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/payload.config.ts src/payload-types.ts src/app/\(payload\)/admin/importMap.js
git commit -m "feat(payload): register plugin-sentry on top of existing Next.js Sentry init"
```

### Task 4.2: Add client-side Sentry config

**Files:**
- Create: `sentry.client.config.ts`

- [ ] **Step 1: Создать client-side init**

В корне проекта (рядом с `instrumentation.ts`):

```ts
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    sendDefaultPii: false,
  });
}
```

Заметки:
- `replaysOnErrorSampleRate: 1.0` — Session Replay только при ошибках (бесплатный tier более чем достаточен).
- `replaysSessionSampleRate: 0.0` — нормальные сессии без replay.

- [ ] **Step 2: Проверить Next.js конфиг**

Прочти `next.config.mjs`. Если там НЕТ `withSentryConfig(...)` обёртки — добавь её в самом низу:

```ts
import { withSentryConfig } from '@sentry/nextjs';

// в самом конце файла:
export default withSentryConfig(nextConfig, {
  silent: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
});
```

Если уже есть — не трогай.

- [ ] **Step 3: Manual smoke test (без реального DSN)**

Без `SENTRY_DSN` в env. `npm run dev`. Открой консоль браузера на любой странице. Должно быть **тихо** (Sentry init не выполнился — `if (dsn)` сработал).

- [ ] **Step 4: Manual smoke test с DSN**

В `.env.local` добавь временно тестовый DSN (если есть Sentry-аккаунт):
```
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
```

Перезапусти `npm run dev`. На любой странице открой console → выполни:
```js
throw new Error('sentry-test-client')
```

В Sentry dashboard → Issues → должно появиться событие `sentry-test-client`.

Для server-side (Payload):
```bash
curl -X POST http://localhost:3000/api/leads -H 'Content-Type: application/json' -d '{}'
```

Должен прилететь 400 (zod validation в Leads collection), и Sentry — событие с тегами от Payload.

- [ ] **Step 5: Commit**

```bash
git add sentry.client.config.ts next.config.mjs
git commit -m "feat(sentry): add client-side init + withSentryConfig wrapper"
```

### Task 4.3: Update CLAUDE.md + env documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Раздел §11 (roadmap)**

В `CLAUDE.md` найди раздел **§11. Known issues / Roadmap → 🟢 Сделано** и добавь под последний батч:

```markdown
### 🟢 Сделано (батч 2026-05-30, payload-plugins)
- [x] plugin-redirects подключён + `src/middleware.ts` consume коллекции Redirects
- [x] plugin-import-export подключён к products/pages/leads
- [x] plugin-form-builder — полная миграция lead-pipeline: 5 Form документов (`scripts/seed-forms.ts`), submissions в `form-submissions`, восстановлены Bitrix/Telegram/rate-limit как hooks в `src/hooks/`
- [x] Legacy `leads` collection — `access.create: false`, group `Legacy`
- [x] plugin-sentry + client-side `sentry.client.config.ts` + `withSentryConfig` wrapper
```

- [ ] **Step 2: Раздел §10 (Critical files)**

Добавь в таблицу:
```markdown
| [src/hooks/notifyBitrix.ts](src/hooks/notifyBitrix.ts) | afterChange hook form-submissions → Bitrix24, error capture в `bitrixError` |
| [src/hooks/notifyTelegram.ts](src/hooks/notifyTelegram.ts) | afterChange hook → Telegram Bot API, тихо warn'ит при failure |
| [src/hooks/rateLimitFormSubmissions.ts](src/hooks/rateLimitFormSubmissions.ts) | beforeOperation: 3/мин по `ipHash` |
| [src/lib/forms/get-form-by-slug.ts](src/lib/forms/get-form-by-slug.ts) | Server helper для resolve form-id по короткому коду |
| [src/lib/forms/submit-form.ts](src/lib/forms/submit-form.ts) | Frontend submit helper |
| [src/middleware.ts](src/middleware.ts) | Consume Redirects collection — 307/308 по `from` |
| [scripts/seed-forms.ts](scripts/seed-forms.ts) | Idempotent seed 5 Form документов |
```

- [ ] **Step 3: Раздел §12 (Dev workflow)**

Под подсекцию `Переменные окружения` добавь Sentry:

```markdown
Для Sentry — обе переменные нужны (server + client):
```
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
NEXT_PUBLIC_SENTRY_DSN=<тот же DSN>
```

Если DSN не выставлен — Sentry no-op'ит везде.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): document payload-plugins batch (redirects/import-export/form-builder/sentry)"
```

**Phase 4 done.**

---

## Final verification (после всех 4 фаз)

- [ ] **Step 1: Full test run**

```bash
npm run test
```

Expected: все тесты проходят, включая новые (lookup-redirect, rateLimitFormSubmissions, notifyBitrix, notifyTelegram).

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 ошибок.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: успешная сборка, никаких warning'ов про missing modules от плагинов.

- [ ] **Step 4: Manual end-to-end через preview deploy**

Опционально (если есть Vercel preview alias для feature-ветки):
1. Создай Redirect `/test-pre-launch → /shop` → curl → 307.
2. Submit footer form → проверь Form Submission в production Studio.
3. Если в Vercel env стоит реальный `BITRIX_WEBHOOK_URL` → проверь, что в записи появился `bitrixLeadId`.
4. Открой Products list → Export → import обратно без изменений → diff data → ничего не изменилось.

---

## Self-review notes

**Spec coverage:** 4 фазы покрывают все 4 плагина из брифа.
- ✅ plugin-form-builder с полной миграцией lead-pipeline → Phase 3
- ✅ plugin-redirects → Phase 1
- ✅ plugin-import-export → Phase 2
- ✅ plugin-sentry → Phase 4

**Edge cases addressed:**
- Bitrix/Telegram потеря при миграции на Payload `leads` — восстановлено в Phase 3 как hooks
- Rate-limit потерян — восстановлен в Phase 3 Task 3.4
- Sentry уже частично подключён (server + edge через instrumentation.ts) — Phase 4 дополняет client + Payload
- Plugin-redirects уже в package.json — Phase 1 короче (нет install шага)

**Known not-in-scope (документировано в pre-flight):**
- Stripe (РФ)
- Multi-tenant
- Sentry alerts/dashboards setup
- Удаление Leads collection (оставлена как legacy)

**Risk flags:**
- Phase 3 Task 3.7 (LeadForm refactor) ломает рабочий submission flow — нужно тщательное manual testing перед мержем. Откат: revert + повторное создание create-lead Edge Function из git history.
- Server-component wrapping в Phase 3 Task 3.7 Step 3 может потребовать перестановки import'ов в layout'ах (footer/popup). Если LeadForm рендерится в `'use client'` компоненте на нескольких уровнях — придётся прокидывать formId через React Context или Redux.
