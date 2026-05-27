# Admin Panel — Design Spec

**Date:** 2026-05-27
**Status:** Draft — awaiting user review
**Author:** Claude (brainstormed with Ilya Margolin)

---

## 1. Goal

Внутренний кабинет для управления каталогом и контентом pnhd-studio-clone. Покрывает CRUD товаров (включая размеры, фото, связи, ракурсы конструктора), блог-постов, галереи принтов и просмотр входящих заявок. Заменяет ручное редактирование через SQL/Supabase Dashboard.

## 2. Scope (v1)

**Входит:**
- Auth: Supabase Auth (email + пароль) с allowlist через таблицу `admin_users`
- CRUD products + product_sizes + product_gallery_photos + product_links
- CRUD blog_posts (Tiptap WYSIWYG для `body_html`)
- CRUD gallery_images (принты для конструктора)
- Просмотр leads + смена статуса (`new` → `contacted` → `done`/`spam`)
- Загрузка картинок через Supabase Storage (3 новых bucket'а)
- Image optimization через `sharp` при upload (webp, max 2000px)

**Не входит (будущие итерации):**
- Audit log / история изменений
- Роли (всё equal-admin)
- Multi-language
- CSV bulk import
- Push-уведомления по лидам
- Полноценный E2E через Playwright
- Превью конструктора внутри админки

## 3. Tech decisions (recap из brainstorming)

| Решение | Выбор | Причина |
|---|---|---|
| Auth | Supabase Auth email/password + allowlist | Поддерживает мультиадминов, стандартное решение |
| Scope | Products + Blog + Gallery + Leads (read-only) | Покрывает весь обозримый контент |
| UI stack | MUI v7 + `@mui/x-data-grid` (community) | Консистентность с публичным сайтом, нулевой барьер |
| Form layout | Табы (Основное · Размеры · Фото · Конструктор · SEO · Друзья) | Масштабируемо для 30+ полей |
| Blog editor | Tiptap (WYSIWYG) | Баланс UX и сложности |
| Write path | Server Actions + `service_role` | Серверная валидация и sanitize обязательны |

## 4. Architecture

### 4.1 Routes

```
/admin/login                       форма входа
/admin                             dashboard (счётчики)
/admin/products                    DataGrid list
/admin/products/new
/admin/products/[slug]             форма с табами
/admin/blog                        list
/admin/blog/new
/admin/blog/[slug]                 Tiptap editor
/admin/gallery                     сетка + drop-zone
/admin/leads                       list + status actions
```

Отдельный `src/app/admin/layout.tsx` без публичного header/footer.

### 4.2 Write data flow

```
[Browser] form submit
        │
        ▼
Server Action ('use server')
        │
        ├─ await requireAdmin()       # session → admin_users check
        ├─ schema.parse(payload)       # zod
        ├─ DOMPurify(body_html)        # for blog
        ├─ supabaseAdmin (service_role) upsert
        ├─ syncChildren (sizes/photos)
        ├─ revalidatePath('/shop', '/admin/products', ...)
        └─ return { ok, errors? }
```

### 4.3 Read data flow

Список-страницы — Next.js Server Components с anon-клиентом `createServerClient()`. RLS уже разрешает anon `select` на products/blog/gallery. Для leads (RLS закрыт) используется service_role в server action.

### 4.4 Defense in depth (3 уровня)

1. **Middleware** на `/admin/*` — редирект unauthed/non-admin в login
2. **Server Action guard** `requireAdmin()` — каждый action вызывает первой строкой
3. **RLS write-policies** — даже без guard non-admin не запишет (safety net)

## 5. Auth + authorization

### 5.1 Table `admin_users`

```sql
create table public.admin_users (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    email      text not null unique,
    created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;
```

### 5.2 Bootstrap первого админа

1. Supabase Dashboard → Authentication → Users → Add user → `margolinilya@gmail.com` + пароль
2. SQL Editor:
   ```sql
   insert into public.admin_users(user_id, email)
   values ('<uuid из Auth>', 'margolinilya@gmail.com');
   ```

### 5.3 RLS-политики (новые, на каждой write-таблице)

```sql
-- Пример для products
create policy "products admin write" on public.products
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());
```

Аналогично на: `product_sizes`, `product_gallery_photos`, `product_links`, `blog_posts`, `gallery_images`.
Для `leads`: только `update` (status change), не `delete`.

### 5.4 Supabase clients (новая структура)

```
src/lib/supabase/
├── server.ts        # createServerClient (anon, cookies-based, для server components)
├── client.ts        # createBrowserClient (anon, для client components)
├── middleware.ts    # createMiddlewareClient (для middleware.ts)
└── admin.ts         # createAdminClient (service_role, SERVER-ONLY, для actions)
```

Все используют `@supabase/ssr` (новый официальный пакет вместо deprecated `@supabase/auth-helpers-nextjs`).

### 5.5 Middleware

`src/middleware.ts` — matcher `'/admin/:path*'`. Проверяет session, проверяет membership в `admin_users`, иначе редирект на `/admin/login`.

### 5.6 Server Action guard

`src/app/admin/_lib/require-admin.ts`:
```ts
export async function requireAdmin() {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();
    const { data } = await supabase.from('admin_users')
        .select('user_id').eq('user_id', user.id).maybeSingle();
    if (!data) throw new ForbiddenError();
    return user;
}
```

### 5.7 Environment

Добавить в `.env.local` и Vercel (Production + Preview + Development):
```
SUPABASE_SERVICE_ROLE_KEY=<из Supabase Dashboard → API → service_role>
```

**Критично:** без префикса `NEXT_PUBLIC_`. Этот ключ обходит RLS — никогда не должен попасть в клиентский бандл.

## 6. Storage

### 6.1 Новые buckets

| Bucket | Limit | MIME types | Назначение |
|---|---|---|---|
| `product-images` | 10 MB | png/jpeg/webp/avif | Карточка + gallery + editor views |
| `blog-images` | 5 MB | png/jpeg/webp/avif | Cover + inline в Tiptap |
| `gallery-images` | 5 MB | png/jpeg/webp/svg | Принты для конструктора |

Существующий `user-uploads` (миграция 0001) — без изменений.

### 6.2 RLS storage.objects

```sql
create policy "admin write product-images" on storage.objects
    for all to authenticated
    using (bucket_id = 'product-images' and public.is_admin())
    with check (bucket_id = 'product-images' and public.is_admin());
-- аналогично для blog-images, gallery-images

create policy "public read image buckets" on storage.objects
    for select to public
    using (bucket_id in ('product-images','blog-images','gallery-images','user-uploads'));
```

### 6.3 Path conventions

| Bucket | Path шаблон |
|---|---|
| `product-images` | `{slug}/main.webp`, `{slug}/gallery/{uuid}.webp`, `{slug}/editor/{front\|back\|lsleeve\|rsleeve}.webp` |
| `blog-images` | `{slug}/cover.webp`, `{slug}/inline/{uuid}.webp` |
| `gallery-images` | `{uuid}.webp` (плоско) |

Slug-based пути → читабельные URL и cleanup при удалении (`storage.list({prefix: slug})` + `remove`).

### 6.4 Upload helper

`src/app/admin/_lib/upload-image.ts` — server action, всегда вызывает `requireAdmin()`, прогоняет файл через `sharp` (resize 2000px, webp 85%), upsert в bucket, возвращает `{ url, width, height }`.

## 7. Products module

### 7.1 List page

`@mui/x-data-grid`. Server-side pagination (50/страница). Колонки: `thumb · name · type · price · stock · actions`. Toolbar: `+ Новый` · поиск · фильтр type. Per-row actions: edit · duplicate · delete (confirm).

`duplicate` — server action: copy products row + sizes + photos с slug `{slug}-copy-{n}`.
`delete` — server action: `delete from products where id = ?` (cascade на sizes/photos/links уже в FK).

### 7.2 Form

Один компонент `<ProductForm initial={product | null}>`, переиспользуется на `/new` и `/[slug]`. State: `react-hook-form` + `zodResolver`. Общий save action — атомарно сохраняет product + sizes + photos + links.

### 7.3 Табы формы

**Основное** — slug (lock при edit), name, type (select), category, price, stock, color, stage_color (hex picker), description (textarea), `is_for_printing` switch, `is_sale` switch.

**Размеры** — inline-таблица: `name | qty | sort_order | [delete]`. Drag-handle на reorder. `+ Добавить размер`.

**Фото** — main image (1 слот, replace через drop) + gallery (сетка + drop-zone). Drag-reorder через нативный HTML5 DnD.

**Конструктор** — 4 слота (front/back/lsleeve/rsleeve), каждый drop-zone или превью+replace+clear. Внизу shipping dimensions (weight, width, length, depth) одной строкой.

**SEO** — `meta_title`, `meta_description` (новые поля, добавляются миграцией).

**Друзья** — поиск по products → multi-select → запись в `product_links`.

### 7.4 Save action

`src/app/admin/products/_actions.ts`:

```ts
'use server';
const productSchema = z.object({
    id: z.string().uuid().optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    type: z.enum(['tshirt','hoodie','longsleeve','sweatshirt','cap','shopper']),
    price: z.number().positive(),
    // ... все поля
    sizes:     z.array(sizeSchema),
    photos:    z.array(photoSchema),
    linkedIds: z.array(z.string().uuid()),
});

export async function saveProduct(input: unknown) {
    await requireAdmin();
    const data = productSchema.parse(input);
    const admin = createAdminClient();

    const { data: product, error } = await admin.from('products')
        .upsert(productFields(data)).select().single();
    if (error) throw error;

    await syncChildren(admin, 'product_sizes',          product.id, data.sizes);
    await syncChildren(admin, 'product_gallery_photos', product.id, data.photos);
    await syncLinks   (admin,                            product.id, data.linkedIds);

    revalidatePath('/shop');
    revalidatePath(`/shop/${product.slug}`);
    revalidatePath('/admin/products');
    return { ok: true, slug: product.slug };
}
```

### 7.5 `syncChildren` helper

Generic diff для 1:N связей:
- В новом наборе нет id → `insert`
- В старом наборе нет id → `delete`
- Совпадение по id и поля изменились → `update`

Реализация в `src/app/admin/_lib/sync-children.ts`.

### 7.6 UX-детали

- Optimistic UI на размеры/фото (мгновенно в форме, реальный insert на общем save)
- Unsaved-changes guard через `beforeunload`
- Server action errors → `{ ok: false, errors: { field: msg } }`, MUI snackbar для общих

## 8. Blog module

### 8.1 List

DataGrid: `cover · title · author · hashtags · created_at · actions`. Actions: edit/duplicate/delete.

### 8.2 Form (без табов)

- Шапка: slug · title · subtitle · author · hashtags (multi-input)
- Cover: drop-zone → upload в `blog-images/{slug}/cover.webp`
- Body: **Tiptap** с тулбаром: `B I U S | H2 H3 | bullet list, ordered list | link, image | blockquote | undo redo`
- Inline-картинки: при insert → upload в `blog-images/{slug}/inline/{uuid}.webp`, ссылка вставляется как `<img src="public-url">` (не data:)
- **Новый пост и upload до save**: slug обязателен в шапке *до* первого upload (input заблокирован пока slug пуст). Альтернатива — temp-path `_drafts/{client-uuid}/...` с background-move после save — не делаем в v1, требует cleanup-крона.

### 8.3 Save action

`saveBlogPost`:
1. `requireAdmin()`
2. zod-парсинг
3. `DOMPurify.sanitize(body_html, { ALLOWED_TAGS: ['p','h2','h3','strong','em','u','s','ul','ol','li','a','img','blockquote','br'], ALLOWED_ATTR: ['href','src','alt'] })`
4. upsert
5. `revalidatePath('/blog')`, `revalidatePath('/blog/${slug}')`

### 8.4 Снятие `dynamicParams: false`

Сейчас на `/blog/[post]` стоит `dynamicParams: false` (известная проблема в CLAUDE.md). Меняем на `true` + `revalidatePath` после save — новые посты появляются без redeploy.

## 9. Gallery module

`/admin/gallery` — единственный экран, без отдельной формы.

- Сетка thumbnails (3-4 в ряд)
- Top: drop-zone «бросьте файлы» (multiple)
- Click thumbnail → dialog: edit alt + delete
- Reorder через drag прямо на сетке (без dialog) → bulk update sort_order
- Delete → `delete from gallery_images` + `storage.remove([path])`

Все операции — server actions, `requireAdmin()` в начале.

## 10. Leads module

### 10.1 Schema change

```sql
alter table public.leads
    add column status text not null default 'new'
        check (status in ('new','contacted','done','spam'));

create index leads_status_idx on public.leads(status);
```

### 10.2 UI

DataGrid: `status (chip) · name · phone · email · created_at · actions`. Server-side filter по status, sort по created_at desc.

Per-row actions: button-группа `→ contacted`, `→ done`, `→ spam`. Server action `updateLeadStatus(id, status)` с zod-валидацией значения.

Чтение лидов — через `createAdminClient()` в server action (RLS закрыт от anon).

## 11. Dependencies

### 11.1 Новые npm-пакеты

| Пакет | Назначение | ~gzip |
|---|---|---|
| `@supabase/ssr` | Cookies-based session | 3 KB |
| `@mui/x-data-grid` | List-страницы | 80 KB (lazy в `/admin`) |
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link` | Blog editor | 60 KB (lazy) |
| `react-hook-form`, `@hookform/resolvers` | Формы | 12 KB |
| `zod` | Schema валидация | 12 KB (server-side в основном) |
| `isomorphic-dompurify` | Sanitize HTML | 25 KB (server-only) |

### 11.2 Уже есть, переиспользуем

`sharp` (image resize), `@supabase/supabase-js`, `@mui/material`, `@emotion/*`, `uuid`.

### 11.3 Bundle impact

Tiptap, DataGrid и dompurify попадают в `/admin/*` route group. Публичный сайт не утяжеляется. Замеряем `next build` до и после, фиксируем в PR.

## 12. Migrations

Новые SQL-миграции в `supabase/migrations/`:

```
20260527000005_admin_users.sql          admin_users table + is_admin() function
20260527000006_admin_rls.sql            write-политики на 6 таблиц
20260527000007_storage_buckets.sql      3 bucket'а + RLS на storage.objects
20260527000008_products_seo.sql         meta_title, meta_description
20260527000009_leads_status.sql         status column + check + index
```

Bootstrap первого админа — не миграцией (см. §5.2).

## 13. File structure

```
src/
├── middleware.ts                                  # NEW
├── app/
│   └── admin/                                     # NEW route group
│       ├── layout.tsx
│       ├── page.tsx                               # dashboard
│       ├── login/page.tsx
│       ├── products/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   ├── [slug]/page.tsx
│       │   ├── _components/
│       │   │   ├── ProductsTable.tsx
│       │   │   ├── ProductForm.tsx
│       │   │   └── tabs/{Main,Sizes,Photos,Constructor,Seo,Links}Tab.tsx
│       │   └── _actions.ts
│       ├── blog/{page,new,[slug],_components,_actions}.tsx
│       ├── gallery/{page,_components,_actions}.tsx
│       ├── leads/{page,_actions}.tsx
│       └── _lib/
│           ├── require-admin.ts
│           ├── upload-image.ts
│           ├── sync-children.ts
│           └── schemas.ts
└── lib/
    └── supabase/
        ├── server.ts        # UPDATE → @supabase/ssr
        ├── client.ts        # UPDATE → @supabase/ssr
        ├── middleware.ts    # NEW
        └── admin.ts         # NEW
```

## 14. Testing strategy

- **Smoke (ручной)**: login → создать товар → сохранить → увидеть на `/shop/[slug]` → удалить
- **Unit**: `syncChildren` (insert/update/delete diff), `requireAdmin` (mock supabase) на vitest
- **Integration с Supabase preview branch**: deferred (фиксируем как follow-up)
- **E2E через Playwright**: не в scope первой итерации

## 15. Security considerations

| Риск | Mitigation |
|---|---|
| `service_role` утечка в клиент | env без `NEXT_PUBLIC_`; impport только в `_actions.ts`/`_lib/`; ESLint-правило (опционально) против import из client components |
| XSS через `body_html` | DOMPurify в server action перед записью + whitelist тегов/атрибутов |
| CSRF на server actions | Next.js App Router → встроенная CSRF-защита (origin-check) |
| Подбор паролей | Supabase Auth rate-limit; первого админа создаём через Dashboard, новые регистрации публично закрыты (не делаем `/signup`-страницу) |
| Authenticated non-admin доступ | Triple-layer guard: middleware + requireAdmin() + RLS |
| Подмена `slug` при upload | Path формируется из validated slug; sharp обязательно re-encode (защита от polyglot files) |

## 16. Rollout plan

1. PR #1: миграции (1, 2, 3 — admin_users, RLS, storage), bootstrap первого админа вручную
2. PR #2: Supabase clients refactor (`@supabase/ssr`), middleware, login page, dashboard
3. PR #3: Products module (полностью)
4. PR #4: Blog module + Tiptap
5. PR #5: Gallery + Leads
6. PR #6: cleanup, документация, обновление CLAUDE.md (admin раздел)

Каждый PR разворачивается в Vercel preview, smoke-тест перед merge в main.

## 17. Out of scope (explicit)

- Audit log / history
- Role-based access (admin/editor)
- Multi-language товаров (RU only)
- CSV import (товары уже импортированы)
- Push-уведомления о новых лидах (есть Bitrix-вебхук в публичной части)
- Превью конструктора внутри админки
- 2FA (можно добавить позже через Supabase MFA)
- Account self-service (smena password / email — пока через Supabase Dashboard)
