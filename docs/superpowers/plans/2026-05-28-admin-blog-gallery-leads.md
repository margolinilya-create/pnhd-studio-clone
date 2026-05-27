# Admin Blog + Gallery + Leads Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть оставшиеся 3 модуля admin-панели:
- **Blog** — list постов + форма с Tiptap WYSIWYG для `body_html`, DOMPurify sanitize на save, снять `dynamicParams: false` с публичного `/blog/[post]`
- **Gallery** — единый экран с drop-zone, drag-reorder, edit-alt dialog
- **Leads** — read-only список с фильтром по `status` + кнопки смены статуса (`new → contacted → done/spam`)

После этого Plan 3 + предыдущие 2 плана = полный admin-кабинет, готовый к merge в `main`.

**Architecture:** Тот же паттерн, что и в Plan 2 — server component тянет данные через `createAdminClient()` после `requireAdmin()`, передаёт в client component, который рендерит MUI Table / Tiptap / drop-zone. Save через Server Actions с zod-валидацией и `revalidatePath`.

**Tech Stack:** Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`), `isomorphic-dompurify`, всё остальное уже есть.

**Reference:** [Design spec §§8-10](../specs/2026-05-27-admin-panel-design.md), [Plan 1](./2026-05-27-admin-foundation.md), [Plan 2](./2026-05-27-admin-products-module.md)

**Branch:** продолжаем `feat/admin-foundation` (тот же).

---

## File map

### Create

**Helpers:**
- `src/app/admin/_lib/sanitize-html.ts` — DOMPurify wrapper (server-only)

**Blog:**
- `src/app/admin/(authed)/blog/page.tsx` — list (server)
- `src/app/admin/(authed)/blog/BlogTable.tsx` — client list
- `src/app/admin/(authed)/blog/list-actions.ts` — delete/duplicate
- `src/app/admin/(authed)/blog/new/page.tsx`
- `src/app/admin/(authed)/blog/[slug]/page.tsx`
- `src/app/admin/(authed)/blog/BlogForm.tsx` — client form
- `src/app/admin/(authed)/blog/TiptapEditor.tsx` — WYSIWYG editor
- `src/app/admin/(authed)/blog/save-action.ts` — savePost
- `src/app/admin/_lib/blog-schemas.ts` — zod для blog_posts

**Gallery:**
- `src/app/admin/(authed)/gallery/page.tsx` — server
- `src/app/admin/(authed)/gallery/GalleryGrid.tsx` — client
- `src/app/admin/(authed)/gallery/actions.ts` — uploadGalleryItem / updateGalleryItem / deleteGalleryItem / reorderGallery

**Leads:**
- `src/app/admin/(authed)/leads/page.tsx` — server
- `src/app/admin/(authed)/leads/LeadsTable.tsx` — client
- `src/app/admin/(authed)/leads/actions.ts` — updateLeadStatus

### Modify

- `package.json` — добавить tiptap-пакеты + isomorphic-dompurify
- `src/app/blog/[post]/page.tsx` — снять `dynamicParams: false`

---

## Phase A — Deps + helpers

### Task 1: Install Tiptap + DOMPurify

- [ ] **Step 1: Install**

```bash
npm install @tiptap/react@^2.1.0 @tiptap/pm@^2.1.0 @tiptap/starter-kit@^2.1.0 @tiptap/extension-link@^2.1.0 @tiptap/extension-image@^2.1.0 isomorphic-dompurify@^2.16.0
```

- [ ] **Step 2: Verify**

```bash
grep -E '"@tiptap|"isomorphic-dompurify"' package.json
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add tiptap + isomorphic-dompurify for blog editor

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2: sanitize-html helper + blog zod schemas

- [ ] **Step 1: `src/app/admin/_lib/sanitize-html.ts`**

```ts
import 'server-only';
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
    'p', 'h2', 'h3', 'strong', 'em', 'u', 's',
    'ul', 'ol', 'li',
    'a', 'img', 'blockquote', 'br',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel'];

export function sanitizeBlogHtml(input: string): string {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
    });
}
```

- [ ] **Step 2: `src/app/admin/_lib/blog-schemas.ts`**

```ts
import { z } from 'zod';

export const blogPostSchema = z.object({
    id: z.string().uuid().optional(),
    slug: z.string()
        .min(1, 'Slug обязателен')
        .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    title: z.string().min(1, 'Заголовок обязателен'),
    subtitle: z.string().nullable().default(null),
    cover: z.string().url().nullable().default(null),
    author: z.string().default('PNHD STUDIO'),
    hashtags: z.array(z.string()).default([]),
    body_html: z.string().default(''),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/admin/_lib/sanitize-html.ts src/app/admin/_lib/blog-schemas.ts
git commit -m "feat(admin): blog helpers — DOMPurify sanitize + zod schema

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase B — Blog list + actions

### Task 3: Blog list page

- [ ] **Step 1: `src/app/admin/(authed)/blog/page.tsx`**

```tsx
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { BlogListPageClient } from './BlogListPageClient';

