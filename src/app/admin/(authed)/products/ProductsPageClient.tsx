'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { ProductRow } from './ProductsTable';

const ProductsTable = dynamic(
    () => import('./ProductsTable').then((m) => m.ProductsTable),
    { ssr: false }
);

export function ProductsPageClient({ products }: { products: ProductRow[] }) {
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
