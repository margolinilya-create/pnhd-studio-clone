import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { ProductsPageClient } from './ProductsPageClient';
import type { ProductRow } from './ProductsTable';

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
    // Postgres numeric → JS string ("2000") при сериализации; для DataGrid type:'number' нужен number.
    return (data ?? []).map((r) => ({
        ...r,
        price: typeof r.price === 'string' ? Number(r.price) : r.price,
    }));
}

export default async function ProductsListPage() {
    const products = await loadProducts();
    return <ProductsPageClient products={products} />;
}
