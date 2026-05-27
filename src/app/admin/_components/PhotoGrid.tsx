'use client';

import { useState, useTransition } from 'react';
import { Box, Grid, IconButton, Button, CircularProgress, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { uploadImage, type Bucket } from '../_lib/upload-image';

export interface GridPhoto {
    id?: string;
    url: string;
    sort_order: number;
}

interface PhotoGridProps {
    value: GridPhoto[];
    onChange: (next: GridPhoto[]) => void;
    bucket: Bucket;
    pathPrefix: string;
}

export function PhotoGrid({ value, onChange, bucket, pathPrefix }: PhotoGridProps) {
    const [pending, startTransition] = useTransition();
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const sorted = [...value].sort((a, b) => a.sort_order - b.sort_order);

    const handleFiles = (files: FileList) => {
        startTransition(async () => {
            const uploaded: GridPhoto[] = [];
            let nextOrder = sorted.length > 0
                ? Math.max(...sorted.map((p) => p.sort_order)) + 1
                : 0;

            for (const file of Array.from(files)) {
                const uniq = crypto.randomUUID();
                const res = await uploadImage({
                    bucket,
                    path: `${pathPrefix}/${uniq}`,
                    file,
                });
                uploaded.push({ url: res.url, sort_order: nextOrder++ });
            }
            onChange([...value, ...uploaded]);
        });
    };

    const remove = (idx: number) => {
        const next = [...sorted];
        next.splice(idx, 1);
        onChange(next.map((p, i) => ({ ...p, sort_order: i })));
    };

    const onDragStart = (idx: number) => setDragIdx(idx);
    const onDragOver = (e: React.DragEvent) => e.preventDefault();
    const onDrop = (targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); return; }
        const next = [...sorted];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(targetIdx, 0, moved);
        onChange(next.map((p, i) => ({ ...p, sort_order: i })));
        setDragIdx(null);
    };

    return (
        <Box>
            <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null) return;
                    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
                }}
                sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                    position: 'relative',
                }}
            >
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Перетащи файлы сюда или выбери
                </Typography>
                <Button component="label" variant="outlined" size="small" disabled={pending}>
                    {pending ? <CircularProgress size={16} /> : 'Выбрать файлы'}
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
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
                {sorted.map((photo, idx) => (
                    <Grid key={photo.url} size={{ xs: 6, sm: 4, md: 3 }}>
                        <Box
                            draggable
                            onDragStart={() => onDragStart(idx)}
                            onDragOver={onDragOver}
                            onDrop={() => onDrop(idx)}
                            sx={{
                                position: 'relative',
                                aspectRatio: '3 / 4',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                                cursor: 'move',
                                opacity: dragIdx === idx ? 0.3 : 1,
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <IconButton
                                size="small"
                                onClick={() => remove(idx)}
                                sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                            <Box sx={{
                                position: 'absolute', bottom: 4, left: 4,
                                bgcolor: 'background.paper', px: 0.5, borderRadius: 0.5,
                                fontSize: 11, color: 'text.secondary',
                            }}>
                                #{idx + 1}
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
