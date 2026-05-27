# Admin Products Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полноценный CRUD товаров на `/admin/products` — список с DataGrid, форма с 6 табами (Основное, Размеры, Фото, Конструктор, SEO, Друзья), загрузка картинок через Supabase Storage с авто-ресайзом, атомарное сохранение всех связей (sizes/photos/links) через Server Action.

**Architecture:** Server Components тянут данные через service_role admin client (после `requireAdmin()`); UI на MUI v7 + `@mui/x-data-grid`; формы на `react-hook-form` + `zodResolver`; сохранение — единственный Server Action `saveProduct` валидирует через zod, прогоняет `syncChildren` для sizes/photos и `syncLinks` для product_links. Картинки оптимизируются `sharp` (webp, max 2000px) и заливаются в bucket `product-images`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, MUI v7 + `@mui/x-data-grid`, `react-hook-form` + `@hookform/resolvers`, `zod`, `sharp` (уже в проекте), Supabase Storage.

**Reference:** [Design spec §7](../specs/2026-05-27-admin-panel-design.md), [Plan 1 (Foundation)](./2026-05-27-admin-foundation.md)

**Branch:** работаем на `feat/admin-foundation` (тот же branch, что и Plan 1) — финальный PR соберёт всё вместе. Альтернатива: смержить Plan 1 в `main` сейчас и начать новую ветку — на твоё усмотрение.

---

## File map

### Create

**Helpers / `_lib`:**
- `src/app/admin/_lib/schemas.ts` — zod-схемы для product/size/photo
- `src/app/admin/_lib/sync-children.ts` — generic diff helper для 1:N
- `src/app/admin/_lib/sync-links.ts` — diff helper для M:N self-ref `product_links`
- `src/app/admin/_lib/upload-image.ts` — sharp + Supabase Storage upload (server action)

**List page:**
- `src/app/admin/(authed)/products/page.tsx` — server component, тянет товары
- `src/app/admin/(authed)/products/ProductsTable.tsx` — client DataGrid
- `src/app/admin/(authed)/products/list-actions.ts` — server actions: `deleteProduct`, `duplicateProduct`

**Form page:**
- `src/app/admin/(authed)/products/new/page.tsx`
- `src/app/admin/(authed)/products/[slug]/page.tsx`
- `src/app/admin/(authed)/products/ProductForm.tsx` — client, табы
- `src/app/admin/(authed)/products/save-action.ts` — `saveProduct`
- `src/app/admin/(authed)/products/upload-helpers.ts` — клиент-обёртки над server-action `uploadImage`

**Form tabs:**
- `src/app/admin/(authed)/products/tabs/MainTab.tsx`
- `src/app/admin/(authed)/products/tabs/SizesTab.tsx`
- `src/app/admin/(authed)/products/tabs/PhotosTab.tsx`
- `src/app/admin/(authed)/products/tabs/ConstructorTab.tsx`
- `src/app/admin/(authed)/products/tabs/SeoTab.tsx`
- `src/app/admin/(authed)/products/tabs/LinksTab.tsx`

**Shared components:**
- `src/app/admin/_components/ImageDrop.tsx` — переиспользуемый drop-zone для одного фото
- `src/app/admin/_components/PhotoGrid.tsx` — сетка с drag-reorder для галереи

### Modify

- `package.json` — добавить `@mui/x-data-grid`, `react-hook-form`, `@hookform/resolvers`, `zod`

### Не трогаем

`src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, всё в `src/app/shop/`, `src/app/blog/`, и уж точно `.env.example`/`CLAUDE.md`/`README.md` (для субагентов: hard rule).

---

## Phase A — Foundation: deps + helpers + schemas

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install @mui/x-data-grid@^7.0.0 react-hook-form@^7.49.0 @hookform/resolvers@^3.3.0 zod@^3.22.0
```

Expected: 4 packages added.

- [ ] **Step 2: Verify TypeScript still clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore(deps): add deps for products module

@mui/x-data-grid — list page table
react-hook-form + @hookform/resolvers — form state + zod integration
zod — schema validation in server actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Zod schemas

**Files:**
- Create: `src/app/admin/_lib/schemas.ts`

- [ ] **Step 1: Write schemas**

```ts
import { z } from 'zod';

export const PRODUCT_TYPES = ['tshirt', 'hoodie', 'longsleeve', 'sweatshirt', 'cap', 'shopper'] as const;
export const PRODUCT_STOCK = ['in_stock', 'limited', 'out_of_stock'] as const;

export const sizeSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, 'Название размера обязательно').max(20),
    qty: z.number().int().min(0, 'Количество не может быть отрицательным'),
    sort_order: z.number().int().min(0),
});

export const photoSchema = z.object({
    id: z.string().uuid().optional(),
    url: z.string().url('Невалидный URL'),
    sort_order: z.number().int().min(0),
});

export const productSchema = z.object({
    id: z.string().uuid().optional(),
    slug: z.string()
        .min(1, 'Slug обязателен')
        .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    name: z.string().min(1, 'Название обязательно'),
    description: z.string().nullable().default(null),
    type: z.enum(PRODUCT_TYPES),
    price: z.number().positive('Цена должна быть положительной'),
    stock: z.enum(PRODUCT_STOCK).default('in_stock'),
    color: z.string().nullable().default(null),
    stage_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex-цвет в формате #ffffff').nullable().default(null),
    category: z.string().nullable().default(null),
    is_sale: z.boolean().default(false),
    is_for_printing: z.boolean().default(false),
    image_url: z.string().url().nullable().default(null),
    editor_front_view:   z.string().url().nullable().default(null),
    editor_back_view:    z.string().url().nullable().default(null),
    editor_lsleeve_view: z.string().url().nullable().default(null),
    editor_rsleeve_view: z.string().url().nullable().default(null),
    shipping_weight: z.number().nonnegative().nullable().default(null),
    shipping_width:  z.number().nonnegative().nullable().default(null),
    shipping_length: z.number().nonnegative().nullable().default(null),
    shipping_depth:  z.number().nonnegative().nullable().default(null),
    meta_title:       z.string().max(70).nullable().default(null),
    meta_description: z.string().max(170).nullable().default(null),

    sizes:     z.array(sizeSchema).default([]),
    photos:    z.array(photoSchema).default([]),
    linkedIds: z.array(z.string().uuid()).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
export type SizeInput   = z.infer<typeof sizeSchema>;
export type PhotoInput  = z.infer<typeof photoSchema>;
```

- [ ] **Step 2: TS check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/_lib/schemas.ts
git commit -m "feat(admin): zod schemas for product / size / photo

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `syncChildren` + `syncLinks` helpers

**Files:**
- Create: `src/app/admin/_lib/sync-children.ts`
- Create: `src/app/admin/_lib/sync-links.ts`

