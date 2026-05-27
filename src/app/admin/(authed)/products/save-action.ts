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

    const { id, sizes, photos, linkedIds, ...productFields } = data;

    let productId: string;
    if (id) {
        const { error } = await admin.from('products')
            .update(productFields)
            .eq('id', id);
        if (error) return { ok: false, error: error.message };
        productId = id;
    } else {
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
