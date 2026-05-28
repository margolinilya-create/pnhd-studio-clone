import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'pageType', 'status', 'publishedAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true;
      return { status: { equals: 'published' } };
    },
    create: hasRole('admin', 'marketing'),
    update: hasRole('admin', 'marketing'),
    delete: hasRole('admin'),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'pageType',
      type: 'select',
      required: true,
      defaultValue: 'blog',
      options: [
        { label: 'Блог', value: 'blog' },
        { label: 'Лендинг', value: 'landing' },
      ],
    },
    {
      name: 'subtitle',
      type: 'text',
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'PNHD STUDIO',
    },
    {
      name: 'hashtags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'body',
      type: 'richText',
      label: 'Содержимое (Lexical, для новых постов)',
    },
    {
      name: 'bodyHtml',
      type: 'textarea',
      label: 'HTML-содержимое (legacy, для миграции из старого блога)',
      admin: {
        description:
          'Сохраняется как есть и рендерится через dangerouslySetInnerHTML. Используется только если body пустой.',
      },
    },
    {
      name: 'likes',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'legacyPostId',
      type: 'number',
      label: 'Legacy post_id (для совместимости с UI)',
      admin: {
        description: 'Заполняется ETL-скриптом. Для новых постов — null.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Черновик', value: 'draft' },
        { label: 'Опубликован', value: 'published' },
      ],
    },
  ],
};
