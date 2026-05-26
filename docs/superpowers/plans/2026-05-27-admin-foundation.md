# Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить базу для админ-панели: схему БД (admin_users, RLS, storage buckets, products SEO, leads.status), authentication-цепочку (Supabase Auth + cookies-session + middleware + Server Action guard) и первые страницы `/admin/login` и `/admin` (dashboard со счётчиками). По завершении: админ может войти и увидеть пустую панель с количеством товаров/постов/лидов.

**Architecture:** Server Actions с `service_role` для write-операций; cookies-based session через `@supabase/ssr` для admin-роутов; существующие anon-клиенты (`server.ts`, `client.ts`) остаются нетронутыми — публичный сайт продолжает работать как раньше. Triple-layer защита: middleware → `requireAdmin()` → RLS.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, MUI v7, Supabase (Postgres + Auth + Storage), `@supabase/ssr`, Server Actions.

**Reference:** [Design spec](../specs/2026-05-27-admin-panel-design.md)

---

## File map

**Create:**
- `supabase/migrations/20260527000005_admin_users.sql` — таблица `admin_users` + функция `is_admin()`
- `supabase/migrations/20260527000006_admin_rls.sql` — write-политики на products/sizes/photos/links/blog/gallery/leads
- `supabase/migrations/20260527000007_storage_buckets.sql` — buckets product-images/blog-images/gallery-images + RLS
- `supabase/migrations/20260527000008_products_seo.sql` — `meta_title`, `meta_description`
- `supabase/migrations/20260527000009_leads_status.sql` — `status` column + check + index
- `src/lib/supabase/auth-server.ts` — cookies-based anon-клиент для admin server components/actions
- `src/lib/supabase/auth-browser.ts` — cookies-based anon-клиент для admin client components (login form)
- `src/lib/supabase/admin-server.ts` — service_role клиент, SERVER-ONLY
- `src/lib/supabase/middleware-client.ts` — клиент для `middleware.ts` (request+response cookies)
- `src/middleware.ts` — route guard для `/admin/:path*`
- `src/app/admin/layout.tsx` — root admin layout (только метаданные, noindex)
- `src/app/admin/(authed)/layout.tsx` — shell для авторизованных страниц (sidebar + topbar)
- `src/app/admin/(authed)/page.tsx` — dashboard со счётчиками (URL: `/admin`)
- `src/app/admin/(authed)/logout/actions.ts` — server action `signOut`
- `src/app/admin/login/page.tsx` — форма входа (без shell)
- `src/app/admin/login/actions.ts` — server action `signIn`
- `src/app/admin/_lib/require-admin.ts` — guard для Server Actions
- `src/app/admin/_components/AdminShell.tsx` — sidebar+topbar layout-обёртка
- `src/app/admin/_components/SignOutButton.tsx` — client кнопка logout
- `docs/superpowers/notes/2026-05-27-admin-bootstrap.md` — инструкция по созданию первого админа

**Modify:**
- `package.json` — добавить `@supabase/ssr`
- `.env.example` — добавить `SUPABASE_SERVICE_ROLE_KEY`
- `.env.local` — добавить `SUPABASE_SERVICE_ROLE_KEY` (значение из Supabase Dashboard)

**Do NOT touch (защищаем публичный сайт):** `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/api/api.ts`, `src/lib/storage/upload-print.ts`, всё в `src/app/shop/`, `src/app/blog/`.

---

## Phase A — Database & Storage

### Task 1: Install `@supabase/ssr` and configure env

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env.local` (локально, не коммитим)

- [ ] **Step 1: Install package**

```bash
npm install @supabase/ssr@^0.5.0
```

Expected: появится в `dependencies`, нет peer-warnings.

- [ ] **Step 2: Add env example**

Открыть `.env.example` и добавить в конец:

```
# Server-only, обходит RLS — НИКОГДА не префиксовать NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: Заполнить .env.local**

Зайти в Supabase Dashboard → Project Settings → API → скопировать `service_role` (secret).
Вставить в `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Проверить: `grep SUPABASE .env.local` показывает три ключа (URL, ANON, SERVICE_ROLE).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore(deps): add @supabase/ssr for admin auth"
```

---

### Task 2: Migration — `admin_users` table + `is_admin()` function

**Files:**
- Create: `supabase/migrations/20260527000005_admin_users.sql`

