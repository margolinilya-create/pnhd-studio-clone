'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Box, Tabs, Tab, Button, Stack, Snackbar, Alert, Typography,
} from '@mui/material';
import { productSchema, type ProductInput } from '../../_lib/schemas';
import { saveProduct } from './save-action';
import { MainTab }        from './tabs/MainTab';
import { SizesTab }       from './tabs/SizesTab';
import { PhotosTab }      from './tabs/PhotosTab';
import { ConstructorTab } from './tabs/ConstructorTab';
import { SeoTab }         from './tabs/SeoTab';
import { LinksTab }       from './tabs/LinksTab';

const EMPTY_DEFAULTS: ProductInput = {
    slug: '',
    name: '',
    description: null,
    type: 'tshirt',
    price: 0,
    stock: 'in_stock',
    color: null,
    stage_color: null,
    category: null,
    is_sale: false,
    is_for_printing: false,
    image_url: null,
    editor_front_view:   null,
    editor_back_view:    null,
    editor_lsleeve_view: null,
    editor_rsleeve_view: null,
    shipping_weight: null,
    shipping_width:  null,
    shipping_length: null,
    shipping_depth:  null,
    meta_title: null,
    meta_description: null,
    sizes: [],
    photos: [],
    linkedIds: [],
};

const TABS = ['Основное', 'Размеры', 'Фото', 'Конструктор', 'SEO', 'Друзья'] as const;

export function ProductForm({ initial }: { initial: Partial<ProductInput> | null }) {
    const router = useRouter();
    const [tab, setTab] = useState(0);
    const [pending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const methods = useForm<ProductInput>({
        resolver: zodResolver(productSchema),
        defaultValues: { ...EMPTY_DEFAULTS, ...initial },
        mode: 'onBlur',
    });

    const isEdit = !!initial?.id;

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
            const res = await saveProduct(values);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Сохранено' });
                if (!isEdit) router.push(`/admin/products/${res.slug}`);
                else methods.reset(values);
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    });

    return (
        <FormProvider {...methods}>
            <Box component="form" onSubmit={onSubmit}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h4">
                        {isEdit ? methods.getValues('name') || 'Без названия' : 'Новый товар'}
                    </Typography>
                    <Button type="submit" variant="contained" disabled={pending} size="large">
                        {pending ? 'Сохранение…' : 'Сохранить'}
                    </Button>
                </Stack>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    {TABS.map((label) => <Tab key={label} label={label} />)}
                </Tabs>

                <Box hidden={tab !== 0}><MainTab /></Box>
                <Box hidden={tab !== 1}><SizesTab /></Box>
                <Box hidden={tab !== 2}><PhotosTab /></Box>
                <Box hidden={tab !== 3}><ConstructorTab /></Box>
                <Box hidden={tab !== 4}><SeoTab /></Box>
                <Box hidden={tab !== 5}><LinksTab /></Box>

                <Snackbar
                    open={!!toast}
                    autoHideDuration={4000}
                    onClose={() => setToast(null)}
                >
                    {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
                </Snackbar>
            </Box>
        </FormProvider>
    );
}
