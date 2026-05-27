'use client';

import { Controller, useFormContext } from 'react-hook-form';
import {
    Grid, TextField, MenuItem, Switch, FormControlLabel, InputAdornment, Box,
} from '@mui/material';
import type { ProductInput } from '../../../_lib/schemas';

const TYPE_OPTIONS = [
    { value: 'tshirt',     label: 'Футболка' },
    { value: 'hoodie',     label: 'Худи' },
    { value: 'longsleeve', label: 'Лонгслив' },
    { value: 'sweatshirt', label: 'Свитшот' },
    { value: 'cap',        label: 'Кепка' },
    { value: 'shopper',    label: 'Шоппер' },
] as const;

const STOCK_OPTIONS = [
    { value: 'studio',       label: 'Студия (в наличии)' },
    { value: 'supplier',     label: 'У поставщика' },
    { value: 'in_stock',     label: 'В наличии' },
    { value: 'limited',      label: 'Ограниченно' },
    { value: 'out_of_stock', label: 'Нет в наличии' },
] as const;

export function MainTab() {
    const { register, control, formState: { errors }, getValues } = useFormContext<ProductInput>();
    const isEdit = !!getValues('id');

    return (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    {...register('slug')}
                    label="Slug"
                    fullWidth
                    disabled={isEdit}
                    error={!!errors.slug}
                    helperText={errors.slug?.message ?? 'Латиница, цифры, дефис. После создания не меняется.'}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    {...register('name')}
                    label="Название"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} select label="Тип" fullWidth>
                            {TYPE_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </TextField>
                    )}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                    {...register('category')}
                    label="Категория"
                    fullWidth
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                    name="stock"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} select label="Наличие" fullWidth>
                            {STOCK_OPTIONS.map((o) => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </TextField>
                    )}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                    {...register('price', { valueAsNumber: true })}
                    label="Цена"
                    type="number"
                    fullWidth
                    InputProps={{ endAdornment: <InputAdornment position="end">₽</InputAdornment> }}
                    error={!!errors.price}
                    helperText={errors.price?.message}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                    {...register('color')}
                    label="Цвет (название)"
                    fullWidth
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                    name="stage_color"
                    control={control}
                    render={({ field }) => (
                        <Box display="flex" alignItems="center" gap={1}>
                            <TextField
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                label="Hex-цвет"
                                placeholder="#ffffff"
                                fullWidth
                                error={!!errors.stage_color}
                                helperText={errors.stage_color?.message}
                            />
                            <Box
                                sx={{
                                    width: 40, height: 40, borderRadius: 1,
                                    border: '1px solid', borderColor: 'divider',
                                    bgcolor: field.value || 'transparent',
                                    flexShrink: 0,
                                }}
                            />
                        </Box>
                    )}
                />
            </Grid>

            <Grid size={{ xs: 12 }}>
                <TextField
                    {...register('description')}
                    label="Описание"
                    fullWidth
                    multiline
                    rows={4}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                    name="is_for_printing"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={<Switch checked={field.value} onChange={field.onChange} />}
                            label="Для печати (показывать в конструкторе)"
                        />
                    )}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                    name="is_sale"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={<Switch checked={field.value} onChange={field.onChange} />}
                            label="Распродажа"
                        />
                    )}
                />
            </Grid>
        </Grid>
    );
}