- [ ] **Step 1: Write migration**

```sql
-- Таблица допущенных в админку пользователей.
-- Подключается к auth.users через user_id; email хранится для удобства отображения и audit'а.
create table public.admin_users (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    email      text not null unique,
    created_at timestamptz not null default now()
);

-- RLS на самой таблице: только сам админ видит свою запись (через service_role читаем серверно).
alter table public.admin_users enable row level security;

create policy "admin_users self read" on public.admin_users
    for select to authenticated
    using (user_id = auth.uid());

-- Helper-функция для RLS-политик на остальных таблицах и для guard'а в Server Actions.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists(
        select 1 from public.admin_users
        where user_id = auth.uid()
    );
$$;

comment on function public.is_admin is 'True если auth.uid() есть в admin_users. Используется в RLS-политиках всех write-таблиц.';
```

- [ ] **Step 2: Apply via MCP**

Использовать `mcp__claude_ai_Supabase__apply_migration` со следующими параметрами:
- `name`: `admin_users`
- `query`: содержимое файла выше

Expected: миграция применилась, ошибок нет.

- [ ] **Step 3: Verify in DB**

Через MCP `mcp__claude_ai_Supabase__execute_sql`:

```sql
select table_name from information_schema.tables where table_schema='public' and table_name='admin_users';
select proname from pg_proc where proname='is_admin' and pronamespace='public'::regnamespace;
```

Expected: обе строки возвращаются.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260527000005_admin_users.sql
git commit -m "feat(db): admin_users table + is_admin() helper"
```

---

### Task 3: Migration — write RLS policies on content tables

**Files:**
- Create: `supabase/migrations/20260527000006_admin_rls.sql`

- [ ] **Step 1: Write migration**

```sql
-- Write-политики на все таблицы каталога/контента.
-- Read остаётся открытым для anon (как было), write — только для is_admin().
-- На leads: добавляем update (смена статуса) и select для admin'а (anon-read закрыт миграцией 0003).

-- products
create policy "products admin write" on public.products
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- product_sizes
create policy "product_sizes admin write" on public.product_sizes
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- product_gallery_photos
create policy "product_gallery_photos admin write" on public.product_gallery_photos
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- product_links
create policy "product_links admin write" on public.product_links
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- blog_posts
create policy "blog_posts admin write" on public.blog_posts
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- gallery_images
create policy "gallery_images admin write" on public.gallery_images
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- leads: admin может читать и менять статус, но не удалять
create policy "leads admin read" on public.leads
    for select to authenticated
    using (public.is_admin());

create policy "leads admin update" on public.leads
    for update to authenticated
    using (public.is_admin())
    with check (public.is_admin());
```

- [ ] **Step 2: Apply via MCP**

`mcp__claude_ai_Supabase__apply_migration` → name: `admin_rls`, query: содержимое выше.

- [ ] **Step 3: Verify**

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and policyname like '%admin%'
order by tablename, policyname;
```