- [ ] **Step 1: Write `sync-children.ts`**

```ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ChildRow {
    id?: string;
    [key: string]: unknown;
}

/**
 * Sync 1:N child table to match `desired`. Generic для product_sizes /
 * product_gallery_photos / любого 1:N с FK на product_id.
 *
 * - rows из desired без `id` → insert
 * - rows из БД без соответствия в desired → delete
 * - совпадение по id → update полей
 */
export async function syncChildren<T extends ChildRow>(
    admin: SupabaseClient,
    table: 'product_sizes' | 'product_gallery_photos',
    productId: string,
    desired: T[]
): Promise<void> {
    // Загружаем текущее состояние
    const { data: existing, error: readErr } = await admin
        .from(table)
        .select('id')
        .eq('product_id', productId);
    if (readErr) throw readErr;

    const existingIds = new Set((existing ?? []).map((r) => r.id as string));
    const desiredIds  = new Set(desired.filter((r) => r.id).map((r) => r.id as string));

    const toDelete = [...existingIds].filter((id) => !desiredIds.has(id));
    const toInsert = desired
        .filter((r) => !r.id)
        .map((r) => ({ ...r, product_id: productId }));
    const toUpdate = desired
        .filter((r) => r.id && existingIds.has(r.id))
        .map((r) => ({ ...r, product_id: productId }));

    if (toDelete.length) {
        const { error } = await admin.from(table).delete().in('id', toDelete);
        if (error) throw error;
    }
    if (toInsert.length) {
        const { error } = await admin.from(table).insert(toInsert);
        if (error) throw error;
    }
    for (const row of toUpdate) {
        const { id, ...patch } = row;
        const { error } = await admin.from(table).update(patch).eq('id', id);
        if (error) throw error;
    }
}
```

- [ ] **Step 2: Write `sync-links.ts`**

```ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sync M:N self-reference table `product_links`. Полностью переписывает
 * связи товара под заданный список `linkedIds`.
 */
export async function syncLinks(
    admin: SupabaseClient,
    productId: string,
    linkedIds: string[]
): Promise<void> {
    // Сначала чистим все текущие связи
    const { error: delErr } = await admin
        .from('product_links')
        .delete()
        .eq('product_id', productId);
    if (delErr) throw delErr;

    if (linkedIds.length === 0) return;

    // Вставляем новые. Дедуплицируем + исключаем self-link.
    const rows = [...new Set(linkedIds)]
        .filter((id) => id !== productId)
        .map((id) => ({ product_id: productId, linked_product_id: id }));

    if (rows.length === 0) return;

    const { error: insErr } = await admin.from('product_links').insert(rows);
    if (insErr) throw insErr;
}
```

- [ ] **Step 3: TS check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/_lib/sync-children.ts src/app/admin/_lib/sync-links.ts
git commit -m "feat(admin): syncChildren + syncLinks helpers for 1:N and M:N relations

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `uploadImage` server action (sharp + Storage)

**Files:**
- Create: `src/app/admin/_lib/upload-image.ts`

- [ ] **Step 1: Write upload helper**

```ts
'use server';

import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from './require-admin';

const MAX_DIM = 2000;
const WEBP_QUALITY = 85;

export type Bucket = 'product-images' | 'blog-images' | 'gallery-images';

export interface UploadedImage {
    url: string;
    width: number;
    height: number;
    path: string;
}

/**
 * Принимает File (из FormData), прогоняет через sharp (resize до 2000px по
 * длинной стороне + webp 85%), заливает в указанный bucket по slug-based пути.
 *
 * `path` — относительный путь внутри bucket'а. Расширение принудительно
 * меняется на `.webp` (sharp всегда выдаёт webp).
 */
export async function uploadImage(opts: {
    bucket: Bucket;
    path: string;
    file: File;
}): Promise<UploadedImage> {
    await requireAdmin();

    if (!opts.file || opts.file.size === 0) {
        throw new Error('Файл пустой');
    }

    const buffer = Buffer.from(await opts.file.arrayBuffer());
    const optimized = await sharp(buffer)
        .rotate() // учитывает EXIF orientation
        .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    const meta = await sharp(optimized).metadata();

    // Принудительно .webp в финальном пути.
    const finalPath = opts.path.replace(/\.\w+$/, '') + '.webp';

    const admin = createAdminClient();
    const { error: uploadErr } = await admin.storage
        .from(opts.bucket)
        .upload(finalPath, optimized, {
            contentType: 'image/webp',
            upsert: true,
            cacheControl: '3600',
        });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = admin.storage.from(opts.bucket).getPublicUrl(finalPath);

    return {
        url: publicUrl,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        path: finalPath,
    };
}

/**
 * Удаляет файл из bucket'а. Используется при clear-фото / replace.
 */
export async function deleteImage(bucket: Bucket, path: string): Promise<void> {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.storage.from(bucket).remove([path]);
    if (error) throw error;
}
```

- [ ] **Step 2: TS check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/_lib/upload-image.ts
git commit -m "feat(admin): uploadImage server action with sharp resize + webp

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase B — List page

### Task 5: Products list page (server) + client DataGrid

**Files:**
- Create: `src/app/admin/(authed)/products/page.tsx`
- Create: `src/app/admin/(authed)/products/ProductsTable.tsx`

- [ ] **Step 1: Server page**

```tsx
// src/app/admin/(authed)/products/page.tsx
import Link from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { ProductsTable, type ProductRow } from './ProductsTable';

export const metadata = { title: 'Товары' };
export const dynamic = 'force-dynamic';

async function loadProducts(): Promise<ProductRow[]> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('products')
        .select('id, slug, name, type, price, stock, image_url, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[admin/products] load error:', error);
        return [];
    }
    return data ?? [];
}

export default async function ProductsListPage() {
    const products = await loadProducts();

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Товары</Typography>
                <Button component={Link} href="/admin/products/new" variant="contained">
                    + Новый
                </Button>
            </Stack>
            <ProductsTable products={products} />
        </Box>
    );
}
```

- [ ] **Step 2: Client DataGrid component**