export const metadata = { title: 'Блог' };
export const dynamic = 'force-dynamic';

export interface BlogRow {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    cover: string | null;
    author: string | null;
    hashtags: string[];
    created_at: string;
}

async function loadPosts(): Promise<BlogRow[]> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('blog_posts')
        .select('id, slug, title, subtitle, cover, author, hashtags, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[admin/blog] load error:', error);
        return [];
    }
    return data ?? [];
}

export default async function BlogListPage() {
    const posts = await loadPosts();
    return <BlogListPageClient posts={posts} />;
}
```

- [ ] **Step 2: `src/app/admin/(authed)/blog/BlogListPageClient.tsx`** (client wrapper по MUI v7 pattern)

```tsx
'use client';

import Link from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { BlogTable } from './BlogTable';
import type { BlogRow } from './page';

export function BlogListPageClient({ posts }: { posts: BlogRow[] }) {
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Блог-посты ({posts.length})</Typography>
                <Button component={Link} href="/admin/blog/new" variant="contained">
                    + Новый
                </Button>
            </Stack>
            <BlogTable posts={posts} />
        </Box>
    );
}
```

- [ ] **Step 3: `src/app/admin/(authed)/blog/BlogTable.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Box, IconButton, Avatar, Stack, Snackbar, Alert, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { deletePost, duplicatePost } from './list-actions';
import type { BlogRow } from './page';

