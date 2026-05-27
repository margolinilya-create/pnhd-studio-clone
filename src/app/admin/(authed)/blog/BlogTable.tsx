'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Box, IconButton, Avatar, Stack, Snackbar, Alert, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { deletePost, duplicatePost } from './list-actions';
import type { BlogRow } from './page';

export function BlogTable({ posts }: { posts: BlogRow[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const handleDelete = (id: string, title: string) => {
        if (!confirm(`Удалить пост «${title}»?`)) return;
        startTransition(async () => {
            const res = await deletePost(id);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Удалён' });
                router.refresh();
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    const handleDuplicate = (id: string) => {
        startTransition(async () => {
            const res = await duplicatePost(id);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Скопирован' });
                router.push(`/admin/blog/${res.slug}`);
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
                            <TableCell width={60}>Обложка</TableCell>
                            <TableCell>Заголовок</TableCell>
                            <TableCell width={140}>Автор</TableCell>
                            <TableCell width={200}>Хэштеги</TableCell>
                            <TableCell width={140}>Создан</TableCell>
                            <TableCell width={140} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {posts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary" py={4}>
                                        Постов пока нет
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {posts.map((p) => (
                            <TableRow key={p.id} hover>
                                <TableCell>
                                    <Avatar
                                        variant="rounded"
                                        src={p.cover ?? undefined}
                                        sx={{ width: 40, height: 40 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box
                                        component={Link}
                                        href={`/admin/blog/${p.slug}`}
                                        sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                    >
                                        {p.title}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {p.slug}
                                    </Typography>
                                </TableCell>
                                <TableCell>{p.author ?? '—'}</TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                        {p.hashtags.slice(0, 3).map((h) => (
                                            <Chip key={h} label={h} size="small" />
                                        ))}
                                        {p.hashtags.length > 3 && (
                                            <Chip label={`+${p.hashtags.length - 3}`} size="small" variant="outlined" />
                                        )}
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    {new Date(p.created_at).toLocaleDateString('ru-RU')}
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <IconButton
                                            size="small"
                                            component={Link}
                                            href={`/admin/blog/${p.slug}`}
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
                                            onClick={() => handleDelete(p.id, p.title)}
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
