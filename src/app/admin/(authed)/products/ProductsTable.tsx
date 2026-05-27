'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, IconButton, Avatar, Stack, Snackbar, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography,
} from '@mui/material';
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
    studio: 'Студия',
    supplier: 'Поставщик',
    in_stock: 'В наличии',
    limited: 'Ограниченно',
    out_of_stock: 'Нет в наличии',
};

export function ProductsTable({ products }: { products: ProductRow[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const handleDuplicate = (id: string) => {
        startTransition(async () => {
            const res = await duplicateProduct(id);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Скопирован' });
                router.push(`/admin/products/${res.slug}`);
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`Удалить «${name}»?`)) return;
        startTransition(async () => {
            const res = await deleteProduct(id);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Удалён' });
                router.refresh();
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    return (
        <Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell width={60}>Фото</TableCell>
                            <TableCell>Название</TableCell>
                            <TableCell width={140}>Тип</TableCell>
                            <TableCell width={120} align="right">Цена ₽</TableCell>
                            <TableCell width={140}>Наличие</TableCell>
                            <TableCell width={140} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary" py={4}>
                                        Товаров пока нет
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {products.map((p) => (
                            <TableRow key={p.id} hover>
                                <TableCell>
                                    <Avatar
                                        variant="rounded"
                                        src={p.image_url ?? undefined}
                                        sx={{ width: 40, height: 40 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box
                                        component="a"
                                        sx={{ cursor: 'pointer', color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                        onClick={() => router.push(`/admin/products/${p.slug}`)}
                                    >
                                        {p.name}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {p.slug}
                                    </Typography>
                                </TableCell>
                                <TableCell>{TYPE_LABEL[p.type] ?? p.type}</TableCell>
                                <TableCell align="right">{p.price.toLocaleString('ru-RU')}</TableCell>
                                <TableCell>{p.stock ? STOCK_LABEL[p.stock] ?? p.stock : '—'}</TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <IconButton
                                            size="small"
                                            onClick={() => router.push(`/admin/products/${p.slug}`)}
                                            title="Редактировать"
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            disabled={pending}
                                            onClick={() => handleDuplicate(p.id)}
                                            title="Дублировать"
                                        >
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            disabled={pending}
                                            onClick={() => handleDelete(p.id, p.name)}
                                            title="Удалить"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
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