```tsx
// src/app/admin/(authed)/products/ProductsTable.tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Avatar, Stack, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteProduct, duplicateProduct } from './list-actions';

export interface ProductRow {
    id: string;
    slug: string;
    name: string;
    type: string;
    price: number;
    stock: string | null;
    image_url: string | null;
    created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
    tshirt: 'Футболка',
    hoodie: 'Худи',
    longsleeve: 'Лонгслив',
    sweatshirt: 'Свитшот',
    cap: 'Кепка',
    shopper: 'Шоппер',
};

const STOCK_LABEL: Record<string, string> = {
    in_stock: 'В наличии',
    limited: 'Ограниченно',
    out_of_stock: 'Нет в наличии',
};

export function ProductsTable({ products }: { products: ProductRow[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const columns: GridColDef<ProductRow>[] = useMemo(() => [
        {
            field: 'image_url',
            headerName: 'Фото',
            width: 70,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams<ProductRow>) => (
                <Avatar
                    variant="rounded"
                    src={params.value as string | undefined}
                    sx={{ width: 40, height: 40 }}
                />
            ),
        },
        { field: 'name', headerName: 'Название', flex: 1, minWidth: 200 },
        {
            field: 'type',
            headerName: 'Тип',
            width: 140,
            valueFormatter: (v: string) => TYPE_LABEL[v] ?? v,
        },
        {
            field: 'price',
            headerName: 'Цена ₽',
            width: 110,
            type: 'number',
            valueFormatter: (v: number) => v?.toLocaleString('ru-RU'),
        },
        {
            field: 'stock',
            headerName: 'Наличие',
            width: 140,
            valueFormatter: (v: string | null) => (v ? STOCK_LABEL[v] ?? v : '—'),
        },
        {
            field: 'actions',
            headerName: '',
            width: 140,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams<ProductRow>) => (
                <Stack direction="row" spacing={0.5}>
                    <IconButton
                        size="small"
                        onClick={() => router.push(`/admin/products/${params.row.slug}`)}
                        title="Редактировать"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={pending}
                        onClick={() => {
                            startTransition(async () => {
                                const res = await duplicateProduct(params.row.id);
                                if (res.ok) {
                                    setToast({ severity: 'success', msg: 'Скопирован' });
                                    router.push(`/admin/products/${res.slug}`);
                                } else {
                                    setToast({ severity: 'error', msg: res.error });
                                }
                            });
                        }}
                        title="Дублировать"
                    >
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={pending}
                        onClick={() => {
                            if (!confirm(`Удалить «${params.row.name}»?`)) return;
                            startTransition(async () => {
                                const res = await deleteProduct(params.row.id);
                                if (res.ok) {
                                    setToast({ severity: 'success', msg: 'Удалён' });
                                    router.refresh();
                                } else {
                                    setToast({ severity: 'error', msg: res.error });
                                }
                            });
                        }}
                        title="Удалить"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ),
        },
    ], [router, pending]);

    return (
        <Box sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
            <DataGrid
                rows={products}
                columns={columns}
                getRowId={(r) => r.id}
                pageSizeOptions={[25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
                disableRowSelectionOnClick
            />
            <Snackbar
                open={!!toast}
                autoHideDuration={3000}
                onClose={() => setToast(null)}
            >
                {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
}
```

- [ ] **Step 3: Verify TS**

```bash
npx tsc --noEmit
```

Expected: errors about missing `list-actions.ts` (next task). That's fine — we'll commit Step 4 after Task 6 / 7.

- [ ] **Step 4: (Defer commit to after Task 6/7 so list+actions land together)**

---

### Task 6: List actions (delete + duplicate)

**Files:**
- Create: `src/app/admin/(authed)/products/list-actions.ts`

- [ ] **Step 1: Write actions**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';

export type ActionResult<T = unknown> =
    | { ok: true } & T
    | { ok: false; error: string };

export async function deleteProduct(id: string): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();

    // Сначала находим slug чтобы revalidate'ить /shop/[slug]
    const { data: prod } = await admin.from('products').select('slug').eq('id', id).maybeSingle();

    const { error } = await admin.from('products').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };

    revalidatePath('/admin/products');
    revalidatePath('/shop');
    if (prod?.slug) revalidatePath(`/shop/${prod.slug}`);

    return { ok: true };
}

export async function duplicateProduct(id: string): Promise<ActionResult<{ slug: string }>> {
    await requireAdmin();
    const admin = createAdminClient();

    // Загружаем исходный товар + sizes + photos
    const { data: source, error: srcErr } = await admin
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (srcErr || !source) return { ok: false, error: srcErr?.message ?? 'Товар не найден' };

    // Генерим уникальный slug `<slug>-copy-N`
    let candidate = `${source.slug}-copy`;
    let n = 1;
    while (true) {
        const { data: hit } = await admin.from('products').select('id').eq('slug', candidate).maybeSingle();
        if (!hit) break;
        n += 1;
        candidate = `${source.slug}-copy-${n}`;
        if (n > 50) return { ok: false, error: 'Не удалось подобрать уникальный slug' };
    }

    const { id: _ignoreId, created_at: _ignoreCreated, slug: _ignoreSlug, ...productFields } = source;
    const { data: created, error: insErr } = await admin
        .from('products')
        .insert({ ...productFields, slug: candidate, name: `${source.name} (копия)` })
        .select('id, slug')
        .single();
    if (insErr || !created) return { ok: false, error: insErr?.message ?? 'Ошибка создания' };

    // Копируем sizes
    const { data: sizes } = await admin
        .from('product_sizes').select('name, qty, sort_order').eq('product_id', id);
    if (sizes?.length) {
        await admin.from('product_sizes').insert(sizes.map((s) => ({ ...s, product_id: created.id })));
    }

    // Копируем gallery photos
    const { data: photos } = await admin
        .from('product_gallery_photos').select('url, sort_order').eq('product_id', id);
    if (photos?.length) {
        await admin.from('product_gallery_photos').insert(photos.map((p) => ({ ...p, product_id: created.id })));
    }

    // product_links НЕ копируем — это «друзья», обычно ручная связь.

    revalidatePath('/admin/products');
    return { ok: true, slug: created.slug };
}
```

- [ ] **Step 2: TS check**

```bash
npx tsc --noEmit
```

Expected: no errors now.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error|/admin/products" | head -10
```

Expected: `/admin/products` появляется в route table как λ (dynamic).

- [ ] **Step 4: Commit (list page + DataGrid + actions вместе)**

```bash
git add 'src/app/admin/(authed)/products'
git commit -m "$(cat <<'EOF'
feat(admin): products list page + DataGrid + delete/duplicate actions

- /admin/products: server component тянет товары через createAdminClient,
  рендерит MUI DataGrid (sort/filter/pagination из коробки).
- list-actions.ts: deleteProduct (с revalidate /shop/[slug]),
  duplicateProduct (copies sizes/photos, новый slug "<slug>-copy-N").

product_links не копируются — обычно ручная связь.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Smoke**

`npm run dev` → `http://localhost:3000/admin/products` → должен показать 25 товаров. Клик «Edit» вернёт 404 (форма ещё не построена). Клик «Дублировать» создаст копию. Клик «Удалить» спросит confirm и удалит.

---

## Phase C — Form skeleton + Main tab

### Task 7: ProductForm container + react-hook-form scaffolding

**Files:**
- Create: `src/app/admin/(authed)/products/ProductForm.tsx`

