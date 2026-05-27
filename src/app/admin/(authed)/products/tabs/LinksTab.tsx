'use client';

import { useEffect, useState, useTransition } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import {
    Box, Autocomplete, TextField, Chip, Avatar, Typography,
} from '@mui/material';
import { searchProducts, type ProductOption } from '../link-search-action';
import type { ProductInput } from '../../../_lib/schemas';

export function LinksTab() {
    const { control, getValues } = useFormContext<ProductInput>();
    const currentId = getValues('id');
    const [options, setOptions] = useState<ProductOption[]>([]);
    const [selected, setSelected] = useState<ProductOption[]>([]);
    const [pending, startTransition] = useTransition();
    const [query, setQuery] = useState('');

    useEffect(() => {
        const linked = getValues('linkedIds') || [];
        if (linked.length === 0) return;
        startTransition(async () => {
            const res = await searchProducts({ ids: linked, excludeId: currentId });
            setSelected(res);
        });
    }, [getValues, currentId]);

    useEffect(() => {
        if (query.length < 2) {
            setOptions([]);
            return;
        }
        const t = setTimeout(() => {
            startTransition(async () => {
                const res = await searchProducts({ query, excludeId: currentId });
                setOptions(res);
            });
        }, 250);
        return () => clearTimeout(t);
    }, [query, currentId]);

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Связанные товары («с этим товаром покупают»). Можно выбрать несколько.
            </Typography>
            <Controller
                name="linkedIds"
                control={control}
                render={({ field }) => (
                    <Autocomplete<ProductOption, true>
                        multiple
                        value={selected}
                        options={options}
                        loading={pending}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onChange={(_, newVal) => {
                            setSelected(newVal);
                            field.onChange(newVal.map((o) => o.id));
                        }}
                        onInputChange={(_, v) => setQuery(v)}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                                const { key, ...chipProps } = getTagProps({ index });
                                return (
                                    <Chip
                                        key={key}
                                        {...chipProps}
                                        avatar={option.image_url ? <Avatar src={option.image_url} /> : undefined}
                                        label={option.name}
                                    />
                                );
                            })
                        }
                        renderInput={(params) => (
                            <TextField {...params} label="Найди товар" placeholder="Начни вводить название" />
                        )}
                    />
                )}
            />
        </Box>
    );
}
