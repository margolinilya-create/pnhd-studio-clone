# Pre-launch hardening + tech debt — Design

**Date:** 2026-05-27
**Status:** Approved (brainstorming phase)
**Scope:** Закрыть Medium-priority долги из CLAUDE.md §11 («стоит закрыть до запуска») и Cosmetic / tech-debt пункты, кроме явно отложенных.
**Outcome:** Два PR. PR1 — pre-launch hardening. PR2 — tech debt.

---

## 1. Why now

Админ-кабинет уже на проде, каталог-импорт + лид-пайплайн отгружены. Сайт — прототип, реального трафика нет. До настоящего запуска нужно закрыть «гнильцу», которая копится в инфраструктуре (PII, orphan-файлы, открытые whitelist'ы), и привести фронт в порядок — Three.js в общем бандле, copy-paste категорий, неактивный sidebar.

Two-PR split: hardening касается БД / Storage / Edge Functions и несёт миграции — отдельный risk-bucket. Tech-debt — чисто фронт. Ревью получается дешевле.

---

## 2. Decisions (locked)

| Решение | Значение | Reason |
|---|---|---|
| Leads retention | **90 дней** | 152-ФЗ purpose-limited storage; лиды быстро уходят в Bitrix24 (когда подключим), `public.leads` — оперативный буфер |
| Retention механика | **DELETE строк целиком** | Анонимизация не даёт ценности — без PII строка бесполезна для бизнеса |
| Orphan GC | **Client + sweeper (оба)** | Клиент покрывает 90% случаев когда пользователь сам убрал/удалил; sweeper подметает abandoned-сессии |
| Sweeper retention | **14 дней** | sessionStorage умирает при закрытии вкладки; типичный путь покупки — минуты-часы, не недели; 14 дней с большим запасом |
| 2FA | **Отложено** | 1 админ, прототип, нет реального риска |
| Категорий refactor | **Да, в этот батч** | 6×150 строк копипасты — рефакторится за час |
| URL'ы категорий | **Не трогаем** | `/futbolki`, `/hudi` и т.д. остаются — SEO не ломаем |

---

## 3. Out-of-scope (с обоснованием)

| Пункт | Почему скип |
|---|---|
| `/blog/[post]` `dynamicParams=false` | Уже `true` ([blog/[post]/page.tsx:27](src/app/blog/[post]/page.tsx#L27)). CLAUDE.md §11 устарел — обновим. |
| `dangerouslySetInnerHTML × 6` | Все источники доверенные: 4 из TS-data (наш репо), 1 blog HTML уже санитайзится DOMPurify в admin при save, 1 JSON-LD сами генерим. Defense-in-depth не критичен. |
| RTK Query baseUrl на мёртвый pnhdstudioapi.ru | Перепишется когда сделаем CDEK + orders Edge Functions — одним заходом, чтобы не править дважды. |
| 15 битых product images на `cdn.pnhd.ru` | Нужны исходники от ОП. Через admin-форму перезаливаются вручную, не код. |
| 2FA через Supabase MFA | Отложено per scope decision. |

---

## 4. PR1 — Pre-launch hardening

### 4.1 Leads retention (90 дней)

**Миграция:** `supabase/migrations/20260527000009_leads_retention.sql`

```sql
-- Включить pg_cron (idempotent)
create extension if not exists pg_cron with schema extensions;

-- Удалять лиды старше 90 дней каждый день в 03:00 UTC (06:00 MSK)
select cron.schedule(
  'cleanup-old-leads',
  '0 3 * * *',
  $$delete from public.leads where created_at < now() - interval '90 days'$$
);
```

**Rollback:** `select cron.unschedule('cleanup-old-leads');` — задокументировано в комментарии миграции.

**Verify:** после применения — `select * from cron.job where jobname = 'cleanup-old-leads';` должен показать 1 строку. Через сутки — `select * from cron.job_run_details where jobname = 'cleanup-old-leads' order by start_time desc limit 5;` показывает успешные запуски.

### 4.2 Orphan files — client cleanup

**Schema change:**

[src/app/utils/types.ts](src/app/utils/types.ts) — `IPrintFileRef`:

```ts
export interface IPrintFileRef {
  url: string;
  filename: string;
  sizeBytes: number;
  path: string;  // НОВОЕ: путь внутри bucket `user-uploads`, для `storage.remove()`
}
```

[src/lib/storage/upload-print.ts](src/lib/storage/upload-print.ts) — `uploadPrintFile` возвращает `path` вместе с `url`.

[src/redux/middleware/cart-persist.ts](src/redux/middleware/cart-persist.ts) — bump `CART_STORAGE_KEY = 'order_v3'`, **legacy `order_v2`-ключи дополнительно чистятся** в CartIcon при mount (как сейчас чистится `order`). Старые корзины без `path` сбросятся — для прототипа без боли.

**Новый listener:** `src/redux/middleware/cart-orphan-cleanup.ts`

Логика:
- Слушает actions: `clearPrintFile`, `clearAllPrints`, `deleteItemFromCart`, `resetCart`
- Берёт `previousState.cart.order` и `currentState.cart.order`
- Считает paths которые были в previousState, но не в currentState
- Вызывает `getSupabaseClient().storage.from('user-uploads').remove(removedPaths)` — best-effort, ошибки логирует но не reject'ит action

**Restore-валидация:** в CartIcon при `restoreCart` — если в массиве встречается `IPrintFileRef` без `path` (например, юзер обновился со старого билда) — best-effort, не блокируем. Просто такие файлы не подметутся client-side; их добьёт sweeper.

### 4.3 Orphan files — sweeper Edge Function

**Edge Function:** `supabase/functions/cleanup-user-uploads/index.ts`

- `verify_jwt: false`
- Auth: проверяет header `X-Cleanup-Secret` против env-переменной `CLEANUP_SECRET`. Без секрета — 401.
- Логика:
  ```ts
  // List all objects under prints/
  const { data: objects } = await supabase
    .storage.from('user-uploads')
    .list('prints', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } });

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const toDelete = objects
    .filter(o => new Date(o.created_at) < cutoff)
    .map(o => `prints/${o.name}`);

  if (toDelete.length > 0) {
    await supabase.storage.from('user-uploads').remove(toDelete);
  }
  return new Response(JSON.stringify({ deleted: toDelete.length }), { status: 200 });
  ```
- Paginate: если objects.length === 1000 — повторить с offset (но реалистично 1000 файлов за 14 дней не наберём, оставим TODO-комментом).

**Env:** `CLEANUP_SECRET` — выставляется в Supabase Dashboard → Edge Functions → Secrets. Генерируется `openssl rand -hex 32`.

**Миграция cron-job:** `supabase/migrations/20260527000010_user_uploads_sweeper.sql`

```sql
create extension if not exists pg_net with schema extensions;

-- vault.create_secret сохраняет secret encrypted-at-rest, можно достать через vault.decrypted_secrets
select vault.create_secret(
  '<CLEANUP_SECRET_VALUE>',  -- runtime-замена через psql variable
  'edge_function_cleanup_secret',
  'Secret for cleanup-user-uploads edge function'
);

select cron.schedule(
  'cleanup-user-uploads',
  '30 3 * * *',
  $$
  select net.http_post(
    url := 'https://almfjmiygtnzngkayhdv.supabase.co/functions/v1/cleanup-user-uploads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cleanup-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_cleanup_secret')
    )
  );
  $$
);
```

**Open question:** vault.create_secret в миграции ставит фиксированный secret в коде → коммит небезопасный. Вариант: миграция создаёт пустой secret-placeholder, реальный secret выставляется через Supabase Dashboard SQL Editor отдельно. Или через MCP `execute_sql` с secret из env. Решим во время implementation.

**Verify:** через сутки — `select * from cron.job_run_details where jobname = 'cleanup-user-uploads';` + `get_logs` на Edge Function.

### 4.4 Image whitelist tighten

[next.config.mjs](next.config.mjs):

```diff
- hostname: '*.supabase.co',
+ hostname: 'almfjmiygtnzngkayhdv.supabase.co',
```

Если когда-нибудь переключим Supabase project ref (миграция в другой регион / новый аккаунт) — придётся обновить вручную, что и так нужно делать (URL для клиентов).

---

## 5. PR2 — Tech debt

### 5.1 Three.js dynamic import

**Места вызова `<Tee>`:**
- `src/components/pages-components/main-page/main-screen/main-screen.tsx` (предположительно — найти grep'ом)
- `src/components/pages-components/shop-page/shop-lead-screen/...`

**Подход:**

```tsx
// Было:
import Tee from '@/components/shared-components/3d-tee/3d-tee';

// Стало:
import dynamic from 'next/dynamic';

const Tee = dynamic(() => import('@/components/shared-components/3d-tee/3d-tee'), {
  ssr: false,
  loading: () => <TeePlaceholder />,
});
```

**Placeholder:** простой SVG-силуэт футболки в фирменном цвете + skeleton-pulse animation. Файл — `src/components/shared-components/3d-tee/tee-placeholder.tsx`.

**Expected gain:** ~600 КБ gzipped с initial bundle на главной (three + drei + maath + GLB-loader).

### 5.2 Категории 6→generic

**Новый компонент:** `src/components/pages-components/category-page/category-page.tsx`

```tsx
'use server';  // или просто async serverComponent

import { IProduct } from '@/app/utils/types';
import { getAllProducts } from '@/lib/queries/products';
import ProductCardsBlock from '../shop-page/product-cards-block/product-cards-block';
import FaqSection from '../main-page/faq-screen/faq-screen';
import MarkupScript from '@/components/shared-components/markup-script/markup-script';
import { SITE_INFO } from '@/app/constants';
import styles from '@/app/contacts/page.module.css';

export interface ICategoryPageConfig {
  slug: string;           // 'futbolki' | 'hudi' | ...
  productType: string;    // 'tshirt' | 'hoodie' | ...
  h1: string;
  metaTitle: string;
  metaDescription: string;
  faqSet: Array<{ title: string; text: string }>;
  bodyHtml: React.ReactNode;  // SEO-копи блок: <h2>...</h2><p>...</p> и т.д.
}

export default async function CategoryPage({ config }: { config: ICategoryPageConfig }) {
  const products = await getAllProducts({ type: config.productType });
  const jsonLd = buildJsonLd(config);  // breadcrumb + webpage + faq

  return (
    <>
      <MarkupScript jsonLd={jsonLd.breadcrumb} />
      <MarkupScript jsonLd={jsonLd.webpage} />
      <MarkupScript jsonLd={jsonLd.faq} />
      {/* breadcrumbs, title, products, body, faq */}
    </>
  );
}
```

**Каждый `/{category}/page.tsx`:**

```tsx
import { Metadata } from 'next';
import CategoryPage from '@/components/pages-components/category-page/category-page';
import { config } from './config';

export const metadata: Metadata = {
  title: config.metaTitle,
  description: config.metaDescription,
  metadataBase: new URL('https://studio.pnhd.ru'),
};

export default async function Page() {
  return <CategoryPage config={config} />;
}
```

**Каждый `/{category}/config.ts`:**

```tsx
import { ICategoryPageConfig } from '@/components/pages-components/category-page/category-page';

export const config: ICategoryPageConfig = {
  slug: 'futbolki',
  productType: 'tshirt',
  h1: 'Печать на футболках в Санкт-Петербурге',
  metaTitle: '...',
  metaDescription: '...',
  faqSet: [/* ... */],
  bodyHtml: (
    <>
      <h2>...</h2>
      <p>...</p>
    </>
  ),
};
```

**Risk:** `bodyHtml` как JSX-нода нужно убедиться что сериализуется при RSC. Если упрётся — fallback: `bodyHtml: string` + `dangerouslySetInnerHTML`. Этот контент мы сами пишем (как было), XSS не появляется. Решим при implementation.

### 5.3 Active-link sidebar (admin)

[src/components/admin/admin-shell.tsx](src/components/admin/admin-shell.tsx) (или где sidebar) — добавить:

```tsx
'use client';
import { usePathname } from 'next/navigation';

// в render:
const pathname = usePathname();
const isActive = (href: string) =>
  href === '/admin'
    ? pathname === '/admin'
    : pathname.startsWith(href);
```

MUI `ListItemButton` `selected={isActive(href)}` или CSS-класс с акцентным фоном. Стилистика — match brand (тёмно-синий или фиолетовый из палитры).

---

## 6. CLAUDE.md updates

После PR2 merge — обновить:

| Раздел | Что |
|---|---|
| §4 (State management) | Добавить упоминание `cart-orphan-cleanup.ts` middleware и `CART_STORAGE_KEY = 'order_v3'` |
| §6 (Edge Functions) | Добавить `cleanup-user-uploads` в таблицу |
| §10 (Critical files) | Добавить `cart-orphan-cleanup.ts`, `category-page/category-page.tsx`, `tee-placeholder.tsx` |
| §11 (Known issues) | Вычеркнуть всё закрытое; снять пункт «`/blog/[post]` dynamicParams=false» (устарел) |
| §13 (Deployment) | Если что-то поменяется в env — добавить `CLEANUP_SECRET` упоминание (только для Edge Function secrets, не Next.js env) |

---

## 7. Testing & verification

**PR1:**
- [ ] После применения миграций — `select * from cron.job` показывает 2 новых job'а (`cleanup-old-leads`, `cleanup-user-uploads`)
- [ ] Edge Function `cleanup-user-uploads` отвечает 401 без header, 200 с header. Smoke test через curl.
- [ ] Через ~24 часа после merge — `cron.job_run_details` показывает успешные запуски.
- [ ] Создаём тестовый лид → ставим `update leads set created_at = now() - interval '91 days'` → ждём cron tick → проверяем что удалился.
- [ ] Локально: добавляем принт в корзину → удаляем → проверяем что file-объект в bucket исчез.

**PR2:**
- [ ] `next build` проходит, bundle size падает на главной (сравнить с baseline через `analyze`).
- [ ] Все 6 категорийных URL отдают тот же контент что и до рефакторинга (визуальный diff + ручной обход).
- [ ] Active-link корректно подсвечивает все 5 пунктов sidebar при навигации между ними.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Vault secret в миграции коммитится в git | Разнести: миграция создаёт пустой placeholder, реальный secret выставляется через Dashboard SQL Editor с runtime-сгенерированным значением. Документируем в notes. |
| pg_cron не включается на бесплатном Supabase plan | Проверить tier до миграции — `select * from pg_available_extensions where name = 'pg_cron';`. Если не доступен — отложить retention до апгрейда plan'а. |
| `storage.list` paginate >1000 | Реалистично не достигнем за 14 дней; TODO-коммент + alert если приближаемся. |
| Bump `order_v2 → order_v3` теряет корзины активных пользователей | Прототип, реальных юзеров нет. Cleanup legacy ключа в CartIcon (как уже делается для `order`). |
| Category refactor ломает SEO | URL'ы не трогаем; content идентичен; canonical tags остаются. Diff'аем рендер до/после. |

---

## 9. Sub-projects → plans

PR1 и PR2 — это два отдельных plan'а:

- `docs/superpowers/plans/2026-05-27-prelaunch-hardening.md` — миграции + Edge Function + orphan GC + image whitelist
- `docs/superpowers/plans/2026-05-27-tech-debt-frontend.md` — three.js dynamic + category refactor + sidebar active-link