- [ ] **Step 1: Write form container**

```tsx
// src/app/admin/(authed)/products/ProductForm.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Box, Tabs, Tab, Button, Stack, Snackbar, Alert, Typography,
} from '@mui/material';
import { productSchema, type ProductInput } from '../../_lib/schemas';
import { saveProduct } from './save-action';
import { MainTab }        from './tabs/MainTab';
import { SizesTab }       from './tabs/SizesTab';
import { PhotosTab }      from './tabs/PhotosTab';
import { ConstructorTab } from './tabs/ConstructorTab';
import { SeoTab }         from './tabs/SeoTab';
import { LinksTab }       from './tabs/LinksTab';

const EMPTY_DEFAULTS: ProductInput = {
    slug: '',
    name: '',
    description: null,
    type: 'tshirt',
    price: 0,
    stock: 'in_stock',
    color: null,
    stage_color: null,
    category: null,
    is_sale: false,
    is_for_printing: false,
    image_url: null,
    editor_front_view:   null,
    editor_back_view:    null,
    editor_lsleeve_view: null,
    editor_rsleeve_view: null,
    shipping_weight: null,
    shipping_width:  null,
    shipping_length: null,
    shipping_depth:  null,
    meta_title: null,
    meta_description: null,
    sizes: [],
    photos: [],
    linkedIds: [],
};

const TABS = ['Основное', 'Размеры', 'Фото', 'Конструктор', 'SEO', 'Друзья'] as const;

export function ProductForm({ initial }: { initial: Partial<ProductInput> | null }) {
    const router = useRouter();
    const [tab, setTab] = useState(0);
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const methods = useForm<ProductInput>({
        resolver: zodResolver(productSchema),
        defaultValues: { ...EMPTY_DEFAULTS, ...initial },
        mode: 'onBlur',
    });

    const isEdit = !!initial?.id;

    // Beforeunload guard для несохранённых правок
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (methods.formState.isDirty && !pending) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [methods.formState.isDirty, pending]);

    const onSubmit = methods.handleSubmit((values) => {
        startTransition(async () => {
            const res = await saveProduct(values);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Сохранено' });
                if (!isEdit) router.push(`/admin/products/${res.slug}`);
                else methods.reset(values); // reset чтобы isDirty стал false
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    });

    return (
        <FormProvider {...methods}>
            <Box component="form" onSubmit={onSubmit}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h4">
                        {isEdit ? methods.getValues('name') || 'Без названия' : 'Новый товар'}
                    </Typography>
                    <Button type="submit" variant="contained" disabled={pending} size="large">
                        {pending ? 'Сохранение…' : 'Сохранить'}
                    </Button>
                </Stack>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    {TABS.map((label) => <Tab key={label} label={label} />)}
                </Tabs>

                <Box hidden={tab !== 0}><MainTab /></Box>
                <Box hidden={tab !== 1}><SizesTab /></Box>
                <Box hidden={tab !== 2}><PhotosTab /></Box>
                <Box hidden={tab !== 3}><ConstructorTab /></Box>
                <Box hidden={tab !== 4}><SeoTab /></Box>
                <Box hidden={tab !== 5}><LinksTab /></Box>

                <Snackbar
                    open={!!toast}
                    autoHideDuration={4000}
                    onClose={() => setToast(null)}
                >
                    {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
                </Snackbar>
            </Box>
        </FormProvider>
    );
}
```

- [ ] **Step 2: Создать пустые stub-файлы для табов (чтобы TS не плакал до Task 8-13)**

```bash
mkdir -p 'src/app/admin/(authed)/products/tabs'
for tab in MainTab SizesTab PhotosTab ConstructorTab SeoTab LinksTab; do
  echo "'use client';
export function $tab() { return null; }" > "src/app/admin/(authed)/products/tabs/$tab.tsx"
done
```

И пустой save-action (заглушка):

```ts
// src/app/admin/(authed)/products/save-action.ts
'use server';
import type { ProductInput } from '../../_lib/schemas';
export async function saveProduct(_input: ProductInput): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
    return { ok: false, error: 'not implemented yet' };
}
```

- [ ] **Step 3: TS check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add 'src/app/admin/(authed)/products/ProductForm.tsx' \
        'src/app/admin/(authed)/products/save-action.ts' \
        'src/app/admin/(authed)/products/tabs'
git commit -m "feat(admin): ProductForm container + empty tab stubs

react-hook-form + zodResolver, табы 'Основное/Размеры/Фото/Конструктор/SEO/Друзья',
beforeunload guard на dirty state. Tabs пока пустые — наполняем в следующих коммитах.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: MainTab (основные поля)

**Files:**
- Modify: `src/app/admin/(authed)/products/tabs/MainTab.tsx`

- [ ] **Step 1: Write MainTab**

```tsx
'use client';

import { Controller, useFormContext } from 'react-hook-form';
import {
    Grid, TextField, MenuItem, Switch, FormControlLabel, InputAdornment, Box,
} from '@mui/material';
import { PRODUCT_TYPES, PRODUCT_STOCK, type ProductInput } from '../../../_lib/schemas';

const TYPE_OPTIONS = [
    { value: 'tshirt',     label: 'Футболка' },
    { value: 'hoodie',     label: 'Худи' },
    { value: 'longsleeve', label: 'Лонгслив' },
    { value: 'sweatshirt', label: 'Свитшот' },
    { value: 'cap',        label: 'Кепка' },
    { value: 'shopper',    label: 'Шоппер' },
] as const;

const STOCK_OPTIONS = [
    { value: 'in_stock',     label: 'В наличии' },
    { value: 'limited',      label: 'Ограниченно' },
    { value: 'out_of_stock', label: 'Нет в наличии' },
] as const;

export function MainTab() {
    const { register, control, formState: { errors }, getValues } = useFormContext<ProductInput>();
    const isEdit = !!getValues('id');

    return (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    {...register('slug')}
                    label="Slug"
                    fullWidth
                    disabled={isEdit}
                    error={!!errors.slug}
                    helperText={errors.slug?.message ?? 'Латиница, цифры, дефис. После создания не меняется.'}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    {...register('name')}
                    label="Название"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} select label="Тип" fullWidth>
                            {TYPE_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </TextField>
                    )}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                    {...register('category')}
                    label="Категория"
                    fullWidth
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                    name="stock"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} select label="Наличие" fullWidth>
                            {STOCK_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </TextField>
                    )}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                    {...register('price', { valueAsNumber: true })}
                    label="Цена"
                    type="number"
                    fullWidth
                    InputProps={{ endAdornment: <InputAdornment position="end">₽</InputAdornment> }}
                    error={!!errors.price}
                    helperText={errors.price?.message}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                    {...register('color')}
                    label="Цвет (название)"
                    fullWidth
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                    name="stage_color"
                    control={control}
                    render={({ field }) => (
                        <Box display="flex" alignItems="center" gap={1}>
                            <TextField
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                label="Hex-цвет"
                                placeholder="#ffffff"
                                fullWidth
                                error={!!errors.stage_color}
                                helperText={errors.stage_color?.message}
                            />
                            <Box
                                sx={{
                                    width: 40, height: 40, borderRadius: 1,
                                    border: '1px solid', borderColor: 'divider',
                                    bgcolor: field.value || 'transparent',
                                    flexShrink: 0,
                                }}
                            />
                        </Box>
                    )}
                />
            </Grid>

            <Grid size={{ xs: 12 }}>
                <TextField
                    {...register('description')}
                    label="Описание"
                    fullWidth
                    multiline
                    rows={4}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                    name="is_for_printing"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={<Switch checked={field.value} onChange={field.onChange} />}
                            label="Для печати (показывать в конструкторе)"
                        />
                    )}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                    name="is_sale"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={<Switch checked={field.value} onChange={field.onChange} />}
                            label="Распродажа"
                        />
                    )}
                />
            </Grid>
        </Grid>
    );
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add 'src/app/admin/(authed)/products/tabs/MainTab.tsx'
git commit -m "feat(admin): MainTab — slug/name/type/category/stock/price/color/desc/flags

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase D — Sizes + Photos tabs

### Task 9: SizesTab (inline таблица)

**Files:**
- Modify: `src/app/admin/(authed)/products/tabs/SizesTab.tsx`

- [ ] **Step 1: Write SizesTab**

```tsx
'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import {
    Box, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, IconButton, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ProductInput } from '../../../_lib/schemas';

