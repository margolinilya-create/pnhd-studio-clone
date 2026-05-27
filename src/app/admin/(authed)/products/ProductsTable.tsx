'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Avatar, Stack, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteProduct, duplicateProduct } from './list-actions';

export interface ProductRow {
    id: string;
    slug: string;
    name: string;
    type: string;
    price: number;
    stock: string | null;
    image_url: string | null;
    created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
    tshirt: 'Футболка',
    hoodie: 'Худи',
    longsleeve: 'Лонгслив',
    sweatshirt: 'Свитшот',
    cap: 'Кепка',
    shopper: 'Шоппер',
};

const STOCK_LABEL: Record<string, string> = {
    in_stock: 'В наличии',
    limited: 'Ограниченно',
    out_of_stock: 'Нет в наличии',
};

export function ProductsTable({ products }: { products: ProductRow[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const columns: GridColDef<ProductRow>[] = useMemo(() => [
        {
            field: 'image_url',
            headerName: 'Фото',
            width: 70,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams<ProductRow>) => (
                <Avatar
                    variant="rounded"
                    src={params.value as string | undefined}
                    sx={{ width: 40, height: 40 }}
                />
            ),
        },
        { field: 'name', headerName: 'Название', flex: 1, minWidth: 200 },
        {
            field: 'type',
            headerName: 'Тип',
            width: 140,
            valueFormatter: (v: string) => TYPE_LABEL[v] ?? v,
        },
        {
            field: 'price',
            headerName: 'Цена ₽',
            width: 110,
            type: 'number',
            valueFormatter: (v: number) => v?.toLocaleString('ru-RU'),
        },
        {
            field: 'stock',
            headerName: 'Наличие',
            width: 140,
            valueFormatter: (v: string | null) => (v ? STOCK_LABEL[v] ?? v : '—'),
        },
        {
            field: 'actions',
            headerName: '',
            width: 140,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams<ProductRow>) => (
                <Stack direction="row" spacing={0.5}>
                    <IconButton
                        size="small"
                        onClick={() => router.push(`/admin/products/${params.row.slug}`)}
                        title="Редактировать"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={pending}
                        onClick={() => {
                            startTransition(async () => {
                                const res = await duplicateProduct(params.row.id);
                                if (res.ok) {
                                    setToast({ severity: 'success', msg: 'Скопирован' });
                                    router.push(`/admin/products/${res.slug}`);
                                } else {
                                    setToast({ severity: 'error', msg: res.error });
                                }
                            });
                        }}
                        title="Дублировать"
                    >
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={pending}
                        onClick={() => {
                            if (!confirm(`Удалить «${params.row.name}»?`)) return;
                            startTransition(async () => {
                                const res = await deleteProduct(params.row.id);
                                if (res.ok) {
                                    setToast({ severity: 'success', msg: 'Удалён' });
                                    router.refresh();
                                } else {
                                    setToast({ severity: 'error', msg: res.error });
                                }
                            });
                        }}
                        title="Удалить"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ),
        },
    ], [router, pending]);

    return (
        <Box sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
            <DataGrid
                rows={products}
                columns={columns}
                getRowId={(r) => r.id}
                pageSizeOptions={[25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
                disableRowSelectionOnClick
            />
            <Snackbar
                open={!!toast}
                autoHideDuration={3000}
                onClose={() => setToast(null)}
            >
                {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
}
