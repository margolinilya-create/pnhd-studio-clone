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
