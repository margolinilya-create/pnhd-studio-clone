'use client';

import { useFormContext } from 'react-hook-form';
import { Grid, TextField, Typography, Box } from '@mui/material';
import type { ProductInput } from '../../../_lib/schemas';

export function SeoTab() {
    const { register, formState: { errors }, watch } = useFormContext<ProductInput>();
    const title = watch('meta_title') ?? '';
    const desc = watch('meta_description') ?? '';

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Метатеги для поисковиков и социальных сетей. Пусто = используется name/description.
            </Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        {...register('meta_title')}
                        label="Meta title"
                        fullWidth
                        helperText={`${title.length} / 70`}
                        error={!!errors.meta_title}
                    />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TextField
                        {...register('meta_description')}
                        label="Meta description"
                        fullWidth
                        multiline
                        rows={3}
                        helperText={`${desc.length} / 170`}
                        error={!!errors.meta_description}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