export function SizesTab() {
    const { control, register, formState: { errors } } = useFormContext<ProductInput>();
    const { fields, append, remove } = useFieldArray({ control, name: 'sizes' });

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Размеры товара. Порядок отображения управляется полем «Sort».
            </Typography>

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell width={140}>Количество</TableCell>
                        <TableCell width={100}>Sort</TableCell>
                        <TableCell width={60} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {fields.map((row, idx) => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <TextField
                                    {...register(`sizes.${idx}.name`)}
                                    size="small"
                                    fullWidth
                                    error={!!errors.sizes?.[idx]?.name}
                                    helperText={errors.sizes?.[idx]?.name?.message}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    {...register(`sizes.${idx}.qty`, { valueAsNumber: true })}
                                    type="number"
                                    size="small"
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    {...register(`sizes.${idx}.sort_order`, { valueAsNumber: true })}
                                    type="number"
                                    size="small"
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <IconButton size="small" onClick={() => remove(idx)} title="Удалить">
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                    {fields.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} align="center">
                                <Typography variant="body2" color="text.secondary" py={2}>
                                    Размеры не заданы
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Box mt={2}>
                <Button
                    startIcon={<AddIcon />}
                    onClick={() => append({ name: '', qty: 0, sort_order: fields.length })}
                    variant="outlined"
                >
                    Добавить размер
                </Button>
            </Box>
        </Box>
    );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add 'src/app/admin/(authed)/products/tabs/SizesTab.tsx'
git commit -m "feat(admin): SizesTab — inline таблица размеров (add/edit/delete)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: ImageDrop reusable component

**Files:**
- Create: `src/app/admin/_components/ImageDrop.tsx`

- [ ] **Step 1: Write component**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Box, Button, CircularProgress, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { uploadImage, type Bucket } from '../_lib/upload-image';

interface ImageDropProps {
    value: string | null;
    onChange: (url: string | null) => void;
    bucket: Bucket;
    pathPrefix: string;        // напр. "classic-tee/main" → станет "classic-tee/main.webp"
    label?: string;
    aspect?: '1 / 1' | '3 / 4' | '4 / 5';
    minHeight?: number;
}

/**
 * Single-image drop-zone. При drop/click заливает файл через uploadImage
 * server action и обновляет родительский state через onChange.
 */
export function ImageDrop({
    value, onChange, bucket, pathPrefix, label, aspect = '3 / 4', minHeight = 240,
}: ImageDropProps) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = (file: File) => {
        setError(null);
        startTransition(async () => {
            try {
                const res = await uploadImage({ bucket, path: pathPrefix, file });
                onChange(res.url);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Ошибка загрузки');
            }
        });
    };

    return (
        <Box>
            {label && (
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    {label}
                </Typography>
            )}
            <Box
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                }}
                sx={{
                    position: 'relative',
                    aspectRatio: aspect,
                    minHeight,
                    border: '2px dashed',
                    borderColor: dragOver ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: dragOver ? 'action.hover' : 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                {value && (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <IconButton
                            size="small"
                            onClick={() => onChange(null)}
                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </>
                )}
                {pending && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)' }}>
                        <CircularProgress />
                    </Box>
                )}
                {!value && !pending && (
                    <Box textAlign="center" p={2}>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                            Перетащи файл сюда
                        </Typography>
                        <Button component="label" variant="outlined" size="small">
                            Выбрать
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/avif"
                                hidden
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleFile(f);
                                }}
                            />
                        </Button>
                    </Box>
                )}
            </Box>
            {error && (
                <Typography variant="caption" color="error" display="block" mt={0.5}>
                    {error}
                </Typography>
            )}
        </Box>
    );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/admin/_components/ImageDrop.tsx
git commit -m "feat(admin): ImageDrop reusable drop-zone with upload

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: PhotosTab + PhotoGrid

**Files:**
- Create: `src/app/admin/_components/PhotoGrid.tsx`
- Modify: `src/app/admin/(authed)/products/tabs/PhotosTab.tsx`

- [ ] **Step 1: Write PhotoGrid**