Expected: 8 строк (products, product_sizes, product_gallery_photos, product_links, blog_posts, gallery_images, leads admin read, leads admin update).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260527000006_admin_rls.sql
git commit -m "feat(db): admin write RLS policies on content tables"
```

---

### Task 4: Migration — storage buckets + RLS

**Files:**
- Create: `supabase/migrations/20260527000007_storage_buckets.sql`

- [ ] **Step 1: Write migration**

```sql
-- Три новых bucket'а под админскую заливку картинок.
-- Все public-read, write — только для is_admin() (политика ниже).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('product-images', 'product-images', true, 10485760,
        array['image/png','image/jpeg','image/webp','image/avif']),
    ('blog-images',    'blog-images',    true,  5242880,
        array['image/png','image/jpeg','image/webp','image/avif']),
    ('gallery-images', 'gallery-images', true,  5242880,
        array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Write-политики (insert/update/delete) на storage.objects.
drop policy if exists "admin write product-images" on storage.objects;
create policy "admin write product-images" on storage.objects
    for all to authenticated
    using (bucket_id = 'product-images' and public.is_admin())
    with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin write blog-images" on storage.objects;
create policy "admin write blog-images" on storage.objects
    for all to authenticated
    using (bucket_id = 'blog-images' and public.is_admin())
    with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "admin write gallery-images" on storage.objects;
create policy "admin write gallery-images" on storage.objects
    for all to authenticated
    using (bucket_id = 'gallery-images' and public.is_admin())
    with check (bucket_id = 'gallery-images' and public.is_admin());

-- Public read на все три новых bucket'а (user-uploads уже имеет свою политику из миграции 0001).
drop policy if exists "public read admin image buckets" on storage.objects;
create policy "public read admin image buckets" on storage.objects
    for select to public
    using (bucket_id in ('product-images','blog-images','gallery-images'));
```

- [ ] **Step 2: Apply via MCP**

`apply_migration` → name: `storage_buckets`, query: содержимое выше.

- [ ] **Step 3: Verify buckets**

```sql
select id, public, file_size_limit
from storage.buckets
where id in ('product-images','blog-images','gallery-images')
order by id;
```

Expected: 3 строки.

- [ ] **Step 4: Verify policies**

```sql
select policyname from pg_policies
where schemaname='storage' and tablename='objects'
  and policyname like '%admin write%' or policyname like '%public read admin%'
order by policyname;
```

Expected: 4 строки (3 write + 1 read).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260527000007_storage_buckets.sql
git commit -m "feat(storage): admin image buckets + RLS"
```

---

### Task 5: Migration — products SEO fields + leads.status

Объединяем в одну миграцию — обе мелкие, относятся к существующим таблицам.

**Files:**
- Create: `supabase/migrations/20260527000008_admin_misc_columns.sql`

- [ ] **Step 1: Write migration**

```sql
-- SEO-поля для админской формы товара.
alter table public.products
    add column if not exists meta_title       text,
    add column if not exists meta_description text;

-- Статус заявки для модуля /admin/leads.
alter table public.leads
    add column if not exists status text not null default 'new'
        check (status in ('new','contacted','done','spam'));

create index if not exists leads_status_idx on public.leads(status);
```

- [ ] **Step 2: Apply via MCP**

`apply_migration` → name: `admin_misc_columns`.

- [ ] **Step 3: Verify**

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='products'
  and column_name in ('meta_title','meta_description');

select column_name from information_schema.columns
where table_schema='public' and table_name='leads' and column_name='status';
```

Expected: 3 строки суммарно (2 + 1).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260527000008_admin_misc_columns.sql
git commit -m "feat(db): products SEO fields + leads.status"
```

---

### Task 6: Bootstrap первого админа (manual, документируем)

**Files:**
- Create: `docs/superpowers/notes/2026-05-27-admin-bootstrap.md`

Эта задача — **не код**, а ручной шаг. Зафиксируем процедуру в notes/.

- [ ] **Step 1: Создать пользователя в Supabase Auth**

Через Supabase Dashboard:
1. Открыть проект `pnhd-studio-clone`
2. Authentication → Users → `Add user` → `Create new user`
3. Email: `margolinilya@gmail.com`
4. Password: сгенерировать криптостойкий пароль (например, `openssl rand -base64 24`), сохранить в менеджер паролей
5. Auto Confirm User: ✅ (иначе нужна email-подтверждалка)
6. Create user

Скопировать `User UID` из созданной записи (вид: `8f3e...`).

- [ ] **Step 2: Добавить в `admin_users` через MCP execute_sql**

```sql
insert into public.admin_users(user_id, email)
values ('<вставить User UID из step 1>', 'margolinilya@gmail.com');
```

Expected: 1 row inserted.

- [ ] **Step 3: Verify**

```sql
select au.email, au.user_id, u.created_at as auth_created_at
from public.admin_users au
join auth.users u on u.id = au.user_id;
```

Expected: одна запись.

- [ ] **Step 4: Зафиксировать процедуру в notes**

```bash
mkdir -p docs/superpowers/notes
```

Создать файл `docs/superpowers/notes/2026-05-27-admin-bootstrap.md`:

```markdown
# Bootstrap первого админа

> Эта процедура выполняется **один раз** при настройке нового окружения (production / preview).
> Источник правды для admin-доступа — таблица `public.admin_users`.

## Шаги

1. **Supabase Dashboard → Authentication → Users → Add user**
   - Email: целевой email админа
   - Password: сгенерировать через `openssl rand -base64 24`, сохранить в менеджер паролей
   - Auto Confirm User: ✅

2. **Скопировать User UID** из созданной записи

3. **Добавить в allowlist** (SQL Editor или MCP execute_sql):
   ```sql
   insert into public.admin_users(user_id, email)
   values ('<USER_UID>', '<email>');
   ```

4. **Проверить вход** на `/admin/login`

## Удаление админа

```sql
delete from public.admin_users where email = '<email>';
-- При необходимости полностью удалить юзера:
-- Supabase Dashboard → Authentication → Users → ... → Delete user
```

## Сброс пароля

Через Supabase Dashboard → Authentication → Users → `...` → Send password recovery.
В v1 self-service сброса нет.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/notes/2026-05-27-admin-bootstrap.md
git commit -m "docs: admin bootstrap procedure"
```

---

## Phase B — Auth plumbing (Supabase clients + middleware + guard)

### Task 7: Service-role admin client (server-only)

**Files:**
- Create: `src/lib/supabase/admin-server.ts`

- [ ] **Step 1: Write client**

```ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role клиент. Обходит RLS. ВЫЗЫВАТЬ ТОЛЬКО из Server Actions / API routes,
 * после проверки requireAdmin(). Никогда не импортировать в client component.
 */
export function createAdminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            'Admin client env missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'
        );
    }

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { 'x-pnhd-admin': '1' } },
    });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/admin-server.ts
git commit -m "feat(supabase): service-role admin client (server-only)"
```

---

### Task 8: Cookies-based anon-клиенты (server + browser)

Два файла-побратима для admin-роутов. Существующие `server.ts`/`client.ts` остаются нетронутыми.

**Files:**
- Create: `src/lib/supabase/auth-server.ts`
- Create: `src/lib/supabase/auth-browser.ts`

- [ ] **Step 1: Write `auth-server.ts`**

```ts
import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Anon-клиент с cookies-based сессией. Использовать в admin server components
 * и в начале Server Actions для чтения текущего user.
 */
export function createAuthServerClient(): SupabaseClient {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // Server Components не могут писать cookies — игнорируем,
                        // middleware и Server Actions обновят сессию.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // см. комментарий выше
                    }
                },
            },
        }
    );
}
```

- [ ] **Step 2: Write `auth-browser.ts`**

```ts
'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Anon-клиент с cookies-based сессией для admin client components
 * (login-форма, logout-кнопка). Singleton на client side.
 */
export function getAuthBrowserClient(): SupabaseClient {
    if (cached) return cached;
    cached = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    return cached;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/auth-server.ts src/lib/supabase/auth-browser.ts
git commit -m "feat(supabase): cookies-based auth clients for admin routes"
```

---

### Task 9: Middleware client + middleware.ts

**Files:**
- Create: `src/lib/supabase/middleware-client.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Write middleware client**

```ts
// src/lib/supabase/middleware-client.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

export function createMiddlewareSupabaseClient(req: NextRequest, res: NextResponse) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return req.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    req.cookies.set({ name, value, ...options });
                    res.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    req.cookies.set({ name, value: '', ...options });
                    res.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );
}
```

- [ ] **Step 2: Write middleware**

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware-client';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (!pathname.startsWith('/admin')) return NextResponse.next();
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) return NextResponse.next();

    // Initial response, может быть подменён cookie-обновлениями ниже.
    const res = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient(req, res);

    // Обновляет/проверяет токен по cookies.
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const url = req.nextUrl.clone();
        url.pathname = '/admin/login';
        url.searchParams.set('next', pathname);
        return NextResponse.redirect(url);
    }

    // Проверяем allowlist. Запрос идёт под JWT юзера, RLS на admin_users
    // разрешает читать только свою запись.
    const { data: admin } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!admin) {
        const url = req.nextUrl.clone();
        url.pathname = '/admin/login';
        url.searchParams.set('error', 'forbidden');
        return NextResponse.redirect(url);
    }

    return res;
}

export const config = {
    matcher: ['/admin/:path*'],
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke-test без UI (пока через curl)**

Запустить dev: `npm run dev` (если ещё не запущен).
В другом терминале:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -I http://localhost:3000/admin
```