export function BlogTable({ posts }: { posts: BlogRow[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const handleDelete = (id: string, title: string) => {
        if (!confirm(`Удалить пост «${title}»?`)) return;
        startTransition(async () => {
            const res = await deletePost(id);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Удалён' });
                router.refresh();
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    const handleDuplicate = (id: string) => {
        startTransition(async () => {
            const res = await duplicatePost(id);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Скопирован' });
                router.push(`/admin/blog/${res.slug}`);
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    return (
        <Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell width={60}>Обложка</TableCell>
                            <TableCell>Заголовок</TableCell>
                            <TableCell width={140}>Автор</TableCell>
                            <TableCell width={200}>Хэштеги</TableCell>
                            <TableCell width={140}>Создан</TableCell>
                            <TableCell width={140} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {posts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary" py={4}>
                                        Постов пока нет
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {posts.map((p) => (
                            <TableRow key={p.id} hover>
                                <TableCell>
                                    <Avatar
                                        variant="rounded"
                                        src={p.cover ?? undefined}
                                        sx={{ width: 40, height: 40 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box
                                        component={Link}
                                        href={`/admin/blog/${p.slug}`}
                                        sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                    >
                                        {p.title}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {p.slug}
                                    </Typography>
                                </TableCell>
                                <TableCell>{p.author ?? '—'}</TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                        {p.hashtags.slice(0, 3).map((h) => (
                                            <Chip key={h} label={h} size="small" />
                                        ))}
                                        {p.hashtags.length > 3 && (
                                            <Chip label={`+${p.hashtags.length - 3}`} size="small" variant="outlined" />
                                        )}
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    {new Date(p.created_at).toLocaleDateString('ru-RU')}
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <IconButton
                                            size="small"
                                            component={Link}
                                            href={`/admin/blog/${p.slug}`}
                                            title="Редактировать"
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            disabled={pending}
                                            onClick={() => handleDuplicate(p.id)}
                                            title="Дублировать"
                                        >
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            disabled={pending}
                                            onClick={() => handleDelete(p.id, p.title)}
                                            title="Удалить"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
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

### Task 4: Blog list actions

- [ ] **Step 1: `src/app/admin/(authed)/blog/list-actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';

export type ActionResult<T = unknown> =
    | ({ ok: true } & T)
    | { ok: false; error: string };

export async function deletePost(id: string): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: post } = await admin.from('blog_posts').select('slug').eq('id', id).maybeSingle();

    const { error } = await admin.from('blog_posts').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };

    revalidatePath('/admin/blog');
    revalidatePath('/blog');
    if (post?.slug) revalidatePath(`/blog/${post.slug}`);
    return { ok: true };
}

export async function duplicatePost(id: string): Promise<ActionResult<{ slug: string }>> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: source, error: srcErr } = await admin
        .from('blog_posts').select('*').eq('id', id).maybeSingle();
    if (srcErr || !source) return { ok: false, error: srcErr?.message ?? 'Пост не найден' };

    let candidate = `${source.slug}-copy`;
    let n = 1;
    while (true) {
        const { data: hit } = await admin.from('blog_posts').select('id').eq('slug', candidate).maybeSingle();
        if (!hit) break;
        n += 1;
        candidate = `${source.slug}-copy-${n}`;
        if (n > 50) return { ok: false, error: 'Не удалось подобрать уникальный slug' };
    }

    const { id: _id, post_id: _pid, created_at: _ca, slug: _slug, ...postFields } = source;
    const { data: created, error: insErr } = await admin
        .from('blog_posts')
        .insert({ ...postFields, slug: candidate, title: `${source.title} (копия)` })
        .select('slug')
        .single();
    if (insErr || !created) return { ok: false, error: insErr?.message ?? 'Ошибка создания' };

    revalidatePath('/admin/blog');
    return { ok: true, slug: created.slug };
}
```

- [ ] **Step 2: Build + commit (Tasks 3 + 4 вместе)**

```bash
npx tsc --noEmit
npm run build 2>&1 | grep "/admin/blog"
git add 'src/app/admin/(authed)/blog'
git commit -m "feat(admin): blog list page + delete/duplicate actions

Server component тянет посты через createAdminClient, рендерит MUI Table
с обложкой / заголовком / автором / хэштегами / датой и actions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase C — Blog form + Tiptap

### Task 5: Tiptap editor component

- [ ] **Step 1: `src/app/admin/(authed)/blog/TiptapEditor.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Box, ToggleButton, ToggleButtonGroup, Stack, Divider } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { uploadImage } from '../../_lib/upload-image';

interface TiptapEditorProps {
    value: string;
    onChange: (html: string) => void;
    /** slug используется для path в bucket */
    slug: string;
}

export function TiptapEditor({ value, onChange, slug }: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] } }),
            Link.configure({ openOnClick: false, autolink: true }),
            Image,
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync external value changes (e.g. form reset)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    if (!editor) return null;

    const addLink = () => {
        const url = window.prompt('URL ссылки:');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().setLink({ href: url }).run();
    };

    const addImage = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const uniq = crypto.randomUUID();
                const res = await uploadImage({
                    bucket: 'blog-images',
                    path: `${slug}/inline/${uniq}`,
                    file,
                });
                editor.chain().focus().setImage({ src: res.url }).run();
            } catch (e) {
                alert(e instanceof Error ? e.message : 'Ошибка загрузки');
            }
        };
        input.click();
    };

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Stack
                direction="row"
                spacing={1}
                sx={{ p: 1, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}
            >
                <ToggleButtonGroup size="small">
                    <ToggleButton
                        value="bold"
                        selected={editor.isActive('bold')}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                        <FormatBoldIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="italic"
                        selected={editor.isActive('italic')}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    >
                        <FormatItalicIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="strike"
                        selected={editor.isActive('strike')}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                    >
                        <StrikethroughSIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                <ToggleButtonGroup size="small">
                    <ToggleButton
                        value="h2"
                        selected={editor.isActive('heading', { level: 2 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    >
                        <LooksTwoIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="h3"
                        selected={editor.isActive('heading', { level: 3 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    >
                        <Looks3Icon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                <ToggleButtonGroup size="small">
                    <ToggleButton
                        value="bullet"
                        selected={editor.isActive('bulletList')}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                    >
                        <FormatListBulletedIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="ordered"
                        selected={editor.isActive('orderedList')}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    >
                        <FormatListNumberedIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="quote"
                        selected={editor.isActive('blockquote')}
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    >
                        <FormatQuoteIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                <ToggleButtonGroup size="small">
                    <ToggleButton value="link" selected={editor.isActive('link')} onClick={addLink}>
                        <LinkIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="image" onClick={addImage}>
                        <ImageIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                <ToggleButtonGroup size="small">
                    <ToggleButton value="undo" onClick={() => editor.chain().focus().undo().run()}>
                        <UndoIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="redo" onClick={() => editor.chain().focus().redo().run()}>
                        <RedoIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            <Box
                sx={{
                    p: 2,
                    minHeight: 300,
                    '& .ProseMirror': { outline: 'none', minHeight: 280 },
                    '& .ProseMirror img': { maxWidth: '100%', height: 'auto' },
                    '& .ProseMirror p.is-editor-empty:first-child::before': {
                        content: '"Начни писать..."',
                        color: 'text.disabled',
                        float: 'left',
                        height: 0,
                        pointerEvents: 'none',
                    },
                }}
            >
                <EditorContent editor={editor} />
            </Box>
        </Box>
    );
}
```

### Task 6: BlogForm + save action

- [ ] **Step 1: `src/app/admin/(authed)/blog/save-action.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { blogPostSchema, type BlogPostInput } from '../../_lib/blog-schemas';
import { sanitizeBlogHtml } from '../../_lib/sanitize-html';

export type SaveResult =
    | { ok: true; slug: string }
    | { ok: false; error: string };

export async function savePost(input: BlogPostInput): Promise<SaveResult> {
    await requireAdmin();

    const parsed = blogPostSchema.safeParse(input);
    if (!parsed.success) {
        const first = parsed.error.errors[0];
        return { ok: false, error: `${first.path.join('.')}: ${first.message}` };
    }
    const data = parsed.data;
    const { id, ...fields } = data;

    // sanitize body_html на сервере — никогда не доверяем клиентскому Tiptap output
    fields.body_html = sanitizeBlogHtml(fields.body_html);

    const admin = createAdminClient();

    if (id) {
        const { error } = await admin.from('blog_posts').update(fields).eq('id', id);
        if (error) return { ok: false, error: error.message };
    } else {
        const { data: dup } = await admin.from('blog_posts').select('id').eq('slug', fields.slug).maybeSingle();
        if (dup) return { ok: false, error: 'Пост с таким slug уже существует' };

        const { error } = await admin.from('blog_posts').insert(fields);
        if (error) return { ok: false, error: error.message };
    }

    revalidatePath('/admin/blog');
    revalidatePath('/blog');
    revalidatePath(`/blog/${fields.slug}`);

    return { ok: true, slug: fields.slug };
}
```

- [ ] **Step 2: `src/app/admin/(authed)/blog/BlogForm.tsx`**

```tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Box, Grid, TextField, Button, Stack, Snackbar, Alert, Typography, Chip,
} from '@mui/material';
import { blogPostSchema, type BlogPostInput } from '../../_lib/blog-schemas';
import { savePost } from './save-action';
import { TiptapEditor } from './TiptapEditor';
import { ImageDrop } from '../../_components/ImageDrop';

const EMPTY: BlogPostInput = {
    slug: '',
    title: '',
    subtitle: null,
    cover: null,
    author: 'PNHD STUDIO',
    hashtags: [],
    body_html: '',
};

export function BlogForm({ initial }: { initial: Partial<BlogPostInput> | null }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);
    const [hashtagInput, setHashtagInput] = useState('');

    const methods = useForm<BlogPostInput>({
        resolver: zodResolver(blogPostSchema),
        defaultValues: { ...EMPTY, ...initial },
        mode: 'onBlur',
    });

    const isEdit = !!initial?.id;
    const slug = methods.watch('slug');
    const hashtags = methods.watch('hashtags');

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
            const res = await savePost(values);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Сохранено' });
                if (!isEdit) router.push(`/admin/blog/${res.slug}`);
                else methods.reset(values);
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    });

    const addHashtag = (raw: string) => {
        const tag = raw.trim().replace(/^#/, '').toLowerCase();
        if (!tag) return;
        if (hashtags.includes(tag)) return;
        methods.setValue('hashtags', [...hashtags, tag], { shouldDirty: true });
        setHashtagInput('');
    };

    const removeHashtag = (tag: string) => {
        methods.setValue('hashtags', hashtags.filter((t) => t !== tag), { shouldDirty: true });
    };

    return (
        <FormProvider {...methods}>
            <Box component="form" onSubmit={onSubmit}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4">
                        {isEdit ? methods.getValues('title') || 'Без заголовка' : 'Новый пост'}
                    </Typography>
                    <Button type="submit" variant="contained" disabled={pending} size="large">
                        {pending ? 'Сохранение…' : 'Сохранить'}
                    </Button>
                </Stack>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Stack spacing={2}>
                            <TextField
                                {...methods.register('slug')}
                                label="Slug"
                                fullWidth
                                disabled={isEdit}
                                error={!!methods.formState.errors.slug}
                                helperText={methods.formState.errors.slug?.message ?? 'Латиница/цифры/дефис'}
                            />
                            <TextField
                                {...methods.register('title')}
                                label="Заголовок"
                                fullWidth
                                error={!!methods.formState.errors.title}
                                helperText={methods.formState.errors.title?.message}
                            />
                            <TextField
                                {...methods.register('subtitle')}
                                label="Подзаголовок"
                                fullWidth
                            />
                            <TextField
                                {...methods.register('author')}
                                label="Автор"
                                fullWidth
                            />

                            <Box>
                                <TextField
                                    label="Хэштеги"
                                    placeholder="Введи и Enter"
                                    fullWidth
                                    value={hashtagInput}
                                    onChange={(e) => setHashtagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            addHashtag(hashtagInput);
                                        }
                                    }}
                                />
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={1} gap={1}>
                                    {hashtags.map((t) => (
                                        <Chip
                                            key={t}
                                            label={`#${t}`}
                                            size="small"
                                            onDelete={() => removeHashtag(t)}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="overline" color="text.secondary" display="block" mb={1}>
                            Обложка
                        </Typography>
                        {slug ? (
                            <Controller
                                name="cover"
                                control={methods.control}
                                render={({ field }) => (
                                    <ImageDrop
                                        value={field.value}
                                        onChange={field.onChange}
                                        bucket="blog-images"
                                        pathPrefix={`${slug}/cover`}
                                        aspect="3 / 4"
                                    />
                                )}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Заполни slug чтобы залить обложку
                            </Typography>
                        )}
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Typography variant="overline" color="text.secondary" display="block" mb={1}>
                            Текст поста
                        </Typography>
                        {slug ? (
                            <Controller
                                name="body_html"
                                control={methods.control}
                                render={({ field }) => (
                                    <TiptapEditor
                                        value={field.value}
                                        onChange={field.onChange}
                                        slug={slug}
                                    />
                                )}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Заполни slug чтобы начать писать
                            </Typography>
                        )}
                    </Grid>
                </Grid>

                <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
                    {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
                </Snackbar>
            </Box>
        </FormProvider>
    );
}
```

### Task 7: Blog new + [slug] pages + revalidate /blog/[post]

- [ ] **Step 1: `src/app/admin/(authed)/blog/new/page.tsx`**

```tsx
import { BlogForm } from '../BlogForm';
export const metadata = { title: 'Новый пост' };
export default function NewPostPage() {
    return <BlogForm initial={null} />;
}
```

- [ ] **Step 2: `src/app/admin/(authed)/blog/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../../_lib/require-admin';
import { BlogForm } from '../BlogForm';
import type { BlogPostInput } from '../../../_lib/blog-schemas';

export const dynamic = 'force-dynamic';

async function loadPost(slug: string): Promise<BlogPostInput | null> {
    await requireAdmin();
    const admin = createAdminClient();
    const { data } = await admin
        .from('blog_posts')
        .select('id, slug, title, subtitle, cover, author, hashtags, body_html')
        .eq('slug', slug)
        .maybeSingle();
    return data ?? null;
}

export default async function EditPostPage({ params }: { params: { slug: string } }) {
    const post = await loadPost(params.slug);
    if (!post) notFound();
    return <BlogForm initial={post} />;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    return { title: params.slug };
}
```

- [ ] **Step 3: Снять `dynamicParams: false` на публичном `/blog/[post]`**

Найти существующий файл:
```bash
grep -rn "dynamicParams" src/app/blog/
```

Если файл `src/app/blog/[post]/page.tsx` (или похожий) содержит `export const dynamicParams = false;` — заменить на `export const dynamicParams = true;` или удалить строку.

- [ ] **Step 4: Build + commit (Tasks 5-7 вместе)**

```bash
npx tsc --noEmit
npm run build 2>&1 | grep -E "/admin/blog|/blog"
git add 'src/app/admin/(authed)/blog' 'src/app/blog'
git commit -m "feat(admin): blog form + Tiptap editor + new/[slug] pages

- TiptapEditor.tsx: WYSIWYG (B/I/S/H2/H3/lists/link/image/undo/redo)
  с inline-uploads картинок в blog-images bucket.
- BlogForm.tsx: react-hook-form + zodResolver, slug/title/subtitle/
  author/hashtags + cover (ImageDrop) + body_html (Tiptap).
- savePost server action прогоняет body_html через DOMPurify перед
  записью (whitelist tags + attrs).
- Снят dynamicParams:false на /blog/[post] — теперь новые посты
  появляются на публичном сайте после revalidatePath без redeploy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase D — Gallery

### Task 8: Gallery page + actions

- [ ] **Step 1: `src/app/admin/(authed)/gallery/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { uploadImage } from '../../_lib/upload-image';

export type ActionResult<T = unknown> =
    | ({ ok: true } & T)
    | { ok: false; error: string };

export interface GalleryItem {
    id: string;
    src: string;
    alt: string | null;
    sort_order: number;
}

export async function uploadGalleryItem(formData: FormData): Promise<ActionResult<{ item: GalleryItem }>> {
    await requireAdmin();
    const file = formData.get('file');
    if (!(file instanceof File)) return { ok: false, error: 'Файл не передан' };

    try {
        const uniq = crypto.randomUUID();
        const upload = await uploadImage({ bucket: 'gallery-images', path: uniq, file });

        const admin = createAdminClient();
        const { data: maxRow } = await admin
            .from('gallery_images').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
        const nextOrder = (maxRow?.sort_order ?? -1) + 1;

        const { data, error } = await admin
            .from('gallery_images')
            .insert({ src: upload.url, alt: '', sort_order: nextOrder })
            .select('id, src, alt, sort_order')
            .single();
        if (error || !data) return { ok: false, error: error?.message ?? 'Ошибка insert' };

        revalidatePath('/admin/gallery');
        return { ok: true, item: data };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Ошибка загрузки' };
    }
}

export async function updateGalleryItemAlt(id: string, alt: string): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from('gallery_images').update({ alt }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/gallery');
    return { ok: true };
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: row } = await admin.from('gallery_images').select('src').eq('id', id).maybeSingle();
    const { error } = await admin.from('gallery_images').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };

    // Очистка из Storage (best-effort). src вида `https://<proj>.supabase.co/storage/v1/object/public/gallery-images/<path>`
    if (row?.src) {
        const m = row.src.match(/\/gallery-images\/(.+)$/);
        if (m?.[1]) {
            await admin.storage.from('gallery-images').remove([m[1]]).catch(() => {});
        }
    }

    revalidatePath('/admin/gallery');
    return { ok: true };
}

export async function reorderGallery(orderedIds: string[]): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();

    // Bulk-update в цикле (gallery'и обычно мало — десятки). Если вырастет — заменить на rpc.
    for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await admin.from('gallery_images').update({ sort_order: i }).eq('id', orderedIds[i]);
        if (error) return { ok: false, error: error.message };
    }
    revalidatePath('/admin/gallery');
    return { ok: true };
}
```

- [ ] **Step 2: `src/app/admin/(authed)/gallery/GalleryGrid.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Grid, IconButton, Button, CircularProgress, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
    uploadGalleryItem, updateGalleryItemAlt, deleteGalleryItem, reorderGallery,
    type GalleryItem,
} from './actions';

export function GalleryGrid({ initial }: { initial: GalleryItem[] }) {
    const router = useRouter();
    const [items, setItems] = useState(initial);
    const [pending, startTransition] = useTransition();
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [editing, setEditing] = useState<GalleryItem | null>(null);
    const [editAlt, setEditAlt] = useState('');
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const handleFiles = (files: FileList) => {
        startTransition(async () => {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await uploadGalleryItem(formData);
                if (res.ok) {
                    setItems((prev) => [...prev, res.item]);
                } else {
                    setToast({ severity: 'error', msg: res.error });
                    return;
                }
            }
            setToast({ severity: 'success', msg: 'Загружено' });
        });
    };

    const openEdit = (item: GalleryItem) => {
        setEditing(item);
        setEditAlt(item.alt ?? '');
    };

    const saveEdit = () => {
        if (!editing) return;
        startTransition(async () => {
            const res = await updateGalleryItemAlt(editing.id, editAlt);
            if (res.ok) {
                setItems((prev) => prev.map((i) => i.id === editing.id ? { ...i, alt: editAlt } : i));
                setEditing(null);
                setToast({ severity: 'success', msg: 'Обновлено' });
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    const handleDelete = (item: GalleryItem) => {
        if (!confirm('Удалить картинку?')) return;
        startTransition(async () => {
            const res = await deleteGalleryItem(item.id);
            if (res.ok) {
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                setToast({ severity: 'success', msg: 'Удалено' });
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    const onDragStart = (idx: number) => setDragIdx(idx);
    const onDragOver = (e: React.DragEvent) => e.preventDefault();
    const onDrop = (targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx) {
            setDragIdx(null);
            return;
        }
        const next = [...items];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(targetIdx, 0, moved);
        const reordered = next.map((item, i) => ({ ...item, sort_order: i }));
        setItems(reordered);
        setDragIdx(null);
        startTransition(async () => {
            await reorderGallery(reordered.map((i) => i.id));
        });
    };

    return (
        <Box>
            <Typography variant="h4" mb={3}>Принты ({items.length})</Typography>

            <Box
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null) return;
                    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
                }}
                sx={{
                    border: '2px dashed', borderColor: 'divider', borderRadius: 1,
                    p: 3, mb: 3, textAlign: 'center', bgcolor: 'background.default',
                }}
            >
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Перетащи файлы сюда или выбери (поддерживается множественный выбор)
                </Typography>
                <Button component="label" variant="outlined" disabled={pending}>
                    {pending ? <CircularProgress size={20} /> : 'Выбрать файлы'}
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
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
                {items.map((item, idx) => (
                    <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                        <Box
                            draggable
                            onDragStart={() => onDragStart(idx)}
                            onDragOver={onDragOver}
                            onDrop={() => onDrop(idx)}
                            sx={{
                                position: 'relative',
                                aspectRatio: '1 / 1',
                                border: '1px solid', borderColor: 'divider',
                                borderRadius: 1, overflow: 'hidden',
                                cursor: 'move',
                                opacity: dragIdx === idx ? 0.3 : 1,
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.src} alt={item.alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <Box sx={{
                                position: 'absolute', top: 4, right: 4,
                                display: 'flex', gap: 0.5,
                            }}>
                                <IconButton size="small" onClick={() => openEdit(item)} sx={{ bgcolor: 'background.paper' }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleDelete(item)} sx={{ bgcolor: 'background.paper' }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {items.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    Принтов пока нет
                </Typography>
            )}

            <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Описание (alt)</DialogTitle>
                <DialogContent>
                    <TextField
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        fullWidth
                        autoFocus
                        margin="dense"
                        placeholder="Описание для поисковика и accessibility"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditing(null)}>Отмена</Button>
                    <Button onClick={saveEdit} variant="contained" disabled={pending}>
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
                {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
}
```

- [ ] **Step 3: `src/app/admin/(authed)/gallery/page.tsx`**

```tsx
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { GalleryGrid } from './GalleryGrid';
import type { GalleryItem } from './actions';

export const metadata = { title: 'Принты' };
export const dynamic = 'force-dynamic';

async function loadGallery(): Promise<GalleryItem[]> {
    await requireAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('gallery_images')
        .select('id, src, alt, sort_order')
        .order('sort_order', { ascending: true });
    if (error) {
        console.error('[admin/gallery] load error:', error);
        return [];
    }
    return data ?? [];
}

export default async function GalleryPage() {
    const items = await loadGallery();
    return <GalleryGrid initial={items} />;
}
```

- [ ] **Step 4: Build + commit**

```bash
npx tsc --noEmit
npm run build 2>&1 | grep "/admin/gallery"
git add 'src/app/admin/(authed)/gallery'
git commit -m "feat(admin): gallery module — drop-zone + drag-reorder + alt-edit dialog

Один экран /admin/gallery: drop-zone сверху, сетка thumbnails ниже,
drag prim для reorder с bulk-update sort_order, dialog для edit alt,
delete с очисткой Storage best-effort.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase E — Leads

### Task 9: Leads page + status actions

- [ ] **Step 1: `src/app/admin/(authed)/leads/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';

export type LeadStatus = 'new' | 'contacted' | 'done' | 'spam';

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from('leads').update({ status }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/leads');
    return { ok: true };
}
```

- [ ] **Step 2: `src/app/admin/(authed)/leads/LeadsTable.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Stack, Snackbar, Alert, Chip, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
    ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { updateLeadStatus, type LeadStatus } from './actions';

export interface LeadRow {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    status: LeadStatus;
    created_at: string;
    source: string | null;
}

const STATUS_COLOR: Record<LeadStatus, 'default' | 'primary' | 'success' | 'error'> = {
    new: 'primary',
    contacted: 'default',
    done: 'success',
    spam: 'error',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
    new: 'Новая',
    contacted: 'Связались',
    done: 'Готово',
    spam: 'Спам',
};

const NEXT_ACTIONS: Array<{ from: LeadStatus[]; to: LeadStatus; label: string }> = [
    { from: ['new'],                       to: 'contacted', label: '→ Связались' },
    { from: ['new', 'contacted'],          to: 'done',      label: '→ Готово' },
    { from: ['new', 'contacted'],          to: 'spam',      label: '→ Спам' },
];

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter);

    const handleStatus = (id: string, status: LeadStatus) => {
        startTransition(async () => {
            const res = await updateLeadStatus(id, status);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Статус обновлён' });
                router.refresh();
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h4">Заявки ({filtered.length})</Typography>
                <ToggleButtonGroup
                    value={filter}
                    exclusive
                    size="small"
                    onChange={(_, v) => v && setFilter(v)}
                >
                    <ToggleButton value="all">Все</ToggleButton>
                    <ToggleButton value="new">Новые</ToggleButton>
                    <ToggleButton value="contacted">В работе</ToggleButton>
                    <ToggleButton value="done">Готовые</ToggleButton>
                    <ToggleButton value="spam">Спам</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell width={110}>Статус</TableCell>
                            <TableCell>Имя</TableCell>
                            <TableCell width={160}>Телефон</TableCell>
                            <TableCell width={220}>Email</TableCell>
                            <TableCell width={110}>Источник</TableCell>
                            <TableCell width={130}>Создано</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="body2" color="text.secondary" py={4}>
                                        Заявок не найдено
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.map((l) => (
                            <TableRow key={l.id} hover>
                                <TableCell>
                                    <Chip
                                        label={STATUS_LABEL[l.status]}
                                        color={STATUS_COLOR[l.status]}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{l.name ?? '—'}</TableCell>
                                <TableCell>
                                    {l.phone ? (
                                        <Box component="a" href={`tel:${l.phone}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                            {l.phone}
                                        </Box>
                                    ) : '—'}
                                </TableCell>
                                <TableCell>
                                    {l.email ? (
                                        <Box component="a" href={`mailto:${l.email}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                            {l.email}
                                        </Box>
                                    ) : '—'}
                                </TableCell>
                                <TableCell>{l.source ?? '—'}</TableCell>
                                <TableCell>
                                    {new Date(l.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        {NEXT_ACTIONS.filter((a) => a.from.includes(l.status)).map((a) => (
                                            <Button
                                                key={a.to}
                                                size="small"
                                                variant="outlined"
                                                disabled={pending}
                                                onClick={() => handleStatus(l.id, a.to)}
                                            >
                                                {a.label}
                                            </Button>
                                        ))}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
                {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
}
```

- [ ] **Step 3: `src/app/admin/(authed)/leads/page.tsx`**

```tsx
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { LeadsTable, type LeadRow } from './LeadsTable';

export const metadata = { title: 'Заявки' };
export const dynamic = 'force-dynamic';

async function loadLeads(): Promise<LeadRow[]> {
    await requireAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('leads')
        .select('id, name, phone, email, status, created_at, source')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('[admin/leads] load error:', error);
        return [];
    }
    return (data ?? []) as LeadRow[];
}

export default async function LeadsPage() {
    const leads = await loadLeads();
    return <LeadsTable leads={leads} />;
}
```

- [ ] **Step 4: Build + commit**

```bash
npx tsc --noEmit
npm run build 2>&1 | grep "/admin/leads"
git add 'src/app/admin/(authed)/leads'
git commit -m "feat(admin): leads module — read + status workflow

Список заявок с фильтром по статусу, chip-индикатором, контекстными
кнопками перехода (new → contacted → done/spam). Tel/mailto-ссылки
на phone/email. RLS уже разрешает admin select+update на leads
(миграция 6), здесь только UI.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase F — Smoke test

### Task 10: End-to-end smoke

Ручной чек-лист.

- [ ] **Blog**
  - `/admin/blog` показывает 3 поста
  - `+ Новый` → форма → заполни slug `test-post` → залить cover → ввести title + текст в Tiptap → Сохранить → редирект на edit
  - Проверь `/blog` (публичный) — пост `test-post` появился
  - Проверь `/blog/test-post` — открывается с правильным content
  - Удалить → пост исчез с обеих сторон

- [ ] **Gallery**
  - `/admin/gallery` показывает 6 принтов
  - Залить новый файл — появился в сетке
  - Drag-reorder — порядок сохранился после refresh
  - Edit alt → сохранилось
  - Удалить → исчезло

- [ ] **Leads**
  - `/admin/leads` показывает пустоту (или существующие заявки)
  - Создай тестовую заявку через публичную форму (контакты на главной), вернись в админку — она появилась со статусом «Новая»
  - Прожми → Связались → Готово — chip обновляется

- [ ] **Что не сломалось**
  - `/admin` dashboard счётчики верные
  - `/admin/products` список работает
  - Публичный сайт `/`, `/shop`, `/blog` всё ещё рендерится

---

## Definition of done

✅ /admin/blog CRUD работает, body_html sanitize'ится через DOMPurify
✅ /admin/gallery drop-zone + drag-reorder + alt-dialog работают
✅ /admin/leads показывает заявки + статус-workflow
✅ /blog/[post] больше не имеет dynamicParams:false — новые посты появляются без redeploy
✅ Build чист, публичный сайт работает
✅ Все коммиты на feat/admin-foundation

После этого — финальный PR в `main` через `superpowers:finishing-a-development-branch`.