```tsx
// src/app/admin/_components/PhotoGrid.tsx
'use client';

import { useState, useTransition } from 'react';
import { Box, Grid, IconButton, Button, CircularProgress, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { uploadImage, type Bucket } from '../_lib/upload-image';

export interface GridPhoto {
    id?: string;
    url: string;
    sort_order: number;
}

interface PhotoGridProps {
    value: GridPhoto[];
    onChange: (next: GridPhoto[]) => void;
    bucket: Bucket;
    pathPrefix: string;     // "classic-tee/gallery"
}

export function PhotoGrid({ value, onChange, bucket, pathPrefix }: PhotoGridProps) {
    const [pending, startTransition] = useTransition();
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const sorted = [...value].sort((a, b) => a.sort_order - b.sort_order);

    const handleFiles = (files: FileList) => {
        startTransition(async () => {
            const uploaded: GridPhoto[] = [];
            let nextOrder = sorted.length > 0
                ? Math.max(...sorted.map((p) => p.sort_order)) + 1
                : 0;

            for (const file of Array.from(files)) {
                const uniq = crypto.randomUUID();
                const res = await uploadImage({
                    bucket,
                    path: `${pathPrefix}/${uniq}`,
                    file,
                });
                uploaded.push({ url: res.url, sort_order: nextOrder++ });
            }
            onChange([...value, ...uploaded]);
        });
    };

    const remove = (idx: number) => {
        const next = [...sorted];
        next.splice(idx, 1);
        onChange(next.map((p, i) => ({ ...p, sort_order: i })));
    };

    const onDragStart = (idx: number) => setDragIdx(idx);
    const onDragOver = (e: React.DragEvent) => e.preventDefault();
    const onDrop = (targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); return; }
        const next = [...sorted];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(targetIdx, 0, moved);
        onChange(next.map((p, i) => ({ ...p, sort_order: i })));
        setDragIdx(null);
    };

    return (
        <Box>
            <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null) return; // reorder a не upload
                    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
                }}
                sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                    position: 'relative',
                }}
            >
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Перетащи файлы сюда или выбери
                </Typography>
                <Button component="label" variant="outlined" size="small" disabled={pending}>
                    {pending ? <CircularProgress size={16} /> : 'Выбрать файлы'}
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        multiple
                        hidden
                        onChange={(e) => {
                            if (e.target.files?.length) handleFiles(e.target.files);
                            e.currentTarget.value = '';
                        }}
                    />
                </Button>
            </Box>

            <Grid container spacing={1}>
                {sorted.map((photo, idx) => (
                    <Grid key={photo.url} size={{ xs: 6, sm: 4, md: 3 }}>
                        <Box
                            draggable
                            onDragStart={() => onDragStart(idx)}
                            onDragOver={onDragOver}
                            onDrop={() => onDrop(idx)}
                            sx={{
                                position: 'relative',
                                aspectRatio: '3 / 4',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                cursor: 'move',
                                opacity: dragIdx === idx ? 0.3 : 1,
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <IconButton
                                size="small"
                                onClick={() => remove(idx)}
                                sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                            <Box sx={{
                                position: 'absolute', bottom: 4, left: 4,
                                bgcolor: 'background.paper', px: 0.5, borderRadius: 0.5,
                                fontSize: 11, color: 'text.secondary',
                            }}>
                                #{idx + 1}
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
```

- [ ] **Step 2: Write PhotosTab**

```tsx
// src/app/admin/(authed)/products/tabs/PhotosTab.tsx
'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, Grid, Typography } from '@mui/material';
import { ImageDrop } from '../../../_components/ImageDrop';
import { PhotoGrid, type GridPhoto } from '../../../_components/PhotoGrid';
import type { ProductInput } from '../../../_lib/schemas';

export function PhotosTab() {
    const { control } = useFormContext<ProductInput>();
    const slug = useWatch({ control, name: 'slug' });

    if (!slug) {
        return (
            <Typography color="text.secondary">
                Сначала задай slug на табе «Основное» — он используется в пути файлов.
            </Typography>
        );
    }

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="h6" mb={1}>Главное фото</Typography>
                <Controller
                    name="image_url"
                    control={control}
                    render={({ field }) => (
                        <ImageDrop
                            value={field.value}
                            onChange={field.onChange}
                            bucket="product-images"
                            pathPrefix={`${slug}/main`}
                            aspect="3 / 4"
                        />
                    )}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="h6" mb={1}>Галерея</Typography>
                <Controller
                    name="photos"
                    control={control}
                    render={({ field }) => (
                        <PhotoGrid
                            value={field.value as GridPhoto[]}
                            onChange={field.onChange}
                            bucket="product-images"
                            pathPrefix={`${slug}/gallery`}
                        />
                    )}
                />
            </Grid>
        </Grid>
    );
}
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/admin/_components/PhotoGrid.tsx \
        'src/app/admin/(authed)/products/tabs/PhotosTab.tsx'
git commit -m "feat(admin): PhotosTab — main image + gallery с drag-reorder

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase E — Constructor + SEO + Links tabs

### Task 12: ConstructorTab (4 ракурса + shipping)

**Files:**
- Modify: `src/app/admin/(authed)/products/tabs/ConstructorTab.tsx`

- [ ] **Step 1: Write ConstructorTab**

```tsx
'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, Grid, TextField, Typography, InputAdornment } from '@mui/material';
import { ImageDrop } from '../../../_components/ImageDrop';
import type { ProductInput } from '../../../_lib/schemas';

const VIEWS: Array<{ field: keyof ProductInput; label: string; suffix: string }> = [
    { field: 'editor_front_view',   label: 'Перед',     suffix: 'front' },
    { field: 'editor_back_view',    label: 'Спина',     suffix: 'back' },
    { field: 'editor_lsleeve_view', label: 'Левый рукав',  suffix: 'lsleeve' },
    { field: 'editor_rsleeve_view', label: 'Правый рукав', suffix: 'rsleeve' },
];

