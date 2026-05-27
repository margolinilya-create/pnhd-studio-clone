import { z } from 'zod';

export const blogPostSchema = z.object({
    id: z.string().uuid().optional(),
    slug: z.string()
        .min(1, 'Slug обязателен')
        .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    title: z.string().min(1, 'Заголовок обязателен'),
    subtitle: z.string().nullable().default(null),
    cover: z.string().url().nullable().default(null),
    author: z.string().default('PNHD STUDIO'),
    hashtags: z.array(z.string()).default([]),
    body_html: z.string().default(''),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;
