# Pre-launch hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть Medium-priority pre-launch долги: 90-дневное удержание лидов (pg_cron DELETE), сборка мусора в `user-uploads` (client middleware + nightly Edge Function sweeper), сужение image whitelist'а в Next.js.

**Architecture:** SQL-миграции включают `pg_cron` + `pg_net`, расписывают два nightly cron job'а (`cleanup-old-leads`, `cleanup-user-uploads`). Edge Function `cleanup-user-uploads` авторизуется через секретный header, листает Storage и удаляет объекты старше 14 дней. На фронте `IPrintFileRef` обогащается полем `path`, новый listener middleware diff'ит cart-state и подметает удалённые файлы в Storage. `CART_STORAGE_KEY` поднимается до `order_v3` (старые корзины сбросятся — прототип). `next.config.mjs` whitelist сужается с `*.supabase.co` до конкретного project-subdomain.

**Tech Stack:** Supabase (Postgres + pg_cron + pg_net + Vault + Storage + Edge Functions Deno), Redux Toolkit listener middleware, Next.js 14, TypeScript.

---

## File structure

**Создаются:**
- `supabase/migrations/20260527000009_leads_retention.sql` — pg_cron job для DELETE лидов
- `supabase/migrations/20260527000010_user_uploads_sweeper.sql` — pg_cron + pg_net вызов Edge Function
- `supabase/functions/cleanup-user-uploads/index.ts` — sweeper logic
- `supabase/functions/cleanup-user-uploads/deno.json` — Deno config (если нужно)
- `src/redux/middleware/cart-orphan-cleanup.ts` — listener middleware для storage.remove

**Модифицируются:**
- `src/app/utils/types.ts` — добавить `path: string` в `IPrintFileRef`
- `src/lib/storage/upload-print.ts` — возвращать `path`
- `src/redux/middleware/cart-persist.ts` — bump `CART_STORAGE_KEY` `order_v2 → order_v3`
- `src/components/shared-components/cart-icon/cart-icon.tsx` — добавить cleanup legacy `order_v2`
- `src/redux/store.ts` — подключить новый listener middleware
- `next.config.mjs` — сузить image hostname
- `CLAUDE.md` — обновить §4, §6, §10, §11, §13

---

## Task 1: Migration — leads retention (pg_cron)

**Files:**
- Create: `supabase/migrations/20260527000009_leads_retention.sql`

- [ ] **Step 1: Verify pg_cron extension is available on Supabase project**

Run via Supabase MCP `execute_sql` on project `almfjmiygtnzngkayhdv`:

```sql
select name, default_version, installed_version
from pg_available_extensions
where name in ('pg_cron', 'pg_net');
```

Expected: обе extension'ы доступны (default_version заполнен).

Если pg_cron недоступен на текущем Supabase plan — **остановиться**. Сообщить пользователю и спросить про апгрейд plan'а перед продолжением.

- [ ] **Step 2: Write migration file**

```sql
-- supabase/migrations/20260527000009_leads_retention.sql
--
-- Удерживаем лиды в public.leads 90 дней (152-ФЗ purpose-limited storage).
-- Cron-задача ежедневно в 03:00 UTC удаляет всё что старше cutoff.
--
-- Rollback: select cron.unschedule('cleanup-old-leads');

create extension if not exists pg_cron with schema extensions;

-- Drop существующего job'а (idempotent rerun миграции)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-old-leads') then
    perform cron.unschedule('cleanup-old-leads');
  end if;
end $$;

select cron.schedule(
  'cleanup-old-leads',
  '0 3 * * *',
  $cron$delete from public.leads where created_at < now() - interval '90 days'$cron$
);
```

- [ ] **Step 3: Apply migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with:
- project_id: `almfjmiygtnzngkayhdv`
- name: `leads_retention`
- query: содержимое файла из Step 2 (без комментов `-- supabase/migrations/...`)

Expected: success, no errors.

- [ ] **Step 4: Verify cron job was created**

```sql
select jobname, schedule, command, active
from cron.job
where jobname = 'cleanup-old-leads';
```

