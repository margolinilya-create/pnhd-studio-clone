import { z } from 'zod';

export const PRODUCT_TYPES = ['tshirt', 'hoodie', 'longsleeve', 'sweatshirt', 'cap', 'shopper'] as const;
export const PRODUCT_STOCK = ['in_stock', 'limited', 'out_of_stock'] as const;

export const sizeSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, 'Название размера обязательно').max(20),
    qty: z.number().int().min(0, 'Количество не может быть отрицательным'),
    sort_order: z.number().int().min(0),
});

export const photoSchema = z.object({
    id: z.string().uuid().optional(),
    url: z.string().url('Невалидный URL'),
    sort_order: z.number().int().min(0),
});

export const productSchema = z.object({
    id: z.string().uuid().optional(),
    slug: z.string()
        .min(1, 'Slug обязателен')
        .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    name: z.string().min(1, 'Название обязательно'),
    description: z.string().nullable().default(null),
    type: z.enum(PRODUCT_TYPES),
    price: z.number().positive('Цена должна быть положительной'),
    stock: z.enum(PRODUCT_STOCK).default('in_stock'),
    color: z.string().nullable().default(null),
    stage_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex-цвет в формате #ffffff').nullable().default(null),
    category: z.string().nullable().default(null),
    is_sale: z.boolean().default(false),
    is_for_printing: z.boolean().default(false),
    image_url: z.string().url().nullable().default(null),
    editor_front_view:   z.string().url().nullable().default(null),
    editor_back_view:    z.string().url().nullable().default(null),
    editor_lsleeve_view: z.string().url().nullable().default(null),
    editor_rsleeve_view: z.string().url().nullable().default(null),
    shipping_weight: z.number().nonnegative().nullable().default(null),
    shipping_width:  z.number().nonnegative().nullable().default(null),
    shipping_length: z.number().nonnegative().nullable().default(null),
    shipping_depth:  z.number().nonnegative().nullable().default(null),
    meta_title:       z.string().max(70).nullable().default(null),
    meta_description: z.string().max(170).nullable().default(null),

    sizes:     z.array(sizeSchema).default([]),
    photos:    z.array(photoSchema).default([]),
    linkedIds: z.array(z.string().uuid()).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
export type SizeInput   = z.infer<typeof sizeSchema>;
export type PhotoInput  = z.infer<typeof photoSchema>;