export function ConstructorTab() {
    const { control, register } = useFormContext<ProductInput>();
    const slug = useWatch({ control, name: 'slug' });

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Картинки для 3D-мокапа в конструкторе. 4 ракурса.
            </Typography>

            {!slug && (
                <Typography color="text.secondary" mb={3}>
                    Сначала задай slug на табе «Основное».
                </Typography>
            )}

            <Grid container spacing={2} mb={4}>
                {VIEWS.map(({ field, label, suffix }) => (
                    <Grid key={field} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Controller
                            name={field as 'editor_front_view'}
                            control={control}
                            render={({ field: ctrl }) => (
                                <ImageDrop
                                    value={ctrl.value as string | null}
                                    onChange={ctrl.onChange}
                                    bucket="product-images"
                                    pathPrefix={`${slug || 'unknown'}/editor/${suffix}`}
                                    label={label}
                                    aspect="3 / 4"
                                    minHeight={180}
                                />
                            )}
                        />
                    </Grid>
                ))}
            </Grid>

            <Typography variant="h6" mb={1}>Габариты доставки</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Используется CDEK-калькулятором.
            </Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                        {...register('shipping_weight', { setValueAs: (v) => v === '' ? null : Number(v) })}
                        label="Вес"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">кг</InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                        {...register('shipping_width', { setValueAs: (v) => v === '' ? null : Number(v) })}
                        label="Ширина"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">см</InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                        {...register('shipping_length', { setValueAs: (v) => v === '' ? null : Number(v) })}
                        label="Длина"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">см</InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                        {...register('shipping_depth', { setValueAs: (v) => v === '' ? null : Number(v) })}
                        label="Толщина"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">см</InputAdornment> }}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add 'src/app/admin/(authed)/products/tabs/ConstructorTab.tsx'
git commit -m "feat(admin): ConstructorTab — 4 ракурса + габариты доставки

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: SeoTab

**Files:**
- Modify: `src/app/admin/(authed)/products/tabs/SeoTab.tsx`

- [ ] **Step 1: Write SeoTab**

```tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { Grid, TextField, Typography, Box } from '@mui/material';
import type { ProductInput } from '../../../_lib/schemas';

export function SeoTab() {
    const { register, formState: { errors }, watch } = useFormContext<ProductInput>();
    const title = watch('meta_title') ?? '';
    const desc = watch('meta_description') ?? '';

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Метатеги для поисковиков и социальных сетей. Пусто = используется name/description.
            </Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        {...register('meta_title')}
                        label="Meta title"
                        fullWidth
                        helperText={`${title.length} / 70`}
                        error={!!errors.meta_title}
                    />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        {...register('meta_description')}
                        label="Meta description"
                        fullWidth
                        multiline
                        rows={3}
                        helperText={`${desc.length} / 170`}
                        error={!!errors.meta_description}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add 'src/app/admin/(authed)/products/tabs/SeoTab.tsx'
git commit -m "feat(admin): SeoTab — meta_title + meta_description with length counters

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: LinksTab (Друзья товара)

**Files:**
- Modify: `src/app/admin/(authed)/products/tabs/LinksTab.tsx`

- [ ] **Step 1: Write LinksTab**

```tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import {
    Box, Autocomplete, TextField, Chip, Avatar, Typography,
} from '@mui/material';
import { searchProducts, type ProductOption } from '../link-search-action';
import type { ProductInput } from '../../../_lib/schemas';

export function LinksTab() {
    const { control, getValues } = useFormContext<ProductInput>();
    const currentId = getValues('id');
    const [options, setOptions] = useState<ProductOption[]>([]);
    const [selected, setSelected] = useState<ProductOption[]>([]);
    const [pending, startTransition] = useTransition();
    const [query, setQuery] = useState('');

    // Initial load для уже привязанных
    useEffect(() => {
        const linked = getValues('linkedIds') || [];
        if (linked.length === 0) return;
        startTransition(async () => {
            const res = await searchProducts({ ids: linked, excludeId: currentId });
            setSelected(res);
        });
    }, [getValues, currentId]);

    // Search по query
    useEffect(() => {
        if (query.length < 2) {
            setOptions([]);
            return;
        }
        const t = setTimeout(() => {
            startTransition(async () => {
                const res = await searchProducts({ query, excludeId: currentId });
                setOptions(res);
            });
        }, 250);
        return () => clearTimeout(t);
    }, [query, currentId]);

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Связанные товары («с этим товаром покупают»). Можно выбрать несколько.
            </Typography>
            <Controller
                name="linkedIds"
                control={control}
                render={({ field }) => (
                    <Autocomplete<ProductOption, true>
                        multiple
                        value={selected}
                        options={options}
                        loading={pending}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onChange={(_, newVal) => {
                            setSelected(newVal);
                            field.onChange(newVal.map((o) => o.id));
                        }}
                        onInputChange={(_, v) => setQuery(v)}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                                const { key, ...chipProps } = getTagProps({ index });
                                return (
                                    <Chip
                                        key={key}
                                        {...chipProps}
                                        avatar={option.image_url ? <Avatar src={option.image_url} /> : undefined}
                                        label={option.name}
                                    />
                                );
                            })
                        }
                        renderInput={(params) => (
                            <TextField {...params} label="Найди товар" placeholder="Начни вводить название" />
                        )}
                    />
                )}
            />
        </Box>
    );
}
```

- [ ] **Step 2: Create search action**

```ts
// src/app/admin/(authed)/products/link-search-action.ts
'use server';

import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';

export interface ProductOption {
    id: string;
    slug: string;
    name: string;
    image_url: string | null;
}

export async function searchProducts(opts: {
    query?: string;
    ids?: string[];
    excludeId?: string;
}): Promise<ProductOption[]> {
    await requireAdmin();
    const admin = createAdminClient();
    let q = admin.from('products').select('id, slug, name, image_url').limit(20);

    if (opts.ids?.length) {
        q = q.in('id', opts.ids);
    } else if (opts.query) {
        q = q.ilike('name', `%${opts.query}%`);
    } else {
        return [];
    }

    if (opts.excludeId) q = q.neq('id', opts.excludeId);

    const { data, error } = await q;
    if (error) return [];
    return data ?? [];
}
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add 'src/app/admin/(authed)/products/tabs/LinksTab.tsx' \
        'src/app/admin/(authed)/products/link-search-action.ts'
git commit -m "feat(admin): LinksTab — multi-select связанных товаров с поиском

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase F — Save action + page wiring

### Task 15: `saveProduct` server action

**Files:**
- Modify: `src/app/admin/(authed)/products/save-action.ts`

- [ ] **Step 1: Replace stub with real implementation**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { productSchema, type ProductInput } from '../../_lib/schemas';
import { syncChildren } from '../../_lib/sync-children';
import { syncLinks } from '../../_lib/sync-links';

export type SaveResult =
    | { ok: true; slug: string }
    | { ok: false; error: string };

