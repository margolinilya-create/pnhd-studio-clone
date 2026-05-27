'use client';

import Link from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ProductsTable, type ProductRow } from './ProductsTable';

export function ProductsPageClient({ products }: { products: ProductRow[] }) {
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Товары ({products.length})</Typography>
                <Button component={Link} href="/admin/products/new" variant="contained">
                    + Новый
                </Button>
            </Stack>
            <ProductsTable products={products} />
        </Box>
    );
}
