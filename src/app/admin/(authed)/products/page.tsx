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