export async function saveProduct(input: ProductInput): Promise<SaveResult> {
    await requireAdmin();

    const parsed = productSchema.safeParse(input);
    if (!parsed.success) {
        const first = parsed.error.errors[0];
        return { ok: false, error: `${first.path.join('.')}: ${first.message}` };
    }
    const data = parsed.data;

    const admin = createAdminClient();

    // Разделяем поля товара и вложенные коллекции
    const { id, sizes, photos, linkedIds, ...productFields } = data;

    // upsert по id (если есть) или insert если нет
    let productId = id;
    if (productId) {
        const { error } = await admin.from('products')
            .update(productFields)
            .eq('id', productId);
        if (error) return { ok: false, error: error.message };
    } else {
        // Проверка уникальности slug
        const { data: dup } = await admin.from('products')
            .select('id').eq('slug', productFields.slug).maybeSingle();
        if (dup) return { ok: false, error: 'Товар с таким slug уже существует' };

        const { data: created, error } = await admin.from('products')
            .insert(productFields)
            .select('id')
            .single();
        if (error || !created) return { ok: false, error: error?.message ?? 'Ошибка создания' };
        productId = created.id;
    }

    // Синхронизируем вложенные сущности
    try {
        await syncChildren(admin, 'product_sizes',          productId, sizes);
        await syncChildren(admin, 'product_gallery_photos', productId, photos);
        await syncLinks(admin, productId, linkedIds);
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Ошибка синхронизации связей' };
    }

    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath(`/shop/${productFields.slug}`);

    return { ok: true, slug: productFields.slug };
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add 'src/app/admin/(authed)/products/save-action.ts'
git commit -m "feat(admin): saveProduct server action with zod validation + sync helpers

Атомарно: upsert products + syncChildren(sizes, photos) + syncLinks.
revalidatePath /admin/products, /shop, /shop/[slug].

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: new + [slug] pages

**Files:**
- Create: `src/app/admin/(authed)/products/new/page.tsx`
- Create: `src/app/admin/(authed)/products/[slug]/page.tsx`

- [ ] **Step 1: New page**

```tsx
// src/app/admin/(authed)/products/new/page.tsx
import { ProductForm } from '../ProductForm';

export const metadata = { title: 'Новый товар' };

export default function NewProductPage() {
    return <ProductForm initial={null} />;
}
```

- [ ] **Step 2: Edit page**

```tsx
// src/app/admin/(authed)/products/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../../_lib/require-admin';
import { ProductForm } from '../ProductForm';
import type { ProductInput } from '../../../_lib/schemas';

export const dynamic = 'force-dynamic';

async function loadProduct(slug: string): Promise<ProductInput | null> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: prod } = await admin
        .from('products')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
    if (!prod) return null;

    const [{ data: sizes }, { data: photos }, { data: links }] = await Promise.all([
        admin.from('product_sizes')
            .select('id, name, qty, sort_order')
            .eq('product_id', prod.id)
            .order('sort_order'),
        admin.from('product_gallery_photos')
            .select('id, url, sort_order')
            .eq('product_id', prod.id)
            .order('sort_order'),
        admin.from('product_links')
            .select('linked_product_id')
            .eq('product_id', prod.id),
    ]);

    return {
        id: prod.id,
        slug: prod.slug,
        name: prod.name,
        description: prod.description,
        type: prod.type,
        price: prod.price,
        stock: prod.stock ?? 'in_stock',
        color: prod.color,
        stage_color: prod.stage_color,
        category: prod.category,
        is_sale: prod.is_sale,
        is_for_printing: prod.is_for_printing,
        image_url: prod.image_url,
        editor_front_view:   prod.editor_front_view,
        editor_back_view:    prod.editor_back_view,
        editor_lsleeve_view: prod.editor_lsleeve_view,
        editor_rsleeve_view: prod.editor_rsleeve_view,
        shipping_weight: prod.shipping_weight,
        shipping_width:  prod.shipping_width,
        shipping_length: prod.shipping_length,
        shipping_depth:  prod.shipping_depth,
        meta_title:       prod.meta_title,
        meta_description: prod.meta_description,
        sizes:     sizes ?? [],
        photos:    photos ?? [],
        linkedIds: (links ?? []).map((l) => l.linked_product_id),
    };
}

export default async function EditProductPage({ params }: { params: { slug: string } }) {
    const product = await loadProduct(params.slug);
    if (!product) notFound();
    return <ProductForm initial={product} />;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    return { title: params.slug };
}
```

- [ ] **Step 3: TS + build**

```bash
npx tsc --noEmit
npm run build 2>&1 | grep -E "error|/admin/products" | head -10
```

Expected:
- no TS errors
- routes in table: `/admin/products`, `/admin/products/new`, `/admin/products/[slug]` (all λ dynamic)

- [ ] **Step 4: Commit**

```bash
git add 'src/app/admin/(authed)/products/new' 'src/app/admin/(authed)/products/[slug]'
git commit -m "feat(admin): /admin/products/new + /admin/products/[slug] pages

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: End-to-end smoke test

Ручной чек-лист — фиксирует, что Products module работает целиком.

- [ ] **Step 1: Запустить dev**

```bash
npm run dev
```

- [ ] **Step 2: Список товаров**

http://localhost:3000/admin/products
- Видна таблица с 25 товарами
- Сортировка по name/type/price работает
- Фильтр через панель колонок работает
- Пагинация (25/50/100) переключается

- [ ] **Step 3: Создать новый товар**

`+ Новый` → форма открыта на табе «Основное»:
- Заполнить slug = `test-tshirt`, name = `Тест футболка`, type = tshirt, price = 100
- Перейти на «Размеры» → добавить размер S, qty 10, sort 0
- Перейти на «Фото» → залить любую картинку в «Главное фото» (увидеть превью)
- Сохранить → snackbar «Сохранено» → редирект на `/admin/products/test-tshirt`

- [ ] **Step 4: Редактировать**

- На той же странице (форма уже в режиме edit, slug заблокирован)
- Поменять name на `Тест 2` → Сохранить → snackbar «Сохранено»
- Обновить страницу — name остался `Тест 2`

- [ ] **Step 5: Проверить публичный сайт**

http://localhost:3000/shop → новый товар `test-tshirt` появился в каталоге
http://localhost:3000/shop/test-tshirt → карточка товара работает

- [ ] **Step 6: Дублировать**

Вернуться на `/admin/products` → у `test-tshirt` нажать «Дублировать»:
- Snackbar «Скопирован»
- Открылась форма с `test-tshirt-copy`, name = `Тест 2 (копия)`
- Размеры и фото скопированы

- [ ] **Step 7: Удалить**

На списке нажать «Удалить» у `test-tshirt-copy`:
- Confirm-диалог
- После OK → snackbar «Удалён», таблица обновлена, товара нет

Удалить также `test-tshirt`.

- [ ] **Step 8: Проверить, что публичный сайт не сломан**

- http://localhost:3000/ — главная
- http://localhost:3000/shop — каталог
- http://localhost:3000/blog — блог
- http://localhost:3000/shop/classic-tee — карточка одного из существующих товаров

Всё должно работать как раньше.

---

## Definition of done

✅ `/admin/products` показывает DataGrid со всеми товарами + поиск/фильтр/пагинация
✅ `+ Новый` создаёт товар через 6-табную форму с валидацией
✅ Редактирование сохраняет товар + sizes + photos + links атомарно
✅ Дублировать / удалить работают, обновляют список и публичный сайт через revalidatePath
✅ Картинки заливаются в `product-images` bucket, оптимизируются через sharp (webp, max 2000px)
✅ Публичный сайт (/shop, /shop/[slug]) продолжает работать как раньше
✅ `npm run build` проходит без ошибок
✅ TS strict без `any`/`@ts-ignore` в новом коде

## Out of scope (для будущих PR)

- Bulk операции (CSV import/export, mass-edit)
- История изменений / audit log
- Inline-edit прямо в DataGrid (только через форму)
- Активная выделенная нав-пунктом подсветка (sidebar `usePathname`)
- Loading skeleton'ы (есть default через `<Suspense>` + `loading.tsx` если нужно)
- Тесты `syncChildren`/`syncLinks` (Vitest не настроен — добавим в Plan 3)
- Crop/обрезка картинок при загрузке
- Поиск товаров на список-странице (DataGrid имеет встроенный quick-filter, активируем в Plan 3 при необходимости)
