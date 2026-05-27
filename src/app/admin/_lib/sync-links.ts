import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function syncLinks(
    admin: SupabaseClient,
    productId: string,
    linkedIds: string[]
): Promise<void> {
    const { error: delErr } = await admin
        .from('product_links')
        .delete()
        .eq('product_id', productId);
    if (delErr) throw delErr;

    if (linkedIds.length === 0) return;

    const rows = Array.from(new Set(linkedIds))
        .filter((id) => id !== productId)
        .map((id) => ({ product_id: productId, linked_product_id: id }));

    if (rows.length === 0) return;

    const { error: insErr } = await admin.from('product_links').insert(rows);
    if (insErr) throw insErr;
}
