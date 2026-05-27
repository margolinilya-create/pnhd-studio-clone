'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, Grid, TextField, Typography, InputAdornment } from '@mui/material';
import { ImageDrop } from '../../../_components/ImageDrop';
import type { ProductInput } from '../../../_lib/schemas';

const VIEWS: Array<{ field: keyof ProductInput; label: string; suffix: string }> = [
    { field: 'editor_front_view',   label: 'Перед',     suffix: 'front' },
    { field: 'editor_back_view',    label: 'Спина',     suffix: 'back' },
    { field: 'editor_lsleeve_view', label: 'Левый рукав',  suffix: 'lsleeve' },
    { field: 'editor_rsleeve_view', label: 'Правый рукав', suffix: 'rsleeve' },
];

export function ConstructorTab() {
    const { control, register } = useFormContext<ProductInput>();
    const slug = useWatch({ control, name: 'slug' });

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Картинки для 3D-мокапа в конструкторе. 4 ракурса.
            </Typography>

            {!slug && (
                <Typography color="text.secondary" mb={3}>
                    Сначала задай slug на табе «Основное».
                </Typography>
            )}

            <Grid container spacing={2} mb={4}>
                {VIEWS.map(({ field, label, suffix }) => (
                    <Grid key={field} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Controller
                            name={field as 'editor_front_view'}
                            control={control}
                            render={({ field: ctrl }) => (
                                <ImageDrop
                                    value={ctrl.value as string | null}
                                    onChange={ctrl.onChange}
                                    bucket="product-images"
                                    pathPrefix={`${slug || 'unknown'}/editor/${suffix}`}
                                    label={label}
                                    aspect="3 / 4"
                                    minHeight={180}
                                />
                            )}
                        />
                    </Grid>
                ))}
            </Grid>

            <Typography variant="h6" mb={1}>Габариты доставки</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Используется CDEK-калькулятором.
            </Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                        {...register('shipping_weight', { setValueAs: (v) => v === '' ? null : Number(v) })}
                        label="Вес"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">кг</InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                        {...register('shipping_width', { setValueAs: (v) => v === '' ? null : Number(v) })}
                        label="Ширина"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">см</InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                        {...register('shipping_length', { setValueAs: (v) => v === '' ? null : Number(v) })}
                        label="Длина"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">см</InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                        {...register('shipping_depth', { setValueAs: (v) => v === '' ? null : Number(v) })}
                        label="Толщина"
                        type="number"
                        fullWidth
                        InputProps={{ endAdornment: <InputAdornment position="end">см</InputAdornment> }}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
