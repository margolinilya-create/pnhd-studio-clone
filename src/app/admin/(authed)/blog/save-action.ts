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
