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
