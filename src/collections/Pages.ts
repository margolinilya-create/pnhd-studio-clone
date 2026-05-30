import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'pageType', '_status', 'publishedAt'],
    livePreview: {
      url: ({ data }) => {
        const slug = (data as { slug?: string; pageType?: string }).slug ?? '';
        const pageType = (data as { pageType?: string }).pageType ?? 'landing';
        const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pnhd-studio-clone.vercel.app';
        const path = pageType === 'blog' ? `/blog/${slug}` : `/${slug}`;
        return `${base}${path}?preview=true`;
      },
      breakpoints: [
        { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
        { name: 'tablet', label: 'Tablet', width: 768, height: 1024 },
        { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
      ],
    },
  },
  versions: {
    drafts: {
      autosave: { interval: 800 },
      schedulePublish: true,
    },
    maxPerDoc: 20,
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true;
      return { _status: { equals: 'published' } };
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
  ],
};
