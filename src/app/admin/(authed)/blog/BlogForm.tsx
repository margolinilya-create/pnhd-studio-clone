'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Box, Grid, TextField, Button, Stack, Snackbar, Alert, Typography, Chip,
} from '@mui/material';
import { blogPostSchema, type BlogPostInput } from '../../_lib/blog-schemas';
import { savePost } from './save-action';
import { TiptapEditor } from './TiptapEditor';
import { ImageDrop } from '../../_components/ImageDrop';

const EMPTY: BlogPostInput = {
    slug: '',
    title: '',
    subtitle: null,
    cover: null,
    author: 'PNHD STUDIO',
    hashtags: [],
    body_html: '',
};

export function BlogForm({ initial }: { initial: Partial<BlogPostInput> | null }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);
    const [hashtagInput, setHashtagInput] = useState('');

    const methods = useForm<BlogPostInput>({
        resolver: zodResolver(blogPostSchema),
        defaultValues: { ...EMPTY, ...initial },
        mode: 'onBlur',
    });

    const isEdit = !!initial?.id;
    const slug = methods.watch('slug');
    const hashtags = methods.watch('hashtags');

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (methods.formState.isDirty && !pending) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [methods.formState.isDirty, pending]);

    const onSubmit = methods.handleSubmit((values) => {
        startTransition(async () => {
            const res = await savePost(values);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Сохранено' });
                if (!isEdit) router.push(`/admin/blog/${res.slug}`);
                else methods.reset(values);
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    });

    const addHashtag = (raw: string) => {
        const tag = raw.trim().replace(/^#/, '').toLowerCase();
        if (!tag) return;
        if (hashtags.includes(tag)) return;
        methods.setValue('hashtags', [...hashtags, tag], { shouldDirty: true });
        setHashtagInput('');
    };

    const removeHashtag = (tag: string) => {
        methods.setValue('hashtags', hashtags.filter((t) => t !== tag), { shouldDirty: true });
    };

    return (
        <FormProvider {...methods}>
            <Box component="form" onSubmit={onSubmit}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4">
                        {isEdit ? methods.getValues('title') || 'Без заголовка' : 'Новый пост'}
                    </Typography>
                    <Button type="submit" variant="contained" disabled={pending} size="large">
                        {pending ? 'Сохранение…' : 'Сохранить'}
                    </Button>
                </Stack>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Stack spacing={2}>
                            <TextField
                                {...methods.register('slug')}
                                label="Slug"
                                fullWidth
                                disabled={isEdit}
                                error={!!methods.formState.errors.slug}
                                helperText={methods.formState.errors.slug?.message ?? 'Латиница/цифры/дефис'}
                            />
                            <TextField
                                {...methods.register('title')}
                                label="Заголовок"
                                fullWidth
                                error={!!methods.formState.errors.title}
                                helperText={methods.formState.errors.title?.message}
                            />
                            <TextField
                                {...methods.register('subtitle')}
                                label="Подзаголовок"
                                fullWidth
                            />
                            <TextField
                                {...methods.register('author')}
                                label="Автор"
                                fullWidth
                            />

                            <Box>
                                <TextField
                                    label="Хэштеги"
                                    placeholder="Введи и Enter"
                                    fullWidth
                                    value={hashtagInput}
                                    onChange={(e) => setHashtagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            addHashtag(hashtagInput);
                                        }
                                    }}
                                />
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={1} gap={1}>
                                    {hashtags.map((t) => (
                                        <Chip
                                            key={t}
                                            label={`#${t}`}
                                            size="small"
                                            onDelete={() => removeHashtag(t)}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="overline" color="text.secondary" display="block" mb={1}>
                            Обложка
                        </Typography>
                        {slug ? (
                            <Controller
                                name="cover"
                                control={methods.control}
                                render={({ field }) => (
                                    <ImageDrop
                                        value={field.value}
                                        onChange={field.onChange}
                                        bucket="blog-images"
                                        pathPrefix={`${slug}/cover`}
                                        aspect="3 / 4"
                                    />
                                )}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Заполни slug чтобы залить обложку
                            </Typography>
                        )}
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Typography variant="overline" color="text.secondary" display="block" mb={1}>
                            Текст поста
                        </Typography>
                        {slug ? (
                            <Controller
                                name="body_html"
                                control={methods.control}
                                render={({ field }) => (
                                    <TiptapEditor
                                        value={field.value}
                                        onChange={field.onChange}
                                        slug={slug}
                                    />
                                )}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Заполни slug чтобы начать писать
                            </Typography>
                        )}
                    </Grid>
                </Grid>

                <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
                    {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
                </Snackbar>
            </Box>
        </FormProvider>
    );
}