Expected: `307 http://localhost:3000/admin/login?next=%2Fadmin` (или похожий redirect-target).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/middleware-client.ts src/middleware.ts
git commit -m "feat(auth): admin middleware with allowlist check"
```

---

### Task 10: `requireAdmin()` helper

**Files:**
- Create: `src/app/admin/_lib/require-admin.ts`

- [ ] **Step 1: Write helper**

```ts
import 'server-only';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

export class UnauthorizedError extends Error {
    constructor() { super('Unauthorized'); this.name = 'UnauthorizedError'; }
}

export class ForbiddenError extends Error {
    constructor() { super('Forbidden'); this.name = 'ForbiddenError'; }
}

/**
 * Вызывать первой строкой в каждом admin Server Action.
 * Бросает UnauthorizedError/ForbiddenError — Server Action возвращает их как
 * ошибку формы (Next.js перехватывает throw в server actions).
 */
export async function requireAdmin() {
    const supabase = createAuthServerClient();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new UnauthorizedError();

    const { data, error } = await supabase
        .from('admin_users')
        .select('user_id, email')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new ForbiddenError();

    return { user, admin: data };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/_lib/require-admin.ts
git commit -m "feat(admin): requireAdmin() guard for Server Actions"
```

---

## Phase C — Admin shell + login

### Task 11: Login page + signIn action

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`
- Create: `src/app/admin/login/LoginForm.tsx`

- [ ] **Step 1: Write server action**

```ts
// src/app/admin/login/actions.ts
'use server';

import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { redirect } from 'next/navigation';

export type LoginState = { error: string | null };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const next = String(formData.get('next') || '/admin');

    if (!email || !password) {
        return { error: 'Введите email и пароль' };
    }

    const supabase = createAuthServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
        return { error: 'Неверный email или пароль' };
    }

    // Проверка allowlist: пускать дальше только подтверждённых админов.
    const { data: admin } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

    if (!admin) {
        await supabase.auth.signOut();
        return { error: 'Доступ запрещён' };
    }

    // Безопасный redirect: только локальные пути, никаких ?next=https://evil.com
    const safeNext = next.startsWith('/admin') ? next : '/admin';
    redirect(safeNext);
}
```

- [ ] **Step 2: Write client form**

```tsx
// src/app/admin/login/LoginForm.tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type LoginState } from './actions';
import { TextField, Button, Alert, Box } from '@mui/material';

const initialState: LoginState = { error: null };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" variant="contained" fullWidth disabled={pending} size="large">
            {pending ? 'Вход…' : 'Войти'}
        </Button>
    );
}

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
    const [state, formAction] = useFormState(signIn, {
        error: initialError,
    });

    return (
        <Box component="form" action={formAction} display="flex" flexDirection="column" gap={2}>
            <input type="hidden" name="next" value={next} />
            <TextField name="email" label="Email" type="email" autoComplete="email" required autoFocus />
            <TextField name="password" label="Пароль" type="password" autoComplete="current-password" required />
            {state.error && <Alert severity="error">{state.error}</Alert>}
            <SubmitButton />
        </Box>
    );
}
```

- [ ] **Step 3: Write page**

```tsx
// src/app/admin/login/page.tsx
import { LoginForm } from './LoginForm';
import { Box, Container, Paper, Typography } from '@mui/material';

export const metadata = { title: 'Вход — PNHD admin', robots: { index: false, follow: false } };

export default function LoginPage({
    searchParams,
}: {
    searchParams: { next?: string; error?: string };
}) {
    const next = searchParams.next ?? '/admin';
    const initialError =
        searchParams.error === 'forbidden' ? 'Доступ запрещён' : null;

    return (
        <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
            <Paper sx={{ p: 4, width: '100%' }} elevation={1}>
                <Typography variant="h5" gutterBottom>PNHD admin</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Вход в панель управления
                </Typography>
                <LoginForm next={next} initialError={initialError} />
            </Paper>
        </Container>
    );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke-test в браузере**

`npm run dev`, открыть `http://localhost:3000/admin/login`:
- Видна форма
- Ввод неверных данных → красный alert «Неверный email или пароль»
- Ввод **корректных** данных (созданного в Task 6 админа) → редирект на `/admin` (страница пока 404, делаем в следующих тасках)

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/login
git commit -m "feat(admin): login page + signIn server action"
```

---

### Task 12: Admin shell layout (route group `(authed)`)

**Files:**
- Create: `src/app/admin/layout.tsx` — корневой, только метаданные
- Create: `src/app/admin/(authed)/layout.tsx` — shell с auth-check
- Create: `src/app/admin/_components/AdminShell.tsx`
- Create: `src/app/admin/_components/SignOutButton.tsx`
- Create: `src/app/admin/(authed)/logout/actions.ts`

**Почему route group**: `/admin/login` не должен наследовать sidebar/topbar. Route group `(authed)` группирует страницы, которые требуют входа, не меняя URL. `/admin/(authed)/page.tsx` отдаёт URL `/admin`, `/admin/login/page.tsx` остаётся вне группы.

- [ ] **Step 1: Logout action**

```ts
// src/app/admin/(authed)/logout/actions.ts
'use server';

import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { redirect } from 'next/navigation';

export async function signOut() {
    const supabase = createAuthServerClient();
    await supabase.auth.signOut();
    redirect('/admin/login');
}
```

- [ ] **Step 2: SignOut button**

```tsx
// src/app/admin/_components/SignOutButton.tsx
'use client';

import { Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from '../(authed)/logout/actions';

export function SignOutButton() {
    return (
        <form action={signOut}>
            <Button type="submit" size="small" startIcon={<LogoutIcon />} color="inherit">
                Выйти
            </Button>
        </form>
    );
}
```

- [ ] **Step 3: AdminShell layout component**

```tsx
// src/app/admin/_components/AdminShell.tsx
import Link from 'next/link';
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { SignOutButton } from './SignOutButton';

const DRAWER_WIDTH = 220;

const NAV = [
    { href: '/admin',           label: 'Дашборд' },
    { href: '/admin/products',  label: 'Товары' },
    { href: '/admin/blog',      label: 'Блог' },
    { href: '/admin/gallery',   label: 'Принты' },
    { href: '/admin/leads',     label: 'Заявки' },
];

export function AdminShell({ children, userEmail }: { children: React.ReactNode; userEmail: string }) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }} elevation={0} color="default">
                <Toolbar sx={{ gap: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 0, fontWeight: 700 }}>PNHD admin</Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="body2" color="text.secondary">{userEmail}</Typography>
                    <SignOutButton />
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                <List>
                    {NAV.map((n) => (
                        <ListItem key={n.href} disablePadding>
                            <ListItemButton component={Link} href={n.href}>
                                <ListItemText primary={n.label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                {children}
            </Box>
        </Box>
    );
}
```

- [ ] **Step 4: Root admin layout (метаданные, без shell)**

```tsx
// src/app/admin/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: { default: 'PNHD admin', template: '%s — PNHD admin' },
    robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
```

- [ ] **Step 5: Authed layout с shell + auth-check**

```tsx
// src/app/admin/(authed)/layout.tsx
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { AdminShell } from '../_components/AdminShell';

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
    // Дублирует middleware на случай прямого RSC-вызова. Тащим email для шапки.
    const supabase = createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const { data: admin } = await supabase
        .from('admin_users').select('email').eq('user_id', user.id).maybeSingle();
    if (!admin) redirect('/admin/login?error=forbidden');

    return <AdminShell userEmail={admin.email}>{children}</AdminShell>;
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/layout.tsx 'src/app/admin/(authed)' src/app/admin/_components
git commit -m "feat(admin): shell layout with sidebar + logout"
```

---

### Task 13: Dashboard page со счётчиками

**Files:**
- Create: `src/app/admin/(authed)/page.tsx`

- [ ] **Step 1: Write page**

```tsx
// src/app/admin/(authed)/page.tsx — URL: /admin
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../_lib/require-admin';

export const metadata = { title: 'Дашборд' };
export const dynamic = 'force-dynamic';

async function loadCounts() {
    await requireAdmin();
    const admin = createAdminClient();

    const [products, posts, gallery, newLeads] = await Promise.all([
        admin.from('products').select('id', { count: 'exact', head: true }),
        admin.from('blog_posts').select('id', { count: 'exact', head: true }),
        admin.from('gallery_images').select('id', { count: 'exact', head: true }),
        admin.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]);

    return {
        products: products.count ?? 0,
        posts:    posts.count ?? 0,
        gallery:  gallery.count ?? 0,
        newLeads: newLeads.count ?? 0,
    };
}

export default async function DashboardPage() {
    const counts = await loadCounts();

    const cards = [
        { label: 'Товары',          value: counts.products, href: '/admin/products' },
        { label: 'Блог-посты',      value: counts.posts,    href: '/admin/blog' },
        { label: 'Принты',          value: counts.gallery,  href: '/admin/gallery' },
        { label: 'Новые заявки',    value: counts.newLeads, href: '/admin/leads' },
    ];

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Дашборд</Typography>
            <Grid container spacing={2}>
                {cards.map((c) => (
                    <Grid item xs={12} sm={6} md={3} key={c.label}>
                        <Card component="a" href={c.href} sx={{ textDecoration: 'none', display: 'block' }}>
                            <CardContent>
                                <Typography variant="overline" color="text.secondary">{c.label}</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 600 }}>{c.value}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
```

- [ ] **Step 2: Verify TypeScript + build**

```bash
npx tsc --noEmit
npm run build
```

Expected: no TS errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/admin/(authed)/page.tsx'
git commit -m "feat(admin): dashboard with content counts"
```

---

### Task 14: End-to-end smoke test

Это не код, а ручной чек-лист — фиксирует, что foundation работает.

- [ ] **Step 1: Запустить dev**

```bash
npm run dev
```

- [ ] **Step 2: Прогнать сценарий «незалогиненный»**

В Incognito-окне:
1. Открыть `http://localhost:3000/admin` → должен редиректить на `/admin/login?next=%2Fadmin`
2. Открыть `http://localhost:3000/admin/products` → редирект на `/admin/login?next=%2Fadmin%2Fproducts`
3. Открыть `http://localhost:3000/admin/login` → форма видна

- [ ] **Step 3: Прогнать сценарий «вход неправильным паролем»**

На `/admin/login`: ввести email админа + неверный пароль → красный alert «Неверный email или пароль», поля не очищаются.

- [ ] **Step 4: Прогнать сценарий «не-админ»**

(Только если есть второй auth-юзер не в `admin_users`.) Ввести его учётку → alert «Доступ запрещён».

- [ ] **Step 5: Прогнать сценарий «успешный вход»**

Ввести правильные данные → редирект на `/admin` → видна шапка с email + sidebar + 4 карточки счётчиков с реальными числами.

- [ ] **Step 6: Прогнать сценарий «прямой URL после входа»**

Открыть `http://localhost:3000/admin/login?next=%2Fadmin%2Fproducts` → войти → редирект на `/admin/products` (вернёт 404 — модуль ещё не построен, но это правильное поведение).

- [ ] **Step 7: Прогнать сценарий «logout»**

Кликнуть «Выйти» в шапке → редирект на `/admin/login`, попытка снова открыть `/admin` → редирект на login.

- [ ] **Step 8: Прогнать сценарий «публичный сайт не сломан»**

В том же dev-сервере открыть:
- `http://localhost:3000/` → загружается
- `http://localhost:3000/shop` → каталог
- `http://localhost:3000/blog` → посты
- `http://localhost:3000/shop/classic-tee` → карточка товара

Все 4 страницы рендерятся без ошибок — публичный сайт не задет рефакторингом.

- [ ] **Step 9: Финальный commit (если нужны мелкие правки)**

Если в ходе smoke-теста нашлись баги — пофиксить, закоммитить. Если всё гладко — пропустить этот шаг.

---

## Definition of done

После выполнения всех 14 задач:

✅ В БД есть `admin_users` + `is_admin()` + 8 admin-RLS-политик + 3 storage bucket'а с политиками + `products.meta_*` + `leads.status`
✅ Один админ создан через Supabase Dashboard и добавлен в allowlist
✅ Middleware редиректит non-admin'ов на `/admin/login`
✅ Login-форма принимает credentials и пускает в админку
✅ Layout с sidebar и кнопкой logout работает
✅ Dashboard показывает счётчики (Товары/Посты/Принты/Новые заявки)
✅ Публичный сайт (`/shop`, `/blog`, `/`, `/shop/[slug]`) работает как раньше
✅ `npm run build` проходит без ошибок
✅ Все коммиты в логе, связные сообщения

После merge этого PR'а — переходим к Plan 2 (Products module).

## Что НЕ входит в этот план

- Никакого CRUD товаров/постов/галереи (Plan 2 и 3)
- Никакого `sharp`/upload-helper'а (Plan 2)
- Никакого Tiptap (Plan 3)
- Никакого `react-hook-form`/`zod` (Plan 2)
- Никакого тестового фреймворка (Vitest) — добавляем в Plan 2, где будут unit-тесты для `syncChildren`
