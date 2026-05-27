'use client';

import { useState, useTransition } from 'react';
import { Box, Button, CircularProgress, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { uploadImage, type Bucket } from '../_lib/upload-image';

interface ImageDropProps {
    value: string | null;
    onChange: (url: string | null) => void;
    bucket: Bucket;
    pathPrefix: string;
    label?: string;
    aspect?: '1 / 1' | '3 / 4' | '4 / 5';
    minHeight?: number;
}

export function ImageDrop({
    value, onChange, bucket, pathPrefix, label, aspect = '3 / 4', minHeight = 240,
}: ImageDropProps) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = (file: File) => {
        setError(null);
        startTransition(async () => {
            try {
                const res = await uploadImage({ bucket, path: pathPrefix, file });
                onChange(res.url);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Ошибка загрузки');
            }
        });
    };

    return (
        <Box>
            {label && (
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    {label}
                </Typography>
            )}
            <Box
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                }}
                sx={{
                    position: 'relative',
                    aspectRatio: aspect,
                    minHeight,
                    border: '2px dashed',
                    borderColor: dragOver ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: dragOver ? 'action.hover' : 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                {value && (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <IconButton
                            size="small"
                            onClick={() => onChange(null)}
                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </>
                )}
                {pending && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)' }}>
                        <CircularProgress />
                    </Box>
                )}
                {!value && !pending && (
                    <Box textAlign="center" p={2}>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                            Перетащи файл сюда
                        </Typography>
                        <Button component="label" variant="outlined" size="small">
                            Выбрать
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/avif"
                                hidden
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleFile(f);
                                }}
                            />
                        </Button>
                    </Box>
                )}
            </Box>
            {error && (
                <Typography variant="caption" color="error" display="block" mt={0.5}>
                    {error}
                </Typography>
            )}
        </Box>
    );
}
