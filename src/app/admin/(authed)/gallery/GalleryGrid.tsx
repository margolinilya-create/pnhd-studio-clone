'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Grid, IconButton, Button, CircularProgress, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
    uploadGalleryItem, updateGalleryItemAlt, deleteGalleryItem, reorderGallery,
    type GalleryItem,
} from './actions';

export function GalleryGrid({ initial }: { initial: GalleryItem[] }) {
    const router = useRouter();
    const [items, setItems] = useState(initial);
    const [pending, startTransition] = useTransition();
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [editing, setEditing] = useState<GalleryItem | null>(null);
    const [editAlt, setEditAlt] = useState('');
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const handleFiles = (files: FileList) => {
        startTransition(async () => {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await uploadGalleryItem(formData);
                if (res.ok) {
                    setItems((prev) => [...prev, res.item]);
                } else {
                    setToast({ severity: 'error', msg: res.error });
                    return;
                }
            }
            setToast({ severity: 'success', msg: 'Загружено' });
        });
    };

    const openEdit = (item: GalleryItem) => {
        setEditing(item);
        setEditAlt(item.alt ?? '');
    };

    const saveEdit = () => {
        if (!editing) return;
        startTransition(async () => {
            const res = await updateGalleryItemAlt(editing.id, editAlt);
            if (res.ok) {
                setItems((prev) => prev.map((i) => i.id === editing.id ? { ...i, alt: editAlt } : i));
                setEditing(null);
                setToast({ severity: 'success', msg: 'Обновлено' });
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    const handleDelete = (item: GalleryItem) => {
        if (!confirm('Удалить картинку?')) return;
        startTransition(async () => {
            const res = await deleteGalleryItem(item.id);
            if (res.ok) {
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                setToast({ severity: 'success', msg: 'Удалено' });
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    const onDragStart = (idx: number) => setDragIdx(idx);
    const onDragOver = (e: React.DragEvent) => e.preventDefault();
    const onDrop = (targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx) {
            setDragIdx(null);
            return;
        }
        const next = [...items];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(targetIdx, 0, moved);
        const reordered = next.map((item, i) => ({ ...item, sort_order: i }));
        setItems(reordered);
        setDragIdx(null);
        startTransition(async () => {
            await reorderGallery(reordered.map((i) => i.id));
        });
    };

    return (
        <Box>
            <Typography variant="h4" mb={3}>Принты ({items.length})</Typography>

            <Box
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null) return;
                    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
                }}
                sx={{
                    border: '2px dashed', borderColor: 'divider', borderRadius: 1,
                    p: 3, mb: 3, textAlign: 'center', bgcolor: 'background.default',
                }}
            >
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Перетащи файлы сюда или выбери (поддерживается множественный выбор)
                </Typography>
                <Button component="label" variant="outlined" disabled={pending}>
                    {pending ? <CircularProgress size={20} /> : 'Выбрать файлы'}
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        multiple
                        hidden
                        onChange={(e) => {
                            if (e.target.files?.length) handleFiles(e.target.files);
                            e.currentTarget.value = '';
                        }}
                    />
                </Button>
            </Box>

            <Grid container spacing={1}>
                {items.map((item, idx) => (
                    <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                        <Box
                            draggable
                            onDragStart={() => onDragStart(idx)}
                            onDragOver={onDragOver}
                            onDrop={() => onDrop(idx)}
                            sx={{
                                position: 'relative',
                                aspectRatio: '1 / 1',
                                border: '1px solid', borderColor: 'divider',
                                borderRadius: 1, overflow: 'hidden',
                                cursor: 'move',
                                opacity: dragIdx === idx ? 0.3 : 1,
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.src} alt={item.alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <Box sx={{
                                position: 'absolute', top: 4, right: 4,
                                display: 'flex', gap: 0.5,
                            }}>
                                <IconButton size="small" onClick={() => openEdit(item)} sx={{ bgcolor: 'background.paper' }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleDelete(item)} sx={{ bgcolor: 'background.paper' }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {items.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    Принтов пока нет
                </Typography>
            )}

            <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Описание (alt)</DialogTitle>
                <DialogContent>
                    <TextField
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        fullWidth
                        autoFocus
                        margin="dense"
                        placeholder="Описание для поисковика и accessibility"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditing(null)}>Отмена</Button>
                    <Button onClick={saveEdit} variant="contained" disabled={pending}>
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
                {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
}
