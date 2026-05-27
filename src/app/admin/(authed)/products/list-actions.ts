'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';

export type ActionResult<T = unknown> =
    | ({ ok: true } & T)
    | { ok: false; error: string };

export async function deleteProduct(id: string): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();

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

    const { data: source, error: srcErr } = await admin
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (srcErr || !source) return { ok: false, error: srcErr?.message ?? 'Товар не найден' };

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

    const { data: sizes } = await admin
        .from('product_sizes').select('name, qty, sort_order').eq('product_id', id);
    if (sizes?.length) {
        await admin.from('product_sizes').insert(sizes.map((s) => ({ ...s, product_id: created.id })));
    }

    const { data: photos } = await admin
        .from('product_gallery_photos').select('url, sort_order').eq('product_id', id);
    if (photos?.length) {
        await admin.from('product_gallery_photos').insert(photos.map((p) => ({ ...p, product_id: created.id })));
    }

    revalidatePath('/admin/products');
    return { ok: true, slug: created.slug };
}