Expected: одна строка с schedule `'0 3 * * *'`, active=true.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260527000009_leads_retention.sql
git commit -m "feat(db): 90-day retention policy on public.leads via pg_cron"
```

---

## Task 2: Edge Function — cleanup-user-uploads

**Files:**
- Create: `supabase/functions/cleanup-user-uploads/index.ts`

- [ ] **Step 1: Write Edge Function**

```typescript
// supabase/functions/cleanup-user-uploads/index.ts
//
// Подметает orphan-файлы в bucket `user-uploads/prints/` старше 14 дней.
// Вызывается nightly через pg_cron + pg_net; авторизуется через X-Cleanup-Secret header.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLEANUP_SECRET = Deno.env.get('CLEANUP_SECRET');

const BUCKET = 'user-uploads';
const PREFIX = 'prints';
const MAX_AGE_DAYS = 14;
const LIST_LIMIT = 1000;

Deno.serve(async (req) => {
  // Auth: единственный валидный вызов — c X-Cleanup-Secret matching env
  if (!CLEANUP_SECRET) {
    return new Response(JSON.stringify({ error: 'CLEANUP_SECRET not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const provided = req.headers.get('X-Cleanup-Secret');
  if (provided !== CLEANUP_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: objects, error: listErr } = await supabase
    .storage.from(BUCKET)
    .list(PREFIX, { limit: LIST_LIMIT, sortBy: { column: 'created_at', order: 'asc' } });

  if (listErr) {
    return new Response(JSON.stringify({ error: `list failed: ${listErr.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!objects) {
    return new Response(JSON.stringify({ deleted: 0, note: 'empty bucket' }), { status: 200 });
  }

  // TODO: paginate если objects.length === LIST_LIMIT. За 14 дней реалистично не наберём.
  if (objects.length === LIST_LIMIT) {
    console.warn(`[cleanup-user-uploads] list hit limit ${LIST_LIMIT}, pagination not implemented`);
  }

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const toDelete = objects
    .filter((o) => o.created_at && new Date(o.created_at) < cutoff)
    .map((o) => `${PREFIX}/${o.name}`);

  if (toDelete.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(toDelete);
  if (rmErr) {
    return new Response(JSON.stringify({ error: `remove failed: ${rmErr.message}`, attempted: toDelete.length }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ deleted: toDelete.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Generate CLEANUP_SECRET и записать в Supabase secrets**

```bash
openssl rand -hex 32
```

Скопировать output. Затем — Supabase Dashboard → Project Settings → Edge Functions → Manage Secrets → New Secret:
- Name: `CLEANUP_SECRET`
- Value: вставить сгенерированный hex

**Сохрани этот secret в Vercel/локальный keychain тоже** — он понадобится в Task 3 для миграции pg_net.

- [ ] **Step 3: Deploy Edge Function via MCP**

Use `mcp__claude_ai_Supabase__deploy_edge_function` with:
- project_id: `almfjmiygtnzngkayhdv`
- name: `cleanup-user-uploads`
- entrypoint_path: `index.ts`
- verify_jwt: `false` (default; явно проверь что не `true`)
- files: `[{ name: 'index.ts', content: <содержимое файла> }]`

Expected: success, function URL `https://almfjmiygtnzngkayhdv.supabase.co/functions/v1/cleanup-user-uploads`.

- [ ] **Step 4: Smoke test — auth gate (без header)**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://almfjmiygtnzngkayhdv.supabase.co/functions/v1/cleanup-user-uploads
```

Expected: `401`.

- [ ] **Step 5: Smoke test — с валидным secret**

```bash
curl -sS -X POST \
  -H "X-Cleanup-Secret: <CLEANUP_SECRET_VALUE>" \
  https://almfjmiygtnzngkayhdv.supabase.co/functions/v1/cleanup-user-uploads
```

Expected: `{"deleted": 0}` (на проде ещё пусто; или N если успели накидать orphan'ов).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/cleanup-user-uploads/index.ts
git commit -m "feat(edge): cleanup-user-uploads Edge Function (14-day sweeper)"
```

---

## Task 3: Migration — sweeper cron job

**Files:**
- Create: `supabase/migrations/20260527000010_user_uploads_sweeper.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260527000010_user_uploads_sweeper.sql
--
-- pg_cron вызывает Edge Function cleanup-user-uploads ежедневно в 03:30 UTC.
-- Секрет хранится в Vault, не в коде миграции.
--
-- ВАЖНО: перед применением миграции — секрет CLEANUP_SECRET должен быть
-- создан в vault:
--   select vault.create_secret('<CLEANUP_SECRET_VALUE>', 'edge_function_cleanup_secret');
-- Это делается вручную через Supabase Dashboard SQL Editor отдельно от миграции,
-- чтобы значение секрета не попадало в git.
--
-- Rollback: select cron.unschedule('cleanup-user-uploads');

create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-user-uploads') then
    perform cron.unschedule('cleanup-user-uploads');
  end if;
end $$;

select cron.schedule(
  'cleanup-user-uploads',
  '30 3 * * *',
  $cron$
    select net.http_post(
      url := 'https://almfjmiygtnzngkayhdv.supabase.co/functions/v1/cleanup-user-uploads',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cleanup-Secret', (
          select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_cleanup_secret'
        )
      )
    ) as request_id;
  $cron$
);
```

- [ ] **Step 2: Store CLEANUP_SECRET в Supabase Vault**

В Supabase Dashboard → SQL Editor выполнить (вставив реальное значение секрета из Task 2 Step 2):

```sql
select vault.create_secret(
  '<PASTE_CLEANUP_SECRET_VALUE_HERE>',
  'edge_function_cleanup_secret',
  'Secret for invoking cleanup-user-uploads Edge Function from pg_cron'
);
```

**НЕ коммитить этот SQL в репозиторий.** Document'ируется в `docs/superpowers/notes/`.

Verify:

```sql
select name from vault.decrypted_secrets where name = 'edge_function_cleanup_secret';
```

Expected: одна строка.

- [ ] **Step 3: Apply migration via MCP**

Use `mcp__claude_ai_Supabase__apply_migration`:
- project_id: `almfjmiygtnzngkayhdv`
- name: `user_uploads_sweeper`
- query: содержимое файла из Step 1

Expected: success.

- [ ] **Step 4: Verify cron job создан**

```sql
select jobname, schedule, active from cron.job where jobname = 'cleanup-user-uploads';
```

Expected: schedule `'30 3 * * *'`, active=true.

- [ ] **Step 5: Manual trigger cron-задачи для проверки**

```sql
-- Один разовый запуск http_post вручную, чтобы убедиться что pg_net умеет хитать функцию
select net.http_post(
  url := 'https://almfjmiygtnzngkayhdv.supabase.co/functions/v1/cleanup-user-uploads',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'X-Cleanup-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_cleanup_secret')
  )
);
```

Через 5-10 секунд:

```sql
select id, status_code, content
from net._http_response
order by created desc
limit 5;
```

Expected: одна строка со `status_code = 200`, content начинается с `{"deleted":`.

- [ ] **Step 6: Document Vault setup в notes**

Create `docs/superpowers/notes/2026-05-27-supabase-vault-secrets.md`:

```markdown
# Supabase Vault secrets — manual setup

These secrets are stored in `vault.secrets` and decrypted via `vault.decrypted_secrets`.
They are NOT in git — values must be set manually via Dashboard SQL Editor.

## edge_function_cleanup_secret

Used by migration `20260527000010_user_uploads_sweeper.sql` (pg_cron job
`cleanup-user-uploads`) to authenticate against the Edge Function of the
same name.

Setup (one-time):

\`\`\`sql
select vault.create_secret(
  '<HEX_VALUE>',  -- openssl rand -hex 32
  'edge_function_cleanup_secret',
  'Secret for invoking cleanup-user-uploads Edge Function from pg_cron'
);
\`\`\`

The same hex value must also be set as the `CLEANUP_SECRET` env in
Supabase Dashboard → Edge Functions → Secrets so the function can
verify the header.

To rotate:

\`\`\`sql
select vault.update_secret(
  (select id from vault.secrets where name = 'edge_function_cleanup_secret'),
  '<NEW_HEX_VALUE>'
);
\`\`\`

And update `CLEANUP_SECRET` env on the function side to match.
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260527000010_user_uploads_sweeper.sql \
        docs/superpowers/notes/2026-05-27-supabase-vault-secrets.md
git commit -m "feat(db): nightly sweeper cron for orphan user-uploads files"
```

---

## Task 4: Schema bump — IPrintFileRef.path

**Files:**
- Modify: `src/app/utils/types.ts`
- Modify: `src/lib/storage/upload-print.ts`

- [ ] **Step 1: Add `path` field to IPrintFileRef**

Edit `src/app/utils/types.ts` lines 36-40:

```ts
export interface IPrintFileRef {
  url: string;
  filename: string;
  sizeBytes: number;
  path: string;  // путь внутри bucket `user-uploads` для последующего storage.remove()
}
```

- [ ] **Step 2: Update uploadPrintFile to return path**

Edit `src/lib/storage/upload-print.ts` — функция `uploadPrintFile` уже строит `path` внутри. Просто верни его:

```ts
export async function uploadPrintFile(file: File): Promise<IPrintFileRef> {
  if (typeof window === 'undefined') {
    throw new Error('uploadPrintFile must be called in the browser');
  }
  if (!isAllowedMime(file)) {
    throw new Error('Поддерживаются только PNG, JPG и WEBP');
  }
  const supabase = getSupabaseClient();
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${PATH_PREFIX}/${id}-${sanitizeFilename(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    url: data.publicUrl,
    filename: file.name,
    sizeBytes: file.size,
    path,
  };
}
```

- [ ] **Step 3: Typecheck passes**

```bash
npx tsc --noEmit
```

Expected: no errors. Если есть ошибка про отсутствие `path` где-то ещё — там вручную добавляется (consumers либо deserialize'ят из cart, либо строят `IPrintFileRef`-ы в новом месте).

- [ ] **Step 4: Commit**

```bash
git add src/app/utils/types.ts src/lib/storage/upload-print.ts
git commit -m "feat(cart): IPrintFileRef.path for orphan-cleanup support"
```

---

## Task 5: Bump CART_STORAGE_KEY + legacy cleanup

**Files:**
- Modify: `src/redux/middleware/cart-persist.ts:4`
- Modify: `src/components/shared-components/cart-icon/cart-icon.tsx:34-35`

- [ ] **Step 1: Bump CART_STORAGE_KEY**

Edit `src/redux/middleware/cart-persist.ts:4`:

```ts
export const CART_STORAGE_KEY = 'order_v3';
```

- [ ] **Step 2: Add v2 legacy cleanup in CartIcon**

Edit `src/components/shared-components/cart-icon/cart-icon.tsx` около строки 34-35. Текущий код:

```ts
    // Drop legacy v1 key (pre-printConfig shape) — оставлять PII в sessionStorage не надо.
    window.sessionStorage.removeItem('order');
```

Заменить на:

```ts
    // Drop legacy v1/v2 keys (pre-printConfig + pre-path schema).
    window.sessionStorage.removeItem('order');
    window.sessionStorage.removeItem('order_v2');
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Manual smoke**

```bash
npm run dev
```

В браузере: открыть `/shop/{любой-slug}`, ткнуть размер → положение принта → загрузить PNG → "В корзину". Открыть DevTools → Application → Session Storage → проверить что появился ключ `order_v3` (а не `order_v2`). В `printConfig.files.{side}` JSON-объекте — поле `path` присутствует.

- [ ] **Step 5: Commit**

```bash
git add src/redux/middleware/cart-persist.ts \
        src/components/shared-components/cart-icon/cart-icon.tsx
git commit -m "feat(cart): bump storage key to order_v3 + cleanup legacy v2"
```

---

## Task 6: Orphan-cleanup listener middleware

**Files:**
- Create: `src/redux/middleware/cart-orphan-cleanup.ts`

- [ ] **Step 1: Write listener middleware**

```ts
// src/redux/middleware/cart-orphan-cleanup.ts
//
// Listens to cart mutations that могут drop файлы из corzina, diff'ит prev → next state
// и удаляет orphan-объекты из Supabase Storage bucket `user-uploads`.
//
// Best-effort: ошибки storage.remove() логируются, но не отменяют action.

import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { actions as cartActions, TCartState } from '@/redux/cart-slice/cart.slice';
import { ICartOrderElement } from '@/app/utils/types';
import { getSupabaseClient } from '@/lib/supabase/client';

const BUCKET = 'user-uploads';

function collectPaths(order: Array<ICartOrderElement>): Set<string> {
  const paths = new Set<string>();
  for (const item of order) {
    const files = item.printConfig?.files ?? {};
    for (const ref of Object.values(files)) {
      if (ref?.path) paths.add(ref.path);
    }
  }
  return paths;
}

export const cartOrphanCleanupMiddleware = createListenerMiddleware();

cartOrphanCleanupMiddleware.startListening({
  matcher: isAnyOf(
    cartActions.clearPrintFile,
    cartActions.clearAllPrints,
    cartActions.deleteItemFromCart,
    cartActions.resetCart,
  ),
  effect: async (_action, listenerApi) => {
    if (typeof window === 'undefined') return;

    const prev = (listenerApi.getOriginalState() as { cart: TCartState }).cart.order ?? [];
    const next = (listenerApi.getState() as { cart: TCartState }).cart.order ?? [];

    const prevPaths = collectPaths(prev);
    const nextPaths = collectPaths(next);

    const removed: string[] = [];
    for (const p of prevPaths) {
      if (!nextPaths.has(p)) removed.push(p);
    }
    if (removed.length === 0) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage.from(BUCKET).remove(removed);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[cart-orphan-cleanup] remove failed', error.message, removed);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[cart-orphan-cleanup] unexpected error', e);
    }
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/redux/middleware/cart-orphan-cleanup.ts
git commit -m "feat(cart): listener middleware для cleanup orphan storage files"
```

---

## Task 7: Wire orphan-cleanup into Redux store

**Files:**
- Modify: `src/redux/store.ts`

- [ ] **Step 1: Read current store config**

```bash
cat src/redux/store.ts
```

Expected: видишь `configureStore` с `middleware: (gDM) => gDM().prepend(cartPersistMiddleware.middleware)` (или похожим pattern'ом).

- [ ] **Step 2: Add new middleware to store**

Импортировать новый listener и приклеить к prepend.

Edit `src/redux/store.ts` — добавить import:

```ts
import { cartOrphanCleanupMiddleware } from '@/redux/middleware/cart-orphan-cleanup';
```

В `configureStore`-вызов, в `middleware: (gDM) => gDM(...).prepend(...)` — добавить второй middleware:

```ts
middleware: (gDM) =>
  gDM().prepend(
    cartPersistMiddleware.middleware,
    cartOrphanCleanupMiddleware.middleware,
  ),
```

(Точный синтаксис подстраивается под существующий pattern. Если уже есть RTK Query `api.middleware` через `.concat(...)` — не трогай, добавляй только в `.prepend(...)`.)

- [ ] **Step 3: Typecheck + build**

```bash
npx tsc --noEmit && npm run build
```

Expected: clean.

- [ ] **Step 4: Manual integration smoke**

```bash
npm run dev
```

В браузере:
1. `/shop/{slug}` → добавить принт → "В корзину". Открыть Supabase Dashboard → Storage → `user-uploads/prints/` — должен появиться загруженный файл.
2. Открыть Network tab DevTools.
3. На корзине ткнуть "удалить весь принт" (или удалить весь item из корзины).
4. В Network — должен полететь DELETE-запрос на `*.supabase.co/storage/v1/object/user-uploads` со списком paths.
5. Supabase Dashboard → Storage → `user-uploads/prints/` — файл исчез.

- [ ] **Step 5: Commit**

```bash
git add src/redux/store.ts
git commit -m "feat(cart): wire orphan-cleanup middleware into store"
```

---

## Task 8: Image whitelist tighten

**Files:**
- Modify: `next.config.mjs:33`

- [ ] **Step 1: Replace wildcard hostname**

Edit `next.config.mjs` — найди блок:

```js
{
    protocol: 'https',
    hostname: '*.supabase.co',
    pathname: '/storage/v1/object/public/**',
},
```

Замени `*.supabase.co` → `almfjmiygtnzngkayhdv.supabase.co`:

```js
{
    protocol: 'https',
    hostname: 'almfjmiygtnzngkayhdv.supabase.co',
    pathname: '/storage/v1/object/public/**',
},
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build проходит. Если падает на каком-то `<Image src="...">` где hostname отличается — там либо typo, либо реально используется другой supabase ref (маловероятно).

- [ ] **Step 3: Smoke test product-page**

```bash
npm run dev
```

Открыть `/shop/{любой-slug}` — фотки товара (из `product-images` bucket) должны грузиться. Если broken — проверить generated URL'ы (DevTools → Network → image responses).

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs
git commit -m "chore(security): tighten image hostname whitelist to specific Supabase ref"
```

---

## Task 9: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update §4 (State management)**

В таблице `Cart-slice middleware` (или прямо перед таблицей actions) после абзаца «Cart-persist middleware» добавить:

```markdown
### Cart-orphan-cleanup middleware

[src/redux/middleware/cart-orphan-cleanup.ts](src/redux/middleware/cart-orphan-cleanup.ts) — second listener middleware:

- Слушает: `clearPrintFile`, `clearAllPrints`, `deleteItemFromCart`, `resetCart`
- На каждом action diff'ит `previousState.cart.order` vs `currentState.cart.order`, собирает `path`-поля из удалённых `IPrintFileRef`, вызывает `supabase.storage.from('user-uploads').remove(paths)`.
- Best-effort: ошибки storage логируются `console.warn`, но action не отменяется.
- Покрывает 90% случаев когда юзер сам убрал/удалил принт. Abandoned sessions (закрытая вкладка) подметаются nightly sweeper'ом (см. §6).
```

Также bump `order_v2` → `order_v3` в строке про CART_STORAGE_KEY:

```markdown
- Ключ: `order_v3` (был `order_v2`; bumped из-за добавления `path` в `IPrintFileRef`).
- CartIcon на mount чистит legacy ключи `order` и `order_v2` и валидирует форму restored массива...
```

- [ ] **Step 2: Update §6 (Edge Functions)**

В таблицу Edge Functions добавить строку:

```markdown
| `cleanup-user-uploads` | `false` (secret-header auth) | Nightly sweeper: листает `user-uploads/prints/`, удаляет объекты старше 14 дней. Авторизуется через `X-Cleanup-Secret` header. Вызывается pg_cron через pg_net. |
```

В подсекцию env-переменных добавить:

```markdown
#### env переменные `cleanup-user-uploads`:
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — auto
- `CLEANUP_SECRET` — обязательный, hex-32 random. Тот же секрет хранится в `vault.secrets` под именем `edge_function_cleanup_secret` для pg_cron.
```

В подсекцию миграций добавить:

```markdown
7. `20260527000009_leads_retention.sql` — pg_cron job daily DELETE leads >90 дней
8. `20260527000010_user_uploads_sweeper.sql` — pg_cron + pg_net вызов `cleanup-user-uploads` daily, секрет из Vault
```

(если нумерация уже доехала — подставить правильные номера; админ-кабинет добавил миграции 5-8.)

- [ ] **Step 3: Update §10 (Critical files)**

Добавить две строки в таблицу:

```markdown
| [src/redux/middleware/cart-orphan-cleanup.ts](src/redux/middleware/cart-orphan-cleanup.ts) | Listener middleware: удаляет orphan'ы из Storage когда юзер чистит принты |
| [supabase/functions/cleanup-user-uploads/index.ts](supabase/functions/cleanup-user-uploads/index.ts) | Edge Function-sweeper для bucket `user-uploads/prints/` |
```

- [ ] **Step 4: Update §11 (Known issues)**

В подсекции «🟢 Сделано» добавить новый батч (с датой 2026-05-27 если в тот же день, либо текущая):

```markdown
### 🟢 Сделано (батч 2026-05-27, pre-launch hardening)
- [x] Leads retention 90 дней через pg_cron (`cleanup-old-leads`)
- [x] Orphan-GC: `IPrintFileRef.path` + listener middleware `cart-orphan-cleanup.ts`
- [x] Sweeper Edge Function `cleanup-user-uploads` + pg_cron вызов (14-day cutoff)
- [x] Image whitelist в `next.config.mjs` сужен до конкретного Supabase ref
```

И из таблицы «🟡 Известные косяки» вычеркнуть строки про orphan-файлы, retention, image-whitelist tightening. Также вычеркнуть «`dynamicParams=false` на `/blog/[post]`» (уже исправлено).

- [ ] **Step 5: Update §13 (Deployment)**

Добавить упоминание `CLEANUP_SECRET` под «Env vars в Vercel»? Нет — это **Supabase secret**, не Vercel. Вместо этого в §12 (Dev workflow) расширить блок про Supabase secrets:

```markdown
Для Edge Functions секреты выставляются в Supabase Dashboard → Edge Functions → Secrets (не в Next.js env):
- `BITRIX_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ALLOWED_ORIGINS` — для `create-lead`
- `CLEANUP_SECRET` — для `cleanup-user-uploads` (тот же hex продублирован в `vault.secrets` под именем `edge_function_cleanup_secret`)
```

- [ ] **Step 6: Bump «Last full update» строку**

В шапке CLAUDE.md строка вида:

```markdown
> **Last full update:** 2026-05-27 после батча «3D-конструктор → simplified flow + leads-pipeline + catalog import».
```

→

```markdown
> **Last full update:** 2026-05-27 после батча «pre-launch hardening — leads retention + orphan-GC + image whitelist».
```

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: refresh CLAUDE.md after pre-launch hardening batch"
```

---

## Task 10: Final integration check + PR

- [ ] **Step 1: Build + typecheck clean**

```bash
npm run build && npx tsc --noEmit
```

Expected: passes.

- [ ] **Step 2: Verify Supabase cron jobs alive**

```sql
select jobname, schedule, active, jobid from cron.job order by jobname;
```

Expected: as a minimum 2 строки — `cleanup-old-leads` и `cleanup-user-uploads`. Обе active=true.

- [ ] **Step 3: Verify Edge Function deployed**

Via Supabase MCP `list_edge_functions` project `almfjmiygtnzngkayhdv` — должны быть две функции: `create-lead`, `cleanup-user-uploads`. Обе verify_jwt=false.

- [ ] **Step 4: Push branch + open PR**

```bash
git push -u origin <branch-name>
gh pr create --title "feat: pre-launch hardening (retention + orphan-GC + image whitelist)" \
  --body "$(cat <<'EOF'
## Summary
- Leads retention: 90-day DELETE via pg_cron (`cleanup-old-leads`)
- Orphan files in `user-uploads`: client middleware (`cart-orphan-cleanup`) + nightly Edge Function sweeper (`cleanup-user-uploads`, 14-day cutoff)
- Image hostname whitelist tightened from `*.supabase.co` to specific project ref
- Schema bump: `IPrintFileRef.path` + `CART_STORAGE_KEY` → `order_v3`

Per [docs/superpowers/specs/2026-05-27-prelaunch-hardening-design.md](docs/superpowers/specs/2026-05-27-prelaunch-hardening-design.md).

## Test plan
- [ ] Cron jobs visible in `cron.job` table (both active=true)
- [ ] Edge Function `cleanup-user-uploads` responds 401 без header, 200 с валидным X-Cleanup-Secret
- [ ] Manual: upload print → remove from cart → file disappears from `user-uploads/prints/`
- [ ] Manual: insert test lead with `created_at = now() - interval '91 days'` → wait for next cron tick → row gone

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for owner merge approval**

После того как пользователь подтвердил merge — план PR1 завершён.

---

## Self-review checklist (выполнить перед началом implementation)

- [ ] Все file paths существуют или явно помечены как Create
- [ ] CLEANUP_SECRET механика консистентна: env Edge Function + vault.secrets с одинаковым значением
- [ ] `CART_STORAGE_KEY` правильно меняется в одном файле, legacy cleanup в CartIcon
- [ ] Listener middleware подключён через `.prepend()` (а не `.concat()` — последний для RTK Query api.middleware)
- [ ] Все cron-задачи `do $$ ... unschedule ... $$` обёрнуты для идемпотентности
