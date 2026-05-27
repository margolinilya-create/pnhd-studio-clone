'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Grid, Typography } from '@mui/material';
import { ImageDrop } from '../../../_components/ImageDrop';
import { PhotoGrid, type GridPhoto } from '../../../_components/PhotoGrid';
import type { ProductInput } from '../../../_lib/schemas';

export function PhotosTab() {
    const { control } = useFormContext<ProductInput>();
    const slug = useWatch({ control, name: 'slug' });

    if (!slug) {
        return (
            <Typography color="text.secondary">
                Сначала задай slug на табе «Основное» — он используется в пути файлов.
            </Typography>
        );
    }

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="h6" mb={1}>Главное фото</Typography>
                <Controller
                    name="image_url"
                    control={control}
                    render={({ field }) => (
                        <ImageDrop
                            value={field.value}
                            onChange={field.onChange}
                            bucket="product-images"
                            pathPrefix={`${slug}/main`}
                            aspect="3 / 4"
                        />
                    )}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="h6" mb={1}>Галерея</Typography>
                <Controller
                    name="photos"
                    control={control}
                    render={({ field }) => (
                        <PhotoGrid
                            value={field.value as GridPhoto[]}
                            onChange={field.onChange}
                            bucket="product-images"
                            pathPrefix={`${slug}/gallery`}
                        />
                    )}
                />
            </Grid>
        </Grid>
    );
}
