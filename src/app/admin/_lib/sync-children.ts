import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ChildRow {
    id?: string;
    [key: string]: unknown;
}

export async function syncChildren<T extends ChildRow>(
    admin: SupabaseClient,
    table: 'product_sizes' | 'product_gallery_photos',
    productId: string,
    desired: T[]
): Promise<void> {
    const { data: existing, error: readErr } = await admin
        .from(table)
        .select('id')
        .eq('product_id', productId);
    if (readErr) throw readErr;

    const existingIds = new Set((existing ?? []).map((r) => r.id as string));
    const desiredIds  = new Set(desired.filter((r) => r.id).map((r) => r.id as string));

    const toDelete = Array.from(existingIds).filter((id) => !desiredIds.has(id));
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
